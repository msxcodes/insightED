import { Server } from "socket.io";
import { createAdapter } from "@socket.io/cluster-adapter";
import { setupWorker } from "@socket.io/sticky";

let io;

const initWebSocket = (server, isWorker = false) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
    adapter: createAdapter(),
  });

  if (isWorker) {
    setupWorker(io);
  }

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const sendWebSocketUpdate = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export { initWebSocket, sendWebSocketUpdate };
