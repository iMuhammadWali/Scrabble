import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";

import { registerLobbyHandlers } from "./handlers/lobbyHandlers";
import { registerGameHandlers } from "./handlers/gameHandlers";

import { GameManager } from "../GameManager";
import { UserPayload } from "../types/UserPayload";

export function initializeSocketIO(httpServer: HTTPServer, gameManager: GameManager) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;

      if (!decoded) {
        return next(new Error("Authentication error"));
      }

      socket.user = decoded.user;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // console.log(io.sockets.adapter.rooms);

    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);
  });

  return io;
}
