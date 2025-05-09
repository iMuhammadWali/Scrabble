// GameManager.ts
import { ScrabbleGame } from './Game';

import { Player } from './types/Game/Player';

export class GameManager {
  private games: Map<string, ScrabbleGame> = new Map();
  public static hosts: Map<string, string> = new Map(); // Maps game IDs to host usernames

  createGame(id: string, players: Player[]): ScrabbleGame {
    const game = new ScrabbleGame(id, players);
    this.games.set(id, game);
    return game;
  }

  getGame(id: string): ScrabbleGame | undefined {
    return this.games.get(id);
  }

  removeGame(id: string) {
    this.games.delete(id);
  }

  listGames() {
    return Array.from(this.games.values()).map(game => game.getGameState());
  }
}

export const gameManager = new GameManager();
