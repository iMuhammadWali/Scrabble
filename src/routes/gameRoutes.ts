import express from "express";
import { poolPromise } from "../database";
import authenticate from "../utils/authenticate";

const router = express.Router();

router.get("/player", authenticate, async (req, res) => {
    const pool = await poolPromise;

    const user = req.user;

    const games = await pool.request()
        .input("playerID", user.id)
        .query("SELECT G.gameID, P.playerID, G.winner, P.username, GP.score, G.startedAt FROM GamePlayers GP\
            JOIN Games G ON GP.GameID = G.GameID\
            JOIN Players P ON GP.PlayerID = P.playerID\
            WHERE GP.PlayerID = @playerID")

    // console.log(games.recordset);

    if (games.recordset.length === 0) {
        return res.status(404).json({ message: "No games found for this player." });
    }

    const gameData = games.recordset.map((game) => {
        return {
            gameID: game.gameID,
            playerID: game.playerID,
            username: game.username,
            score: game.score,
            winner: game.winner,
            startedAt: game.startedAt,
        };
    });

    console.log(gameData);

    return res.status(200).json(gameData);
});

export default router;
