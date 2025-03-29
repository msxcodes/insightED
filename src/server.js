import cluster from "node:cluster";
import { cpus } from "node:os";
import http from "http";
import app from "./app.js";
import { Server } from "socket.io"; // Add this import
import { setupMaster, setupWorker } from "@socket.io/sticky";
import { createAdapter } from "@socket.io/cluster-adapter";
import "dotenv/config";

const PORT = parseInt(process.env.PORT, 10) || 5000;
const isProduction = process.env.NODE_ENV === "production";
const numWorkers = isProduction ? cpus().length : 1;

if (cluster.isPrimary) {
  console.log(`\n🚀 Primary process ${process.pid} started\n`);

  // Create a server for the primary process
  const httpServer = http.createServer();

  // Set up sticky session handler
  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection",
  });

  // Listen on the specified port
  httpServer.listen(PORT, () => {
    console.log(`\n🔌 Primary process listening on port ${PORT}\n`);
  });

  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `\n💀 Worker ${worker.process.pid} died | Code: ${code} | Signal: ${signal}\n`
    );
    if (isProduction) {
      console.log("♻️  Starting new worker...");
      cluster.fork();
    }
  });

  const handleShutdown = () => {
    console.log("\n🛑 Primary received shutdown signal");
    const workers = Object.values(cluster.workers);
    console.log(`\n⏳ Closing ${workers.length} workers...`);
    let closedCount = 0;

    const cleanup = () => {
      closedCount++;
      if (closedCount === workers.length) {
        console.log("\n✅ All workers closed successfully");
        httpServer.close(() => {
          console.log("\n✅ Primary server closed");
          process.exit(0);
        });
      }
    };

    workers.forEach((worker) => {
      worker.once("exit", cleanup);
      worker.kill();
    });

    setTimeout(() => {
      console.log("\n⏰ Force closing remaining workers");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
} else {
  // Create server with Express app
  const server = http.createServer(app);

  // Initialize WebSockets
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
    adapter: createAdapter(),
  });

  // Setup worker for socket.io
  setupWorker(io);

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Listen on random port
  server.listen(0, () => {
    console.log(
      `\n👷 Worker ${process.pid} | Port: ${server.address().port} | Env: ${
        process.env.NODE_ENV
      }\n`
    );
  });

  const handleWorkerShutdown = (signal) => {
    console.log(`\n🛑 Worker ${process.pid} received ${signal}`);
    server.close(() => {
      console.log(`\n🔒 Worker ${process.pid} closed all connections`);
      process.exit(0);
    });
    setTimeout(() => {
      console.log(`\n⏰ Worker ${process.pid} shutdown timeout`);
      process.exit(1);
    }, 5000);
  };

  process.on("SIGINT", () => handleWorkerShutdown("SIGINT"));
  process.on("SIGTERM", () => handleWorkerShutdown("SIGTERM"));

  process.on("uncaughtException", (err) => {
    console.error(`\n🚨 Worker ${process.pid} uncaught exception:`, err);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error(
      `\n🚨 Worker ${process.pid} unhandled rejection at:`,
      promise,
      "\nReason:",
      reason
    );
    process.exit(1);
  });
}
