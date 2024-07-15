const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const ProgressBar = require("progress");

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));

// Verificar y crear la carpeta 'temp' si no existe
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const downloadVideo = (videoURL, videoPath, audioPath) => {
  return new Promise((resolve, reject) => {
    const outputPath = "video.mp4";

    ytdl.getInfo(videoURL, (err, info) => {
      if (err) throw err;

      // Tamaño total del video en bytes
      const totalSize = info.formats[0].contentLength;
      let dataDownloaded = 0;

      // Crear una barra de progreso
      const bar = new ProgressBar("Descargando [:bar] :percent :etas", {
        width: 40,
        total: parseInt(totalSize, 10),
      });

      const video = ytdl(videoURL)
        .on("response", (res) => {
          res.on("data", (chunk) => {
            dataDownloaded += chunk.length;
            bar.tick(chunk.length);
          });
        })
        .pipe(fs.createWriteStream(outputPath))
        .on("finish", () => {
          console.log("Descarga completada.");
        })
        .on("error", (err) => {
          console.error("Error al descargar el video:", err);
        });
    });
    // console.log("Descargando video...");
    // const rest = ytdl(videoURL).pipe(
    //   fs.createWriteStream(" video.mp4 ")
    // );
    // console.log(rest)
    // //console.log(videoStream);
    // console.log(videoURL,videoPath)
    // videoStream.on("finish", () => {
    //   console.log("Video descargado");
    //   const audioStream = ytdl(videoURL, { quality: "highestaudio" }).pipe(
    //     fs.createWriteStream(audioPath)
    //   );

    //   audioStream.on("finish", () => {
    //     console.log("Audio descargado");
    //     resolve();
    //   });

    //   audioStream.on("error", (err) => {
    //     console.error("Error en la descarga del audio:", err);
    //     reject(err);
    //   });
    // });

    // videoStream.on("error", (err) => {
    //   console.error("Error en la descarga del video:", err);
    //   reject(err);
    // });
  });
};

app.get("/download", async (req, res) => {
  try {
    const videoURL = req.query.url;
    console.log("URL recibida:", videoURL);

    if (!ytdl.validateURL(videoURL)) {
      console.error("URL inválida:", videoURL);
      return res.status(400).send("URL inválida");
    }

    const videoID = uuidv4();
    const videoPath = path.join(tempDir, `${videoID}-video.mp4`);
    const audioPath = path.join(tempDir, `${videoID}-audio.mp4`);
    const outputPath = path.join(tempDir, `${videoID}-output.mp4`);

    await downloadVideo(videoURL, videoPath, audioPath);

    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .format("mp4")
      .on("start", (cmd) => {
        console.log(`Started ffmpeg with command: ${cmd}`);
      })
      .on("error", (err) => {
        console.error("Error en ffmpeg:", err);
        res.sendStatus(500);
      })
      .on("end", () => {
        console.log("Transcoding completed successfully");
        res.header("Content-Disposition", 'attachment; filename="video.mp4"');
        res.sendFile(outputPath, (err) => {
          if (err) {
            console.error("Error al enviar el archivo:", err);
            res.sendStatus(500);
          } else {
            console.log("Archivo enviado");
            // Eliminar archivos temporales después de enviarlos
            fs.unlink(videoPath, () => {});
            fs.unlink(audioPath, () => {});
            fs.unlink(outputPath, () => {});
          }
        });
      })
      .save(outputPath);
  } catch (error) {
    console.error("Error en el servidor:", error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
