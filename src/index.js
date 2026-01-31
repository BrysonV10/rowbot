import { initDB } from "./db.js";
import { startBot } from "./bot.js";
import { startServer } from "./server.js";

console.log("Starting Rowbot...");

// Clean up env vars if needed or validate
if (!process.env.DISCORD_TOKEN) {
    console.warn("Warning: DISCORD_TOKEN is not set in .env");
}

initDB();
startBot()
    .then(client => startServer(client))
    .catch(err => console.error("Bot failed to start:", err));
