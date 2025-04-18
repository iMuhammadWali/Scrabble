import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import userRouter from './routes/userRoutes';
import friendRouter from './routes/friendRoutes';
import { GameManager } from './GameManager';


const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use('/user', userRouter);
app.use('/protected', friendRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager();
const socketToGameId = new Map<string, number>();

io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('joinQueue', ({ username }) => {
        const player = {
            playerId: 0, // will be set in `gameCreated` event
            username,
            socket
        };

        const result = gameManager.queuePlayer(player);
        if (result.gameId) {
            socketToGameId.set(socket.id, result.gameId);
        }
    });

    socket.on('playMove', ({ gameId, word, startX, startY, direction }) => {
        const result = gameManager.playMove(gameId, socket, word, startX, startY, direction);

        if ("error" in result) {
            socket.emit('invalidMove', result.error);
        } else {
            const game = gameManager.getGame(gameId);
            if (!game) return;
            game.players.forEach(p => {
                p.socket.emit('gameState', game.getPublicState(p.socket));
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        const gameId = socketToGameId.get(socket.id);
        if (gameId !== undefined) {
            gameManager.endGame(gameId);
            socketToGameId.delete(socket.id);
        }
    });
});

httpServer.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
});
