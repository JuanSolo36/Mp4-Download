// test_ytdl.js
const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");

const videoURL =
  "https://www.youtube.com/watch?v=d9RYWM7dANo&list=RDd9RYWM7dANo&start_radio=1";

// Paths para los archivos temporales
const videoPath = "video.mp4";
const audioPath = "audio.mp4";
const outputPath = "output.mp4";

// Descargar video
const videoStream = ytdl(videoURL, { quality: "highestvideo" });
const videoWriteStream = fs.createWriteStream(videoPath);

videoStream.pipe(videoWriteStream);

videoWriteStream.on("finish", () => {
  console.log("Video descargado");
  checkDownloads();
});

videoWriteStream.on("error", (err) => {
  console.error("Error al descargar el video:", err);
});

// Descargar audio
const audioStream = ytdl(videoURL, { quality: "highestaudio" });
const audioWriteStream = fs.createWriteStream(audioPath);

audioStream.pipe(audioWriteStream);

audioWriteStream.on("finish", () => {
  console.log("Audio descargado");
  checkDownloads();
});

audioWriteStream.on("error", (err) => {
  console.error("Error al descargar el audio:", err);
});

// Función para combinar video y audio
function combineVideoAndAudio() {
  ffmpeg()
    .addInput(videoPath)
    .addInput(audioPath)
    .videoCodec("libx264")
    .audioCodec("aac")
    .format("mp4")
    .on("start", (cmd) => {
      console.log(`Started ffmpeg with command: ${cmd}`);
    })
    .on("error", (err) => {
      console.error("Error en ffmpeg:", err);
    })
    .on("end", () => {
      console.log("Transcoding completed successfully");
      // Eliminar archivos temporales
      fs.unlinkSync(videoPath);
      fs.unlinkSync(audioPath);
    })
    .save(outputPath);
}

// Función para verificar si ambos archivos han sido descargados
function checkDownloads() {
  if (fs.existsSync(videoPath) && fs.existsSync(audioPath)) {
    combineVideoAndAudio();
  }
}
