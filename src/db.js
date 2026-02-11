import { Database } from "bun:sqlite";

const db = new Database("rowbot.sqlite");

// Initialize Database
export function initDB() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT UNIQUE NOT NULL,
            discord_username TEXT,
            discord_nickname TEXT,
            concept2_token TEXT,
            concept2_refresh_token TEXT,
            concept2_account_id TEXT,
            pledge INTEGER DEFAULT 0,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            concept2_log_id TEXT UNIQUE,
            meters INTEGER,
            date TEXT,
            type TEXT,
            verified BOOLEAN DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    `);
    console.log("Database initialized");
}

export const dbHelpers = {
    getUser: (discordId) => {
        return db.query("SELECT * FROM users WHERE discord_id = ?").get(discordId);
    },
    getUserByConcept2Id: (c2Id) => {
        return db.query("SELECT * FROM users WHERE concept2_account_id = ?").get(c2Id);
    },
    createUser: (discordId, username, nickname) => {
        return db.run(
            "INSERT INTO users (discord_id, discord_username, discord_nickname) VALUES (?, ?, ?) ON CONFLICT(discord_id) DO UPDATE SET discord_username=excluded.discord_username, discord_nickname=excluded.discord_nickname",
            [discordId, username, nickname]
        );
    },
    updateTokens: (discordId, accessToken, refreshToken, accountId) => {
        return db.run(
            "UPDATE users SET concept2_token = ?, concept2_refresh_token = ?, concept2_account_id = ? WHERE discord_id = ?",
            [accessToken, refreshToken, accountId, discordId]
        );
    },
    setPledge: (discordId, pledge) => {
        return db.run("UPDATE users SET pledge = ? WHERE discord_id = ?", [pledge, discordId]);
    },
    getAllUsers: () => {
        return db.query("SELECT * FROM users").all();
    },
    addActivity: (userId, logId, meters, date, type, verified) => {
        let q = db.query("INSERT INTO activities (user_id, concept2_log_id, meters, date, type, verified) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(concept2_log_id) DO UPDATE SET meters=excluded.meters, verified=excluded.verified");
        return q.run(userId, logId, meters, date, type, verified);
    },
    deleteActivity: (logId) => {
        return db.run("DELETE FROM activities WHERE concept2_log_id = ?", [logId]);
    },
    getUserActivities: (userId, startDate, endDate) => {
        return db.query(
            "SELECT * FROM activities WHERE user_id = ?1 AND date >= ?2 AND date <= ?3"
        ).all(userId, startDate, endDate);
    },
    getLeaderboardData: (startDate, endDate) => {
        const users = db.query("SELECT * FROM users").all();
        const leaderboard = users.map(user => {
            const activities = db.query(
                "SELECT * FROM activities WHERE user_id = ? AND date >= ? AND date <= ? AND verified = true"
            ).all(user.id, startDate, endDate);

            const totalMeters = activities.reduce((sum, act) => sum + act.meters, 0);

            // Group by day
            const daily = {};
            activities.forEach(act => {
                const day = act.date.split('T')[0];
                daily[day] = (daily[day] || 0) + act.meters;
            });

            return {
                id: user.id,
                discord_nickname: user.discord_nickname,
                pledge: user.pledge,
                activities,
                totalMeters,
                daily
            };
        });

        // Calculate Club Totals
        const clubTotalMeters = leaderboard.reduce((sum, user) => sum + user.totalMeters, 0);
        const clubTotalPledge = leaderboard.reduce((sum, user) => sum + (user.pledge || 0), 0);

        // Calculate Club Daily Totals
        const clubDailyTotals = {};
        leaderboard.forEach(user => {
            Object.entries(user.daily).forEach(([date, meters]) => {
                clubDailyTotals[date] = (clubDailyTotals[date] || 0) + meters;
            });
        });

        return {
            leaderboard: leaderboard.sort((a, b) => b.totalMeters - a.totalMeters),
            clubTotalMeters,
            clubTotalPledge,
            clubDailyTotals
        };
    },
    verifyActivity: (id) => {
        return db.run("UPDATE activities SET verified = 1 WHERE id = ?", [id]);
    },
    getUnverifiedActivities: () => {
        return db.query(`
            SELECT 
                a.id, 
                u.discord_username, 
                u.discord_nickname, 
                a.meters, 
                a.date, 
                a.type 
            FROM activities a
            JOIN users u ON a.user_id = u.id
            WHERE a.verified = 0 OR a.verified IS NULL
            ORDER BY a.date DESC
        `).all();
    },
    getUserTotals: () => {
        return db.query(`
            SELECT 
                u.discord_username, 
                u.discord_nickname, 
                u.pledge, 
                COALESCE(SUM(a.meters), 0) as total_meters 
            FROM users u
            LEFT JOIN activities a ON u.id = a.user_id AND a.verified = 1
            GROUP BY u.id
            ORDER BY total_meters DESC
        `).all();
    }
};
