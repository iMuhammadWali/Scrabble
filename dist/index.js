"use strict";
// const http = require('http');
// const { Server } = require('socket.io');
// // The only thing I know to the question "Why does Socket.io need HTTP server to work?" is that Socket.io is built on top of HTTP server. So, it needs HTTP server to work.
// // And it not only use websockets but some other transprt protocols as well.
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
// server.listen(3000, () => {
//   console.log('Server running on port 3000');
// });
console.log("Hello, World!");
