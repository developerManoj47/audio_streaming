// import statements
const express = require("express");
const cors = require("cors");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

// define statSync & createReadStream
const statSync = fs.statSync;
const createReadStream = fs.createReadStream;

const app = express(); // use express for the server
const PORT = 5000; // port that server will run at

app.use(cors()); // allow requests from other origins

const ASSETS_PATH = path.join(__dirname, "assets"); // path to the assets

// API endpoint to stream audio from server to a BROWSER
// app.get("/audio", (req, res) => {
//   const filePath = path.join(ASSETS_PATH, "audio.mp3"); // path to audio file
//   const CHUNK_SIZE = 500 * 1e3; //  0.5MB chunk size

//   // send audio in chunks
//   const range = req.headers.range || "0";
//   const audioSize = statSync(filePath).size; // get audio size

//   // define start and end of current chunk
//   const start = Number(range.replace(/\D/g, ""));
//   const end = Math.min(start + CHUNK_SIZE, audioSize - 1);
//   const contentLength = end - start + 1;

//   // set headers for transfer to client
//   const headers = {
//     "Content-Range": `bytes ${start}-${end}/${audioSize}`,
//     "Accept-Ranges": "bytes",
//     "Content-Length": contentLength,
//     "Content-Type": "audio/mpeg",
//     "Transfer-Encoding": "chunked",
//   };

//   res.writeHead(206, headers);

//   // create audio stream
//   const stream = createReadStream(filePath, { start, end });
//   stream.pipe(res);
// });

// using ffmpeg when audio file formate is mp3 so we need to decode
app.get("/audio", (req, res) => {
  const filePath = path.join(ASSETS_PATH, "audio.mp3"); // Path to your audio file

  res.set({
    "Content-Type": "audio/wav",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache",
  });

  const ffmpeg = spawn("ffmpeg", [
    "-loglevel",
    "fatal",
    "-i",
    filePath,
    "-f",
    "wav",
    "-ac",
    "2",
    "-ar",
    "44100",
    "pipe:1",
  ]);

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on("data", (data) => {
    console.log(`FFmpeg error : ${data}`);
  });

  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
  });

  // const stream = createReadStream(filePath);
  // stream.pipe(res);
});

// audio stream when there is wav audio file that is  uncompressed
// app.get("/audio", (req, res) => {
//   const filePath = path.join(ASSETS_PATH, "audio.wav"); // Use a WAV file
//   const audioSize = statSync(filePath).size;

//   // Set streaming headers
//   res.writeHead(200, {
//     "Content-Type": "audio/wav",
//     "Content-Length": audioSize,
//     "Transfer-Encoding": "chunked",
//   });

//   // Stream the raw WAV file
//   const stream = createReadStream(filePath);
//   stream.pipe(res);
// });

// API endpoint to stream video from
app.get("/video", (req, res) => {
  const filePath = path.join(ASSETS_PATH, "video.mp4"); // path to video file
  const CHUNK_SIZE = 4000 * 1e3; //  4MB chunk size

  // send video in chunks
  const range = req.headers.range || "0";
  const videoSize = statSync(filePath).size; // get video size

  // define start and end of current chunk
  const start = Number(range.replace(/\D/g, ""));
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
  const contentLength = end - start + 1;

  // set headers for transfer to client
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
    "Transfer-Encoding": "chunked",
  };

  res.writeHead(206, headers);

  // create audio stream
  const stream = createReadStream(filePath, { start, end });
  stream.pipe(res);
});

// run the app on port 3000
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
