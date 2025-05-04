// socketHandlers/game.ts
import { Server, Socket } from 'socket.io';
import { gameManager } from '../../GameManager';
import { Player } from '../../types/Player';
import { Tile } from '../../types/tile';

export function registerGameHandlers(io: Server, socket: Socket) {
    socket.on('startGame', ({ roomId }) => {

        if (!roomId) return;
        roomId = roomId.trim().toLowerCase();
        if (!roomId) return;
        
        let players: Player[] = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        .map((socketId) => {
            const player = io.sockets.sockets.get(socketId);

            return {
                id: player?.user?.id as number,
                socketId: socketId as string,
                username: player?.user?.username as string,
                score: 0,
                tiles: [] as string[], // Initialize with empty tiles
                isHost: socketId === socket.id, // Check if the player is the host
            } as Player;
        });

        // Check if the user is the host
        const user = socket.user;
        if (!user) return;
        const isHost = players.some((player: any) => player.username === user.username && player.isHost);

        if (!isHost) {
            socket.emit('notHost', { message: 'You are not the host of this game' });
            return;
        }
        // Check if the game is already started
        const existingGame = gameManager.getGame(roomId);
        if (existingGame) {
            socket.emit('gameAlreadyStarted', { message: 'Game already started' });
            return;
        }
        // Check if there are enough players
        if (players.length < 2) {
            socket.emit('notEnoughPlayers', { message: 'Not enough players to start the game' });
            return;
        }
        // Check if there are too many players
        if (players.length > 4) {
            socket.emit('tooManyPlayers', { message: 'Too many players to start the game' });
            return;
        }

        const game = gameManager.createGame(roomId, players);
        io.to(roomId).emit('gameStarted', game.getGameState());
        io.to(roomId).emit('gameState', game.getGameState());
    });

    socket.on('playMove', ({ roomId, tiles }: {roomId: string; tiles: Tile[]}) => {

        if (!roomId) return;
        roomId = roomId.trim().toLowerCase();
        if (!roomId) return;

        // console.log('Play move event received:', roomId, tiles);

        const game = gameManager.getGame(roomId);
        if (!game) return;

        // console.log('Game found:', game.id);

        // console.log('Current player:', game.getCurrentPlayer().username);
        // console.log("Room ID:", roomId);
        // console.log("Socket ID:", socket.id);
        
        console.log("Letters to play:", tiles);

        if (game.getCurrentPlayer().socketId !== socket.id) {
            socket.emit('invalidMove', { reason: 'Not your turn' });
            return;
        }

        if (!tiles || tiles.length === 0) {
            socket.emit('invalidMove', { reason: 'No letters provided' });
            return;
        }
        if (tiles.length > 7) {
            socket.emit('invalidMove', { reason: 'Too many letters' });
            return;
        }


        const success = game.playWord(socket.id, tiles);

        console.log('Move success: ', success);

        if (success) {
            io.to(roomId).emit('gameUpdated', game.getGameState());
        } else {
            socket.emit('invalidMove', { reason: 'Invalid turn or placement' });
        }
    });
}
