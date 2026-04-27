const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
const {
  PORT,
  STATIC_DIR,
  MONGODB_URI,
} = require("./config");

const AUTH_DB_NAME = "smart_classroom";
const AUTH_COLLECTION_NAME = "users";

let usersCollection = null;

async function createUsersCollection() {
  if (!MONGODB_URI) {
    console.warn("MONGODB_URI is not set. Auth routes will stay unavailable.");
    return null;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(AUTH_DB_NAME);
  const collection = db.collection(AUTH_COLLECTION_NAME);
  await collection.createIndex({ email: 1 }, { unique: true });
  console.log("MongoDB connected for auth storage.");
  return collection;
}

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}

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
  usersCollection = await createUsersCollection();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(STATIC_DIR));

  app.get("/", (req, res) => {
    res.sendFile(path.join(STATIC_DIR, "home.html"));
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      if (!usersCollection) {
        return res.status(503).json({ message: "Database connection is not configured yet." });
      }

      const name = String(req.body?.name || "").trim();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required." });
      }

      if (!email.includes("@")) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await usersCollection.insertOne({
        name,
        email,
        passwordHash,
        createdAt: new Date(),
      });

      const createdUser = await usersCollection.findOne({ _id: result.insertedId });
      return res.status(201).json({
        message: "Account created successfully.",
        user: sanitizeUser(createdUser),
      });
    } catch (error) {
      console.error("Signup failed:", error);
      return res.status(500).json({ message: "Unable to create the account right now." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      if (!usersCollection) {
        return res.status(503).json({ message: "Database connection is not configured yet." });
      }

      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      return res.json({
        message: "Login successful.",
        user: sanitizeUser(user),
      });
    } catch (error) {
      console.error("Login failed:", error);
      return res.status(500).json({ message: "Unable to log in right now." });
    }
  });

  const server = http.createServer(app);
  const activePort = await listenWithFallback(server, PORT);
  console.log(`Smart classroom static server running on http://localhost:${activePort}`);
}

startServer().catch((error) => {
  console.error("Unable to start server:", error);
  process.exit(1);
});
