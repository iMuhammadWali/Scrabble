import express from "express";
import { GameManager } from "../GameManager";

const router = express.Router();
const gameManager = new GameManager();

router.post("/start", (req, res) => {
    const { player1, player2 } = req.body; // Include playerId, username, socketId
    const socket1 = req.app.get("io").sockets.sockets.get(player1.socketId);
    const socket2 = req.app.get("io").sockets.sockets.get(player2.socketId);

    if (!socket1 || !socket2) {
        res.status(400).json({ error: "Invalid socket IDs" });
        return;
    }

    const gameId = gameManager.createGame(
        { ...player1, socket: socket1 },
        { ...player2, socket: socket2 }
    );

    socket1.emit("gameStarted", { gameId });
    socket2.emit("gameStarted", { gameId });

    res.json({ gameId });
});

router.get("/:gameId/state/:socketId", (req, res) => {
    const { gameId, socketId } = req.params;
    const game = gameManager.getGame(Number(gameId));
    if (!game) {
        res.status(404).json({ error: "Game not found" });
        return;
    }

    const socket = req.app.get("io").sockets.sockets.get(socketId);
    if (!socket) {
        res.status(400).json({ error: "Invalid socket" });
        return;
    }
    const state = game.getPublicState(socket);
    res.json(state);
});

export default router;
