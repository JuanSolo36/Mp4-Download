const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { exec } = require("child_process");
const ytdl = require("ytdl-core");

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));

// Servir archivos estáticos del directorio temp
app.use("/temp", express.static(path.join(__dirname, "../temp")));

// Verificar y crear la carpeta 'temp' si no existe
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) {
  try {
    fs.mkdirSync(tempDir);
  } catch (err) {
    console.error("No se pudo crear el directorio 'temp':", err);
    process.exit(1); // Salir si no se puede crear el directorio
  }
}

// Verificar permisos de escritura
fs.access(tempDir, fs.constants.W_OK, (err) => {
  if (err) {
    console.error(
      `No hay permisos de escritura para el directorio 'temp': ${err}`
    );
    process.exit(1); // Salir si no hay permisos de escritura
  } else {
    console.log("Permisos de escritura verificados para el directorio 'temp'.");
  }
});

// Ruta para obtener información del video
app.get("/info", async (req, res) => {
  try {
    const videoURL = req.query.url;
    console.log("URL recibida:", videoURL);

    const info = await ytdl.getInfo(videoURL);
    const title = info.videoDetails.title || "No disponible";
    const lengthSeconds = info.videoDetails.lengthSeconds;
    const duration = lengthSeconds
      ? new Date(lengthSeconds * 1000).toISOString().substr(11, 8)
      : "Desconocida"; // Formato HH:MM:SS

    const thumbnailUrl =
      info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url;

    // Obtener formatos y tamaños de archivo
    const formats = ytdl.filterFormats(info.formats, "videoandaudio");
    const formatDetails = formats.map((format) => ({
      quality: format.qualityLabel,
      fileSize: format.contentLength
        ? (format.contentLength / (1024 * 1024)).toFixed(2) + " MB"
        : "Desconocido",
    }));

    console.log("Información del video obtenida:");
    console.log(`Título: ${title}`);
    console.log(`Duración en segundos: ${lengthSeconds}`);
    console.log(`Duración: ${duration}`);
    console.log(`Thumbnail URL: ${thumbnailUrl}`);
    console.log(`Formatos: ${JSON.stringify(formatDetails)}`);

    res.json({
      thumbnailUrl: thumbnailUrl,
      title: title,
      duration: duration,
      formats: formatDetails,
    });
  } catch (error) {
    console.error("Error en el servidor:", error);
    res.sendStatus(500);
  }
});

// Ruta para descargar el video
app.get("/download", async (req, res) => {
  try {
    const videoURL = req.query.url;
    const resolution = req.query.resolution;
    console.log(`URL recibida: ${videoURL}, Resolución: ${resolution}`);

    const videoID = uuidv4();
    const videoPath = path.join(tempDir, `${videoID}-${resolution}.mp4`);

    // Ajusta la resolución según las opciones disponibles en YouTube
    let format;
    switch (resolution) {
      case "1080p":
        format = "bestvideo[height<=1080]+bestaudio/best";
        break;
      case "720p":
        format = "bestvideo[height<=720]+bestaudio/best";
        break;
      case "480p":
        format = "bestvideo[height<=480]+bestaudio/best";
        break;
      case "360p":
        format = "bestvideo[height<=360]+bestaudio/best";
        break;
      case "240p":
        format = "bestvideo[height<=240]+bestaudio/best";
        break;
      default:
        format = "best";
        break;
    }

    const command = `yt-dlp -f "${format}" -o "${videoPath}" "${videoURL}"`;

    console.log(`Ejecutando comando: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al descargar el video: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({ error: error.message });
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      console.log("Descarga del video completada.");

      res.download(videoPath, `video_${resolution}.mp4`, (err) => {
        if (err) {
          console.error("Error al enviar el archivo descargado:", err);
        }
        // Elimina el archivo después de enviarlo
        fs.unlink(videoPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error(
              "Error al eliminar el archivo descargado:",
              unlinkErr
            );
          } else {
            console.log("Archivo descargado eliminado");
          }
        });
      });
    });
  } catch (error) {
    console.error("Error en el servidor:", error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
