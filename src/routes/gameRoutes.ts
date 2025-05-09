import express from "express";
import { poolPromise } from "../database";
import authenticate from "../utils/authenticate";

const router = express.Router();

router.get("/player", authenticate, async (req, res) => {
    const pool = await poolPromise;

    const user = req.user;

    interface Player {
        id: number;
        username: string;
        score: number;
    }

    interface Game {
        gameID: number;
        players: Player[];
        winner: string;
        startedAt: Date;
    }

    const games = await pool.request()
        .input("playerID", user.id)
        .query<
            {
                gameID: number,
                playerID: number,
                username: string,
                score: number,
                winner: string,
                startedAt: Date,
            }
        >("\
            SELECT G.gameID, P.playerID, P.username, G.startedAt, GP.score, (SELECT TOP 1 username FROM Players WHERE playerID = G.winner) as winner\
            FROM Players P\
            JOIN GamePlayers GP ON P.playerID = GP.PlayerID\
            JOIN Games G ON GP.GameID = G.GameID\
            WHERE GP.GameID IN (\
                SELECT GameID FROM GamePlayers\
                WHERE PlayerID = @playerID\
            )\
            "
        );

    if (games.recordset.length === 0) {
        return res.status(404).json({ message: "No games found for this player." });
    }

    const gameMap = new Map<number, Game>();
    
    games.recordset.forEach((game) => {
        if (!gameMap.has(Number(game.gameID))) {
            gameMap.set(Number(game.gameID), {
                gameID: game.gameID,
                players: [],
                winner: game.winner,
                startedAt: game.startedAt
            });
        }

        gameMap.get(Number(game.gameID))?.players.push({
            id: game.playerID,
            username: game.username,
            score: game.score
        });
    });
    
    const gameData = Array.from(gameMap.values());
    
    console.log(gameData);
    return res.status(200).json({
        gameData: gameData,
    });
});

export default router;
