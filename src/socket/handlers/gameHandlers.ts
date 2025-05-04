import { Socket, Server } from "socket.io";
import { GameManager } from "../../GameManager";

export function registerGameHandlers(io: Server, socket: Socket) {
    socket.on("startGame", (roomId) => {

        roomId = roomId.trim().toLowerCase();

        const room = io.of("/").adapter.rooms.get(roomId);
        if (!room) {
            socket.emit("roomNotFound", { message: "Room not found" });
            return;
        }

        if (room.size < 2) {
            socket.emit("notEnoughPlayers", { message: "Not enough players to start the game" });
            return;
        }

        // Check if user is host
        const isHost = Array.from(room).some((socketId) => {
            const playerSocket = io.sockets.sockets.get(socketId);
            return playerSocket?.id === socket.id;
        });

        if (!isHost) {
            socket.emit("notHost", { message: "You are not the host of this room" });
            return;
        }

        const players = Array.from(room).map((socketId) => {
            const playerSocket = io.sockets.sockets.get(socketId);
            return {
                playerId: playerSocket?.user?.id as number,
                username: playerSocket?.user?.username as string,
                socket: playerSocket as Socket,
            };
        });

        if (players.length < 2) {
            socket.emit("notEnoughPlayers", { message: "Not enough players to start the game" });
            return;
        }

        const gameManager = new GameManager();
        const gameId = gameManager.createGame(roomId, players[0], players[1]);

        // players.forEach((player) => {
        //     player?.socket?.emit("gameStarted", { gameId });
        // });

        io.to(roomId).emit("gameStarted", { gameId });

    })
}