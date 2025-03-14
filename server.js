const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (client) => {
  console.log('Client connected:', client.id);
  client.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
// Okay man !
// I am tired now...
server.listen(3000, () => {
  console.log('Server running on port 3000');
});