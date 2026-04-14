const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { PORT, STATIC_DIR } = require("./config");

function listenWithFallback(server, preferredPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    let activePort = preferredPort;

    const tryListen = () => {
      server.once("error", (error) => {
        if (error.code === "EADDRINUSE" && attempts < maxAttempts) {
          attempts += 1;
          activePort += 1;
          console.warn(
            `Port ${activePort - 1} is already in use. Retrying on ${activePort}...`,
          );
          setImmediate(tryListen);
          return;
        }

        reject(error);
      });

      server.once("listening", () => {
        resolve(activePort);
      });

      server.listen(activePort);
    };

    tryListen();
  });
}

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.static(STATIC_DIR));

  app.get("/", (req, res) => {
    res.sendFile(path.join(STATIC_DIR, "home.html"));
  });

  const server = http.createServer(app);
  const activePort = await listenWithFallback(server, PORT);
  console.log(`Smart classroom static server running on http://localhost:${activePort}`);
}

startServer().catch((error) => {
  console.error("Unable to start server:", error);
  process.exit(1);
});
