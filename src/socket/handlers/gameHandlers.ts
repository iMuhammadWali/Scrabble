// socketHandlers/game.ts
import { Server, Socket } from 'socket.io';
import { gameManager } from '../../GameManager';
import { Player } from '../../types/Game/Player';
import { Tile } from '../../types/Game/Tile';
import { poolPromise } from '../../database';
import { MoveStatus } from '../../types/Game/Move';

export function registerGameHandlers(io: Server, socket: Socket) {
    socket.on('startGame', async ({ roomId }) => {

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

        const pool = await poolPromise;
        const result = await pool.request()                                                           
        .query<{GameID: number}>("INSERT INTO Games (winner) OUTPUT INSERTED.GameID VALUES (null)");
        
        const gameId = result.recordset[0].GameID;
        const game = gameManager.createGame(gameId, roomId, players);
        
        await pool.request()
            .input('gameId', gameId)
            .input('player1', players[0].id)
            .input('player2', players[1].id)
            .query(`INSERT INTO GamePlayers (GameID, PlayerID, Score) VALUES (@gameId, @player1, 0), (@gameId, @player2, 0)`);

        if (players[2]) {
            await pool.request()
                .input('gameId', gameId)
                .input('player3', players[2].id)
                .query(`INSERT INTO GamePlayers (GameID, PlayerID, Score) VALUES (@gameId, @player3, 0)`);
        }
        if (players[3]) {
            await pool.request()
                .input('gameId', gameId)
                .input('player4', players[3].id)
                .query(`INSERT INTO GamePlayers (GameID, PlayerID, Score) VALUES (@gameId, @player4, 0)`);
        }

        io.to(roomId).emit('gameStarted', game.getGameState());
        io.to(roomId).emit('gameState', game.getGameState());
    });

    socket.on('playMove', async ({ roomId, tiles }: {roomId: string; tiles: Tile[]}) => {

        if (!roomId) return;
        roomId = roomId.trim().toLowerCase();
        if (!roomId) return;

        const game = gameManager.getGame(roomId);
        if (!game) return;

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

        const move = game.playWord(socket.id, tiles);

        console.log('Move status: ', move);

        if (move.status === MoveStatus.Success) {

            let player = socket.user;
            if (!player) return;

            let score = game.scores[player.username];

            // Add the words to database
            const pool = await poolPromise;

            await pool.request()
                .input('gameId', game.dbId)
                .input('playerId', player.id)
                .input('word', move.word?.word)
                .input('score', move.word?.score)
                .query(`
                    INSERT INTO WordsPlayed (GameID, PlayerID, Word, WordScore, PlayedAt)
                    VALUES (@gameId, @playerId, @word, @score, SYSDATETIME())
                `);

            // Check if the player has won
            if (score >= 10) {
                gameManager.wonGame(roomId, game.getCurrentPlayer());

                // Handle database update for the winner
                const pool = await poolPromise;
                await pool.request()
                    .input('gameId', game.dbId)
                    .input('winner', game.getCurrentPlayer().id)
                    .query(`
                        UPDATE Games
                        SET Winner = @winner, EndedAt = SYSDATETIME()
                        WHERE GameID = @gameId
                    `);
                
                // Set Scores of Players in database
                for (const player of game.players) {
                    await pool.request()
                        .input('gameId', game.dbId)
                        .input('playerId', player.id)
                        .input('score', game.scores[player.username])
                        .query(`
                            UPDATE GamePlayers
                            SET Score = @score
                            WHERE GameID = @gameId AND PlayerID = @playerId
                        `);
                }
                
                // Notify all players in the room about the winner
                io.to(roomId).emit('playerWon', game.getCurrentPlayer());
            }
            
            game.nextTurn();
            io.to(roomId).emit('gameUpdated', game.getGameState());

        } else {
            socket.emit('invalidMove', { reason: move.message });
        }
    });

    socket.on('requestGameState', ({ roomId }) => {
        
        if (!roomId) return;
        roomId = roomId.trim().toLowerCase();
        if (!roomId) return;

        const game = gameManager.getGame(roomId);
        if (!game) return;

        socket.emit('gameState', game.getGameState());
    });
};
