export interface GameStats {
    gameId: number;
    players: {
        id: number;
        username: string;
        score: number;
        rank: number;
        wordsFormed: {
            word: string;
            score: number;
        }[];
    }[];
    gameDate: string;
    gameDuration: number;
    rank: number; // This seems redundant if it's already per player; assuming rank of winner maybe?
}

// Assuming `rows` is the result from the database query
export function convertToGameStats(rows: any[]): GameStats | null {
    if (rows.length === 0) return null;

    const gameId = rows[0].gameID;
    const gameDate = rows[0].gameDate;
    const gameDuration = rows[0].gameDuration;

    const playerMap = new Map<number, {
        id: number;
        username: string;
        score: number;
        rank: number;
        wordsFormed: { word: string; score: number }[];
    }>();

    for (const row of rows) {
        const playerId = row.playerId;

        if (!playerMap.has(playerId)) {
            playerMap.set(playerId, {
                id: playerId,
                username: row.username,
                score: row.totalScore,
                rank: row.playerRank,
                wordsFormed: [],
            });
        }

        // Only add word if it's not null (due to LEFT JOIN)
        if (row.word) {
            playerMap.get(playerId)!.wordsFormed.push({
                word: row.word,
                score: row.wordScore,
            });
        }
    }

    const players = Array.from(playerMap.values());

    return {
        gameId,
        gameDate,
        gameDuration,
        players,
        rank: players.find(p => p.rank === 1)?.rank ?? 1 // optional: overall game rank
    };
}