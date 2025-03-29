import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv'

dotenv.config();

import { poolPromise } from './database';
import { GameManager } from './GameManager';
import userRouter from './routes/userRoutes';


const PORT = process.env.PORT || 3000;

// Creating a socket.io server
const app = express();
app.use (cors());
app.use(express.json());
app.use ('/user', userRouter);

// app.post ('/test', (req, res) =>{
//     console.log('I want to test some stuff');
//     console.log(req.body);
//     res.status(200);
// })

const httpServer = createServer(app);
const io = new Server (httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    }
);
const gameManager = new GameManager();

io.on('connection', (client) => {
    gameManager.addPlayer(client);
    gameManager.addHandlers(client);

    client.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

httpServer.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
});