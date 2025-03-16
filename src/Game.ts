import { Socket } from "socket.io";

// This is a scrabble game.
export class Game{
    // I can probably have a game id, unique for each game. That would help searching the games faster.

    players: Socket[];
    board: string[][]; 
    moves: string[];
    constructor(player1: Socket, player2: Socket)
    {            
        this.players = []; // Initialize the array first.
        this.players.push(player1);
        this.players.push(player2);

        this.board = []; // I should probably have a function that creates an empty board.
        this.moves = [];
        console.log('Game created');
    }

}