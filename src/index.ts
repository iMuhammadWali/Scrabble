import { createServer } from 'http';

import express from 'express';

import { GameManager } from './GameManager';
import { initializeSocketIO } from './socket';

import dotenv from 'dotenv';
import { initApp } from './utils/initApp';
dotenv.config();


const app = express();

initApp(app);

const httpServer = createServer(app);
const gameManager = new GameManager();

initializeSocketIO(httpServer, gameManager);

// io.use((socket, next) => {
//     const token = socket.handshake.auth.token; // client should send this
//     if (!token) return next(new Error("Authentication error"));

//     jwt.verify(token, process.env.JWT_SECRET as string, (err: any) => {
//         if (err) return next(new Error("Authentication error"));
//         socket.user = jwt.decode(token); // Decode the token to get the user ID
//         next();
//      });
// });
        
//         io.on('connection', (socket: Socket) => {
//                 console.log(`Client connected: ${socket.id}`);
            
//                 socket.on('createRoom', (data) => {
//                         createRoom(socket, gameManager, data);
//                     });
                
//                     socket.on('joinQueue', (data) => {
//                             const username = data.username;
//                             const player = {
//                                     playerId: -1, // This one is dummy and the real one will be set in `gameCreated` event.
//                                     username,
//                                     socket
//                                 };
                        
//                                 // Every player has the game ID 
//                                 // They should also have the Player ID
//                                 gameManager.queuePlayer(player);
//                             });
                        
//                             socket.on('playMove', (data) => {
//                                     // Need to add the check that if anyone of this is undefined, then return.
//                                     const { gameId, playerId, word, startX, startY, direction } = data;
//                                     const result = gameManager.playMove(gameId, playerId, socket, word, startX, startY, direction);

//                                     if ("error" in result) {
//                                             socket.emit('invalidMove', result.error);
//                                         } else {
//                                                 // If the move is played, send the updated game state to both players.
//                                                 console.log("Move Played");
//                                                 const game = gameManager.getGame(gameId);
//                                                 if (!game) 
//                                                     return;
                                    
            
//                                                 // This should be done in the game class but later.
//                                                 game.players.forEach((p, idx) => {
//                                                         p.socket.emit('gameState', {
//                     playerId: idx,
//                     gameId: game.gameId,
//                     ...game.getPublicState(p.socket),
//                 });
//             });
//         }
//     });

//     socket.on('disconnect', () => {
//             console.log('Client disconnected:', socket.id);
//             // Need to end the game for now but will add the recnnect logic later.
//         });
// });

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
});
