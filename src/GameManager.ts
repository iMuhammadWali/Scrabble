import { Game } from "./Game";
import { Socket } from "socket.io";

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
            player.socket.emit("waiting for an opponent");
            return { message: "Waiting for an opponent..." };
        } else {
            const gameId = this.createGame(this.waitingPlayer, player);
            this.waitingPlayer.socket.emit("gameCreated", { gameId, playerId: 1 });
            player.socket.emit("gameCreated", { gameId, playerId: 2 });
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

    playMove(gameId: number, socket: Socket, word: string, startX: number, startY: number, direction: 'H' | 'V') {
        const game = this.games.get(gameId);
        if (!game) return { error: "Game not found." };
        return game.playMove(socket, word, startX, startY, direction);
    }
}
