import express, { Application, NextFunction, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameManager } from './GameManager';

import userRouter from './routes/userRoutes';
import friendRouter from './routes/friendRoutes'

dotenv.config();

// Things to do in this file:
// 1. To convert this into a complete ts file.



const PORT: number = Number(process.env.PORT) || 3000;


// Creating a socket.io server
const app = express();
app.use(cors());
app.use(express.json());
app.use('/user', userRouter);

// Currently thinking that the protected route should be the one where all the game joining events should take place.
// I need to create the router for protected as well.

app.use('/protected', friendRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
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


// app.post('/protected', verifyJWT, (req: Request, res: Response) => {
//     console.log("We have verified the jwt token !");
//     console.log("The request body: ", req.body);
//     res.json({message: "My body feels tired but I dont feel sleep at all."});
// });