import { Player } from "./types/Player";
import { Tile } from "./types/Tile";

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
      this.scores = Object.fromEntries(players.map(p => [p.username, 0]));
      this.currentPlayerIndex = 0;
      this.board = Array.from({ length: 15 }, () => Array(15).fill(''));
      this.tilePool = this.generateTiles();
      this.tileBags = this.dealInitialTiles(players);
      this.startedAt = new Date();
    }
  
    generateTiles(): string[] {
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

    isValidWord(word: string): boolean {
      // For now, assume all words are valid
      return word.length > 1;
    }

    refillTiles(playerSocketID: string): void {
      const rack = this.tileBags[playerSocketID];
      const needed = 7 - rack.length;
      const newTiles = this.tilePool.splice(0, needed);
      this.tileBags[playerSocketID] = rack.concat(newTiles);
    }
  
  
    playWord(playerSocketID: string, letters: Tile[]): boolean {
      const player = this.getCurrentPlayer();
      if (!player || player.socketId !== playerSocketID) return false;
      if (letters.length === 0) return false;
  
      const rack = this.tileBags[playerSocketID];
      const usedLetters = letters.map(t => t.letter);
      const rackCopy = [...rack];
      for (const letter of usedLetters) {
        const index = rackCopy.indexOf(letter);
        if (index === -1) return false; // letter not in rack
        rackCopy.splice(index, 1);
      }
  
      // Check alignment
      const sameRow = letters.every(l => l.x === letters[0].x);
      const sameCol = letters.every(l => l.y === letters[0].y);
      if (!sameRow && !sameCol) return false;
  
      // Sort letters in placement order
      letters.sort((a, b) => sameRow ? a.y - b.y : a.x - b.x);
  
      // Check continuity
      for (let i = 1; i < letters.length; i++) {
        const prev = letters[i - 1];
        const curr = letters[i];
        if (sameRow && curr.y !== prev.y + 1) return false;
        if (sameCol && curr.x !== prev.x + 1) return false;
      }
  
      // Check if space is available on the board
      for (const tile of letters) {
        if (this.board[tile.x][tile.y] !== '') return false;
      }
  
      // First move must cover the center
      if (this.board.every(row => row.every(cell => cell === ''))) {
        const coversCenter = letters.some(t => t.x === 7 && t.y === 7);
        if (!coversCenter) return false;
      }
  
      // Place letters
      for (const tile of letters) {
        this.board[tile.x][tile.y] = tile.letter;
      }
  
      // Form word string
      const word = letters.map(t => t.letter).join('');
      if (!this.isValidWord(word)) return false;
  
      // Score (simplified: 1 point per letter)
      const score = letters.length;
      this.scores[player.username] += score;
  
      // Remove used letters from rack
      for (const letter of usedLetters) {
        const index = this.tileBags[playerSocketID].indexOf(letter);
        if (index !== -1) this.tileBags[playerSocketID].splice(index, 1);
      }
  
      this.refillTiles(playerSocketID);
  
      // Next player's turn
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
  