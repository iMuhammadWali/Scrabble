import { Socket } from "socket.io";
import { Game } from "./Game";
export class GameManager{
    private games: any[];
    // private gameId: number = 0;
    private pendingPlayer: Socket | null; // 
    constructor()
    {
        this.games = [];
        this.pendingPlayer = null;
    }

    public addPlayer(player: Socket)
    {
        console.log(`Player added: ${player.id}`);
        if (this.pendingPlayer)
        {
            // We can create a game becasue the condtions are met.
            const game = new Game (this.pendingPlayer, player);
            this.games.push(game);

            // I should also add this game to my database.
            // But that should probably in the constructor of the game class.

            this.pendingPlayer = null; // We dont have any pending player now.
        }
        else 
        {
            this.pendingPlayer = player;
        }
    }

    public addHandlers(player: Socket)
    {
        player.on ('message', (message) => {
            console.log('Message received on server:', message);
            console.log(`Message tpe: ${typeof message}`);
        })
        
    }
}