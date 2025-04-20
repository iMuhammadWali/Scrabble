import { Game } from "./Game";
import { Socket } from "socket.io";


// I need to see what these return message are and what is their use.
type PlayerInfo = {
    playerId: number;
    username: string;
    socket: Socket;
};

export class GameManager {
    private games: Map<number, Game> = new Map();
    private nextGameId: number = 1;
    private waitingPlayer: PlayerInfo | null = null;

    createGame(player1: PlayerInfo, player2: PlayerInfo): number {
        const gameId = this.nextGameId++;
        const game = new Game(gameId, {
            ...player1,
            rack: [],
            score: 0
        }, {
            ...player2,
            rack: [],
            score: 0
        });

        this.games.set(gameId, game);
        //Add in the Database here asw
        return gameId;
    }

    queuePlayer(player: PlayerInfo): { gameId?: number, message: string } {
        if (this.waitingPlayer === null) {
            this.waitingPlayer = player;
            return { message: "Waiting for an opponent..." };
        } else {
            // At this point, both of the players have playerId -1
            // Set the IDs
            this.waitingPlayer.playerId = 0;
            player.playerId = 1;

            const gameId = this.createGame(this.waitingPlayer, player);

            // Sending 0 and 1 as playerIDs because currentTurn is also either 0 or 1.
            this.waitingPlayer.socket.emit("gameCreated", { gameId, playerId: 0 });
            player.socket.emit("gameCreated", { gameId, playerId: 1 });

            this.waitingPlayer = null;
            return { gameId, message: "Game started." };
        }
    }

    getGame(gameId: number): Game | undefined {
        return this.games.get(gameId);
    }

    endGame(gameId: number) {
        this.games.delete(gameId);
    }

    playMove(gameId: number, playerId: number, socket: Socket, word: string, startX: number, startY: number, direction: 'H' | 'V') {
        const game = this.games.get(gameId);

        // Check if the game has that socket ID or not.
        // This check ensures that only the person who is the part of the game can change the state of the game.
        const player = game?.players.find(p => p.socket.id === socket.id);
        if (!player) {
            return { error: "You are not part of this game." };
        }
        
        // Check if the playerId is correct or not.
        if (player.playerId !== playerId) {
            return { error: "Invalid player ID." };
        }
        if (!game) {
            return { error: "Game not found." };
        }
        return game.playMove(playerId, word, startX, startY, direction);
    }
}
