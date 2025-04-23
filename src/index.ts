import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import userRouter from './routes/userRoutes';
import friendRouter from './routes/friendRoutes';
import { GameManager } from './GameManager';
import jwt from 'jsonwebtoken'

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
}));
app.use('/user', userRouter);


// friendRouter should be named as "protectedRouter"
app.use('/friend', friendRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 20000, // default is 5000ms
    pingInterval: 10000 // how often to send pings
});

const gameManager = new GameManager();

io.use((socket, next) => {
    const token = socket.handshake.auth.token; // client should send this
    if (!token) return next(new Error("Authentication error"));

    jwt.verify(token, process.env.JWT_SECRET as string, (err: any) => {
        if (err) return next(new Error("Authentication error"));
        next();
    });
});

io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('joinQueue', (data) => {
        const username = data.username;
        const player = {
            playerId: -1, // This one is dummy and the real one will be set in `gameCreated` event.
            username,
            socket
        };

        // Every player has the game ID 
        // They should also have the Player ID
        gameManager.queuePlayer(player);
    });

    socket.on('playMove', (data) => {
        // Need to add the check that if anyone of this is undefined, then return.
        const { gameId, playerId, word, startX, startY, direction } = data;
        const result = gameManager.playMove(gameId, playerId, socket, word, startX, startY, direction);

        if ("error" in result) {
            socket.emit('invalidMove', result.error);
        } else {
            // If the move is played, send the updated game state to both players.
            console.log("Move Played");
            const game = gameManager.getGame(gameId);
            if (!game) 
                return;

            
            // This should be done in the game class but later.
            game.players.forEach((p, idx) => {
                p.socket.emit('gameState', {
                    playerId: idx,
                    gameId: game.gameId,
                    ...game.getPublicState(p.socket),
                });
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Need to end the game for now but will add the recnnect logic later.
        });
});

httpServer.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
});
