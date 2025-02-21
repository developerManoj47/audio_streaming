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
let isPlaying = false;
let ffmpegProcess = null;
let buffer = [];
let clients = [];

const notifyClients = (connectedClients) => {
  // Notify all clients that the stream has ended
  for (let i = 0; i < connectedClients.length; i++) {
    connectedClients[i].end();
  }
  clients = [];
};

// Start the stream
function startStream() {
  if (isPlaying) return;

  const audioFilePath = path.join(ASSETS_PATH, "audio.mp3");
  isPlaying = true;
  ffmpegProcess = spawn("ffmpeg", [
    "-re",
    "-loglevel",
    "fatal",
    "-i",
    audioFilePath,
    "-f",
    "mp3",
    "-b:a",
    "128k",
    // "-vn",
    "pipe:1",
  ]);

  console.log("Audio stream started.....");

  ffmpegProcess.stdout.on("data", (data) => {
    buffer.push(data);
    if (buffer.length > 10) {
      buffer.shift();
    }
    clients.forEach((res) => {
      res.write(data);
    });
  });

  ffmpegProcess.on("exit", (code, signal) => {
    if (code === 0) {
      console.log("FFmpeg finished successfully");
      isPlaying = false;
      ffmpegProcess = null;

      // Notify all clients
      notifyClients(clients);
      buffer = [];
      // clients = [];
      console.log("Audio stream stopped.");
    } else {
      console.log(`FFmpeg exited with code ${code} or signal ${signal}`);
      isPlaying = false;
      ffmpegProcess = null;

      // Notify all clients
      notifyClients(clients);

      buffer = [];
      // clients = [];
      console.log("Audio stream stopped.");
    }
  });

  // Add error handling for FFmpeg process
  ffmpegProcess.on("error", (err) => {
    console.error("FFmpeg process error:", err);
    isPlaying = false;
    ffmpegProcess = null;

    // Notify all clients that the stream has ended
    clients.forEach((res) => {
      res.end(); // Close the response
    });

    // Clear the buffer and clients list
    buffer = [];
    clients = [];
    console.log("Audio stream stopped due to error.");
  });
}

// Function to stop the stream
function stopStream() {
  if (!isPlaying || !ffmpegProcess) return;
  isPlaying = false;

  ffmpegProcess.kill();
  ffmpegProcess = null;
  buffer = [];
  // clients = [];
}

// startStream();

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// using ffmpeg when audio file formate is mp3 so we need to decode
app.get("/stream", (req, res) => {
  if (!isPlaying || !ffmpegProcess) {
    return res.status(503).json({ error: "Stream is not active" });
  }
  res.set({
    "Content-Type": "audio/mpeg",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // send buffered data first
  buffer.forEach((chunk) => {
    res.write(chunk);
  });

  // add client to the list
  clients.push(res);

  // ffmpegProcess.stdout.pipe(res);

  ffmpegProcess.stderr.on("data", (data) => {
    console.log(`FFmpeg error : ${data}`);
  });

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
  });
});

app.get("/start", (req, res) => {
  startStream();
  res.send("Audio stream started.");
});

app.get("/stop", (req, res) => {
  stopStream();
  res.send("Audio stream stopped.");
});

// run the app on port 3000
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
