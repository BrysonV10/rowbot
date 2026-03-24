import { dbHelpers, initDB } from "./src/db.js";
import * as readline from "readline";

// Ensure DB is initialized
initDB();

const users = dbHelpers.getAllUsers();

console.log("=========================================");
console.log("         ROWBOT SHOWDOWN ADMIN           ");
console.log("=========================================\n");

if (users.length < 2) {
    console.log("Not enough users to create a showdown. Need at least 2.");
    process.exit(0);
}

console.log("--- Registered Users ---");
users.forEach(u => {
    const name = u.discord_nickname ? u.discord_nickname : u.discord_username;
    console.log(`ID: ${u.id.toString().padEnd(4)} | Name: ${name}`);
});
console.log("------------------------\n");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Enter the ID for User 1: ", (u1) => {
    rl.question("Enter the ID for User 2: ", (u2) => {
        const id1 = parseInt(u1.trim(), 10);
        const id2 = parseInt(u2.trim(), 10);

        if (isNaN(id1) || isNaN(id2)) {
            console.error("\n❌ Error: Please provide valid numerical IDs.");
            rl.close();
            process.exit(1);
        }

        const user1 = users.find(u => u.id === id1);
        const user2 = users.find(u => u.id === id2);

        if (!user1 || !user2) {
            console.error("\n❌ Error: Could not find user with that ID.");
            rl.close();
            process.exit(1);
        }

        try {
            dbHelpers.addShowdown(id1, id2);
            const n1 = user1.discord_nickname || user1.discord_username;
            const n2 = user2.discord_nickname || user2.discord_username;
            console.log(`\n🎉 Success! Showdown created: ${n1} vs ${n2}`);
        } catch (error) {
            console.error("\n❌ Failed to insert showdown into database:", error.message);
        }

        rl.close();
    });
});
