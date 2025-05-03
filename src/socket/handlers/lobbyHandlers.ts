import { Socket, Server } from "socket.io";
import { GameManager } from "../../GameManager";

export function registerLobbyHandlers(io: Server, socket: Socket) {
    socket.on('createRoom', (data) => {
      const user = socket.user;
      if (!user) return;
  
      const roomId = `room-${Date.now()}`;
      socket.join(roomId);
  
      io.to(roomId).emit('roomCreated', { roomId, host: user.username });
    });
  
    socket.on('joinRoom', ({ roomId }) => {
      socket.join(roomId);
      io.to(roomId).emit('playerJoined', { username: socket.user?.username });
    });
  }

export const createLobby = (socket: Socket, gameManager: GameManager, data: any) => {
    
    if (!data || !data.gameId) {
        socket.emit('invalidMove', "Invalid data");
        return;
    }

    const { gameId } = data;
    const username = socket.user?.username as string; // Assuming the token contains the username
    const player = {
        playerId: -1, // This one is dummy and the real one will be set in `gameCreated` event.
        username,
        socket
    };

    // Every player has the game ID 
    // They should also have the Player ID
    gameManager.createGame(player, gameId);

}