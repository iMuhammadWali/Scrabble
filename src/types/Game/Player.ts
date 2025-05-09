export interface Player {
    id: number;
    socketId: string;
    username: string;
    score: number;
    tiles: string[]; // Player's tiles
    isHost: boolean; // true if the player is the host of the game  
}