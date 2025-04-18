import { Socket } from "socket.io";

const TILE_DISTRIBUTION: { [letter: string]: number } = {
    A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9,
    J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6,
    S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, ' ': 2
};

// Player has ID
// Socket
// username
// score
// rack
type Player = {
    playerId: number;
    socket: Socket;
    username: string;
    score: number;
    rack: string[];
};

export class Game {
    gameId: number;
    players: Player[];
    board: string[][];
    tileBag: string[];
    moves: string[];
    currentTurn: number;

    constructor(gameId: number, player1: Player, player2: Player) {
        this.gameId = gameId;
        this.players = [player1, player2];
        this.board = Array.from({ length: 15 }, () => 
            Array(15).fill(' ')
        );
        this.tileBag = this.createShuffledTileBag();
        this.moves = [];
        this.currentTurn = 0;
        this.players[0].rack = this.drawTiles(7);
        this.players[1].rack = this.drawTiles(7);
    }

    private createShuffledTileBag(): string[] {
        const bag: string[] = [];
        for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
            for (let i = 0; i < count; i++) bag.push(letter);
        }


        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        return bag;
    }

    private drawTiles(count: number): string[] {
        return this.tileBag.splice(0, count);
    }

    getPublicState(socket: Socket) {
        const player = this.players.find(p => p.socket.id === socket.id);
        const opponent = this.players.find(p => p.socket.id !== socket.id);
        return {
            board: this.board,
            yourRack: player?.rack ?? [],
            yourScore: player?.score ?? 0,
            opponentScore: opponent?.score ?? 0,
            yourTurn: this.players[this.currentTurn].socket.id === socket.id
        };
    }

    // move {
    //  played by
    //  word that was played
    //  start
    //  ended
    //}
    playMove(socket: Socket, word: string, startX: number, startY: number, direction: 'H' | 'V') {

        // Verify the turn
        const playerIndex = this.players.findIndex(p => p.socket.id === socket.id);
        if (playerIndex !== this.currentTurn) return { error: "Not your turn." };


        const player = this.players[playerIndex];
        const usedLetters: string[] = [];

        for (let i = 0; i < word.length; i++) {
            const x = direction === 'H' ? startX + i : startX;
            const y = direction === 'V' ? startY + i : startY;
            const boardLetter = this.board[y][x];
            const wordLetter = word[i];

            if (boardLetter === ' ') {
                if (!player.rack.includes(wordLetter)) {
                    return { error: `You don't have letter ${wordLetter}` };
                }
                this.board[y][x] = wordLetter;
                usedLetters.push(wordLetter);
            }
        }

        // Update rack and draw new tiles
        player.rack = player.rack.filter(l => !usedLetters.includes(l));
        player.rack.push(...this.drawTiles(usedLetters.length));

        // TODO: Score calculation
        const wordScore = word.length; // Placeholder
        player.score += wordScore;

        this.moves.push(`${player.username} played ${word}`);
        this.currentTurn = 1 - this.currentTurn;

        return { success: true, wordScore };
    }
}