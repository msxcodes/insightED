import { Server } from "socket.io";
import { createAdapter } from "@socket.io/cluster-adapter";
import { setupWorker } from "@socket.io/sticky";
import rateLimit from "express-rate-limit";

let io;
const clients = new WeakMap();

const initWebSocket = (server, isWorker = false) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGINS || "*",
      methods: ["GET", "POST"],
    },
    adapter: createAdapter(),
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  if (isWorker) {
    setupWorker(io);
  }

  io.on("connection", (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on("register", (clientId) => {
      if (!clientId) {
        return socket.emit("error", "Client ID required");
      }
      clients.set(clientId, socket.id);
      console.log(`Client registered: ${clientId} -> ${socket.id}`);
    });

    socket.on("disconnect", () => {
      for (const [clientId, socketId] of clients.entries()) {
        if (socketId === socket.id) {
          clients.delete(clientId);
          console.log(`Client disconnected: ${clientId}`);
        }
      }
    });

    socket.on("error", (err) => {
      console.error(`Socket error: ${err.message}`);
    });
  });

  return io;
};

const sendWebSocketUpdate = (clientIdOrEvent, eventOrData, data = null) => {
  if (!io) {
    console.error("WebSocket not initialized");
    return;
  }

  if (data !== null) {
    const socketId = clients.get(clientIdOrEvent);
    if (socketId) {
      io.to(socketId).emit(eventOrData, data);
      console.log(`Message sent to client ${clientIdOrEvent}: ${eventOrData}`);
    } else {
      console.warn(`Client ${clientIdOrEvent} not found`);
    }
  } else {
    io.emit(clientIdOrEvent, eventOrData);
    console.log(`Broadcast message: ${clientIdOrEvent}`);
  }
};

export { initWebSocket, sendWebSocketUpdate };
