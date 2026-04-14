const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { PORT, STATIC_DIR } = require("./config");
const { SmartClassroomSystem } = require("./classroomSystem");

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
  const system = new SmartClassroomSystem();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(STATIC_DIR));

  await system.init();

  app.get("/api/status", (req, res) => {
    res.json(system.getSnapshot());
  });

  app.get("/api/logs", (req, res) => {
    res.json(system.getLogs());
  });

  app.post("/api/mode", (req, res) => {
    const requestedMode = String(req.body.mode || "AUTO").toUpperCase();
    if (!["AUTO", "MANUAL"].includes(requestedMode)) {
      return res.status(400).json({ error: "Mode must be AUTO or MANUAL" });
    }

    system.setMode(requestedMode);
    return res.json(system.getSnapshot());
  });

  app.post("/api/manual-control", (req, res) => {
    const command = system.applyManualCommand(req.body || {});
    return res.json({
      actuators: command,
      mode: "MANUAL",
    });
  });

  app.post("/api/run-cycle", async (req, res) => {
    const snapshot = await system.runCycle();
    res.json(snapshot);
  });

  app.get("/", (req, res) => {
    res.sendFile(path.join(STATIC_DIR, "home.html"));
  });

  app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(STATIC_DIR, "dashboard.html"));
  });

  app.get("/login", (req, res) => {
    res.sendFile(path.join(STATIC_DIR, "login.html"));
  });

  app.get("/contact", (req, res) => {
    res.sendFile(path.join(STATIC_DIR, "contact.html"));
  });

  const server = http.createServer(app);
  const activePort = await listenWithFallback(server, PORT);
  console.log(`Smart classroom server running on http://localhost:${activePort}`);
}

startServer().catch((error) => {
  console.error("Unable to start smart classroom server:", error);
  process.exit(1);
});
