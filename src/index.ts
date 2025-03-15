// const http = require('http');
// const { Server } = require('socket.io');


// // I will connect to the database after implementing the basic game logic.
// const server = http.createServer();
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// io.on('connection', (client) => {
//   console.log('Client connected:', client.id);
//   client.on('disconnect', () => {
//     console.log('Client disconnected');
//   });
// });

// server.listen(PORT, () => {
//   console.log('Server running on port 3000');
// });


// To create a simple http server, we import createServer from http and call it as a function.
// To create an express app, we import express and just call it as a function.
// To create a http server using express, we pass the express app to createServer.
// To create a socket.io server, we always pass the http server to the Socket.io-Server constructor 

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express(); // All this is needed to create an http server using express.
const httpServer = createServer(app);
const io = new Server (httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    }
)

io.on('connection', (client) => {
    console.log('Client connected:', client.id);
});

httpServer.listen(3000);