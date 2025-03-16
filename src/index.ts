// Some Notes:

// To create a simple http server, we import createServer from http and call it as a function.
// To create an express app, we import express and just call it as a function.
// To create a http server using express, we pass the express app to createServer.
// To create a socket.io server, we always pass the http server to the Socket.io-Server constructor 

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './GameManager';

// Note: Even a reconnection from hoppscotch gives different Id to the client
// Maybe becasue it acts as a different client everytime.
// And this may not be the case in real world connections.

const PORT = process.env.PORT || 3000;

// Creating a socket.io server
const app = express();
app.use (cors());
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