import express, { Request, Response } from "express";
import { poolPromise } from "../database";
import authenticate from "../utils/authenticate";

const router = express.Router();

router.get("/player", authenticate, async (req: Request, res: Response): Promise<void> => {
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
        .input("playerID", user?.id)
        .query<
            {
                gameID: number,
                playerID: number,
                username: string,
                score: number,
                winner: string,
                startedAt: Date,
            }
        >(`
            SELECT G.gameID, P.playerID, P.username, G.startedAt, GP.score, (SELECT TOP 1 username FROM Players WHERE playerID = G.winner) as winner
            FROM Players P
            JOIN GamePlayers GP ON P.playerID = GP.PlayerID
            JOIN Games G ON GP.GameID = G.GameID
            WHERE GP.GameID IN (
                SELECT GameID FROM GamePlayers
                WHERE PlayerID = @playerID
            ) AND G.winner IS NOT NULL
            ORDER BY G.startedAt DESC;
            `
        );

    if (games.recordset.length === 0) {
        res.status(404).json({ message: "No games found for this player." });
        return;
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
    
    res.status(200).json({
        gameData: gameData,
    });
    return;
});

router.get("/leaderboard", async (req: Request, res: Response): Promise<void> => {
    const pool = await poolPromise;

    const games = await pool.request()
        .query<
            {
                id: number,
                username: string,
                totalScore: number,
            }
        >(`
            SELECT TOP 10
                P.playerID as id,
                P.username,
                COALESCE(SUM(GP.score), 0) AS totalScore
            FROM Players P
            LEFT JOIN GamePlayers GP ON P.playerID = GP.PlayerID
            GROUP BY P.playerID, P.username
            ORDER BY totalScore DESC;
        `);

    if (games.recordset.length === 0) {
        res.status(404).json({ message: "No players found." });
        return;
    }

    res.status(200).json({
        leaderboard: games.recordset,
    });
    return;
});

export default router;
