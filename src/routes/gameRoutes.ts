import express, { Request, Response } from "express";
import { poolPromise } from "../database";
import authenticate from "../utils/authenticate";
import { convertToGameStats, GameStats } from "../utils/gameStats";

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

router.get("/:gameID", authenticate, async (req: Request, res: Response): Promise<void> => {
    const pool = await poolPromise;

    const gameID = req.params.gameID;

    console.log("Game ID:", gameID);
    if (!gameID) {
        res.status(400).json({ message: "Game ID is required." });
        return;
    }
    if (isNaN(Number(gameID))) {
        res.status(400).json({ message: "Game ID must be a number." });
        return;
    }

    const game = await pool.request()
        .input("gameID", gameID)
        .query<
            {
                gameID: number,
                playerId: number,
                username: string,
                totalScore: number,
                playerRank: number,
                word: string,
                wordScore: number,
                gameDate: string,
                gameDuration: number,
            }
        >(` 
            WITH PlayerScores AS (
                SELECT
                    G.GameID,
                    P.PlayerID,
                    P.Username,
                    SUM(ISNULL(WP.WordScore, 0)) AS totalScore
                FROM Players P
                JOIN GamePlayers GP ON GP.PlayerID = P.PlayerID
                JOIN Games G ON G.GameID = GP.GameID
                LEFT JOIN WordsPlayed WP ON WP.PlayerID = P.PlayerID AND WP.GameID = G.GameID
                WHERE G.GameID = 54 AND G.Winner IS NOT NULL
                GROUP BY G.GameID, P.PlayerID, P.Username
            ),
            RankedPlayers AS (
                SELECT *,
                    RANK() OVER (PARTITION BY GameID ORDER BY totalScore DESC) AS playerRank
                FROM PlayerScores
            )

            SELECT
                G.GameID AS gameID,
                G.startedAt AS gameDate,
                DATEDIFF(Second, G.startedAt, G.endedAt) AS gameDuration,
                P.PlayerID AS playerId,
                P.Username as username,
                ISNULL(WP.Word, '') AS word,
                ISNULL(WP.WordScore, 0) AS wordScore,
                PS.totalScore,
                RP.playerRank

            FROM RankedPlayers RP
            JOIN PlayerScores PS ON RP.PlayerID = PS.PlayerID AND RP.GameID = PS.GameID
            JOIN Players P ON P.PlayerID = RP.PlayerID
            JOIN GamePlayers GP ON GP.PlayerID = P.PlayerID
            JOIN Games G ON G.GameID = GP.GameID
            LEFT JOIN WordsPlayed WP ON WP.PlayerID = P.PlayerID AND WP.GameID = G.GameID

            WHERE G.GameID = 54 AND G.Winner IS NOT NULL

            ORDER BY RP.playerRank ASC, WordScore DESC;
    `);

    console.log("Game Data:", game.recordset);

    let stats = convertToGameStats(game.recordset);

    console.log("Converted Game Stats:", stats);

    if (!stats) {
        res.status(404).json({ message: "Game not found." });
        return;
    }

    res.status(200).json({
        gameData: stats,
    });

    return;
});

export default router;
