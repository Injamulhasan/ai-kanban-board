import express from "express";
import cors from "cors";
import { createServer } from "node:http";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import boardRoutes from "./routes/boards.js";
import errorHandler from "./middleware/errorHandler.js";
import { initSocket } from "./socket.js";

const app = express();

// --------------- Middleware ---------------
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:80",
  "http://127.0.0.1:80"
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) || 
      origin.startsWith("http://localhost:") || 
      origin.startsWith("http://127.0.0.1:")
    ) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// --------------- Routes ---------------
app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "kanboard" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/boards", boardRoutes);

// --------------- Error handler ---------------
app.use(errorHandler);

// --------------- Start ---------------
const PORT = process.env.PORT || 5050;
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Kanboard server running on http://localhost:${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Socket: ws://localhost:${PORT}\n`);
});
