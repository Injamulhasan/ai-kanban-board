import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./db/prisma.js";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import eventEmitter from "./services/eventEmitter.js";

let io = null;

/** Map of boardId → Set of { id, name, email, avatar_url } */
const presenceMap = new Map();

export function getIO() {
  return io;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Setup Redis Adapter if REDIS_URL is configured
  if (process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => console.error("Redis PubClient Error:", err));
    subClient.on("error", (err) => console.error("Redis SubClient Error:", err));

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log("📡 Socket.IO Redis Adapter initialized successfully.");
      })
      .catch((err) => {
        console.error("❌ Failed to connect to Redis. Falling back to default in-memory adapter.", err);
      });
  } else {
    console.log("ℹ️ No REDIS_URL configured. Using default in-memory adapter.");
  }

  // Authenticate every socket connection via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.id, name: payload.name, email: payload.email };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Socket connected: ${socket.user.name} (${socket.user.id})`);

    // Automatically join the rooms of all boards this user is a member of
    // so they receive live notifications across all their boards!
    prisma.boardMember.findMany({
      where: { userId: socket.user.id },
      select: { boardId: true }
    }).then((memberships) => {
      memberships.forEach(m => {
        socket.join(`board:${m.boardId}`);
      });
    }).catch(err => {
      console.error(`Error auto-joining socket rooms for user ${socket.user.id}:`, err);
    });

    // Join a board room
    socket.on("board:join", (boardId) => {
      socket.join(`board:${boardId}`);
      socket.boardId = boardId;

      // Add to presence
      if (!presenceMap.has(boardId)) presenceMap.set(boardId, new Map());
      const boardPresence = presenceMap.get(boardId);
      boardPresence.set(socket.user.id, {
        id: socket.user.id,
        name: socket.user.name,
        email: socket.user.email,
        avatar_url: null,
      });

      // Send current presence to the joining user
      socket.emit("presence:sync", { users: [...boardPresence.values()] });

      // Notify others that a user joined
      socket.to(`board:${boardId}`).emit("presence:join", {
        user: boardPresence.get(socket.user.id),
      });
    });

    // Leave a board room
    socket.on("board:leave", (boardId) => {
      socket.leave(`board:${boardId}`);
      removeFromPresence(socket, boardId);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`⚡ Socket disconnected: ${socket.user.name}`);
      if (socket.boardId) {
        removeFromPresence(socket, socket.boardId);
      }
    });
  });

  // Central event listener to broadcast events across rooms
  eventEmitter.on("emit:socket", ({ room, event, data }) => {
    if (io) {
      io.to(room).emit(event, data);
    }
  });

  return io;
}

function removeFromPresence(socket, boardId) {
  const boardPresence = presenceMap.get(boardId);
  if (!boardPresence) return;

  // Only remove if no other sockets from same user are in this board
  const room = io.sockets.adapter.rooms.get(`board:${boardId}`);
  if (room) {
    for (const socketId of room) {
      const s = io.sockets.sockets.get(socketId);
      if (s && s.user.id === socket.user.id && s.id !== socket.id) {
        return; // User still has another active socket in this room
      }
    }
  }

  boardPresence.delete(socket.user.id);
  if (boardPresence.size === 0) {
    presenceMap.delete(boardId);
  }

  socket.to(`board:${boardId}`).emit("presence:leave", {
    user: { id: socket.user.id },
  });
}
