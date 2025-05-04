import { Player } from "./types/Player";

// Game.ts
export class ScrabbleGame {
    id: string;
    board: string[][]; // 15x15
    players: Player[];
    scores: Record<string, number>;
    currentPlayerIndex: number;
    tileBags: Record<string, string[]>; // each player's rack
    tilePool: string[]; // remaining tiles
    startedAt: Date;
  
    constructor(id: string, players: Player[]) {
      this.id = id;
      this.players = players;
      console.log("Players: ", players);
      this.scores = Object.fromEntries(players.map(p => [p, 0]));
      this.currentPlayerIndex = 0;
      this.board = Array.from({ length: 15 }, () => Array(15).fill(''));
      this.tilePool = this.generateTiles();
      this.tileBags = this.dealInitialTiles(players);
      this.startedAt = new Date();
    }
  
    generateTiles(): string[] {
      // Populate with proper Scrabble distribution
      const letters = 'EEEEEEEEEEEEAAAAAAAAAIIIIIIIIONNNNNNRRRRRRTTTTTLLLLSSUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';
      return letters.split('').sort(() => Math.random() - 0.5); // Shuffle
    }
  
    dealInitialTiles(players: Player[]): Record<string, string[]> {
      const result: Record<string, string[]> = {};
      for (const p of players) {
        result[p.socketId] = this.tilePool.splice(0, 7);
      }
      return result;
    }
  
    getCurrentPlayer(): Player {
      return this.players[this.currentPlayerIndex];
    }
  
    playWord(player: Player, word: string, x: number, y: number, direction: 'horizontal' | 'vertical'): boolean {
      if (this.getCurrentPlayer() !== player) return false;
  
      // Validate placement, check letters available, update board, score, etc.
      // For now, assume valid
      for (let i = 0; i < word.length; i++) {
        const cx = direction === 'horizontal' ? x + i : x;
        const cy = direction === 'vertical' ? y + i : y;
        this.board[cy][cx] = word[i];
      }
  
      this.scores[player.socketId] += word.length; // Simplified scoring
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      return true;
    }
  
    getGameState() {
      return {
        id: this.id,
        board: this.board,
        players: this.players,
        currentTurn: this.getCurrentPlayer(),
        scores: this.scores,
        tileBags: this.tileBags,
      };
    }
  }
  