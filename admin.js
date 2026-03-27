import { dbHelpers, initDB } from "./src/db.js";
import * as readline from "readline";

// Ensure DB is initialized
initDB();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showMenu() {
    console.log("\n=========================================");
    console.log("             ROWBOT ADMIN              ");
    console.log("=========================================\n");
    console.log("1. Create a Showdown");
    console.log("2. Mass-input pledges for users with 0 pledge");
    console.log("3. Edit a Discord Nickname");
    console.log("4. Exit\n");

    rl.question("Select an option: ", (option) => {
        if (option === '1') {
            createShowdown();
        } else if (option === '2') {
            massInputPledges();
        } else if (option === '3') {
            editNickname();
        } else if (option === '4') {
            console.log("Goodbye!");
            rl.close();
            process.exit(0);
        } else {
            console.log("Invalid option.");
            showMenu();
        }
    });
}

function createShowdown() {
    const users = dbHelpers.getAllUsers();
    if (users.length < 2) {
        console.log("Not enough users to create a showdown. Need at least 2.");
        showMenu();
        return;
    }

    console.log("\n--- Registered Users ---");
    users.forEach(u => {
        const name = u.discord_nickname ? u.discord_nickname : u.discord_username;
        console.log(`ID: ${u.id.toString().padEnd(4)} | Name: ${name}`);
    });
    console.log("------------------------\n");

    rl.question("Enter the ID for User 1 (or 'c' to cancel): ", (u1) => {
        if (u1.toLowerCase().trim() === 'c') return showMenu();
        rl.question("Enter the ID for User 2 (or 'c' to cancel): ", (u2) => {
            if (u2.toLowerCase().trim() === 'c') return showMenu();
            const id1 = parseInt(u1.trim(), 10);
            const id2 = parseInt(u2.trim(), 10);

            if (isNaN(id1) || isNaN(id2)) {
                console.error("\n❌ Error: Please provide valid numerical IDs.");
                return showMenu();
            }

            const user1 = users.find(u => u.id === id1);
            const user2 = users.find(u => u.id === id2);

            if (!user1 || !user2) {
                console.error("\n❌ Error: Could not find user with that ID.");
                return showMenu();
            }

            try {
                dbHelpers.addShowdown(id1, id2);
                const n1 = user1.discord_nickname || user1.discord_username;
                const n2 = user2.discord_nickname || user2.discord_username;
                console.log(`\n🎉 Success! Showdown created: ${n1} vs ${n2}`);
            } catch (error) {
                console.error("\n❌ Failed to insert showdown into database:", error.message);
            }

            showMenu();
        });
    });
}

async function massInputPledges() {
    const users = dbHelpers.getAllUsers();
    const zeroPledgeUsers = users.filter(u => !u.pledge || u.pledge === 0);

    if (zeroPledgeUsers.length === 0) {
        console.log("\n✅ All users already have a pledge greater than 0.");
        return showMenu();
    }

    console.log(`\nFound ${zeroPledgeUsers.length} users with 0 pledge.`);
    
    const askPledge = (user) => {
        return new Promise((resolve) => {
            const name = user.discord_nickname || user.discord_username;
            rl.question(`Enter pledge for ${name} (or 's' to skip, 'q' to quit menu): `, (answer) => {
                const ans = answer.trim().toLowerCase();
                if (ans === 'q') {
                    resolve('quit');
                } else if (ans === 's' || ans === '') {
                    resolve('skip');
                } else {
                    const pledge = parseInt(ans, 10);
                    if (isNaN(pledge) || pledge < 0) {
                        console.log("❌ Invalid number. Skipping user.");
                        resolve('skip');
                    } else {
                        dbHelpers.setPledge(user.discord_id, pledge);
                        console.log(`✅ Set pledge to ${pledge} for ${name}`);
                        resolve('next');
                    }
                }
            });
        });
    };

    for (const user of zeroPledgeUsers) {
        const result = await askPledge(user);
        if (result === 'quit') break;
    }

    console.log("\nFinished mass inputting pledges.");
    showMenu();
}

function editNickname() {
    const users = dbHelpers.getAllUsers();
    
    console.log("\n--- Registered Users ---");
    users.forEach(u => {
        const name = u.discord_nickname ? u.discord_nickname : u.discord_username;
        console.log(`ID: ${u.id.toString().padEnd(4)} | Name: ${name}`);
    });
    console.log("------------------------\n");

    rl.question("Enter the ID of the user to edit (or 'c' to cancel): ", (uId) => {
        if (uId.toLowerCase().trim() === 'c') return showMenu();
        const id = parseInt(uId.trim(), 10);

        if (isNaN(id)) {
            console.error("\n❌ Error: Please provide a valid numerical ID.");
            return showMenu();
        }

        const user = users.find(u => u.id === id);

        if (!user) {
            console.error("\n❌ Error: Could not find user with that ID.");
            return showMenu();
        }

        rl.question(`Enter the new nickname for ${user.discord_username} (currently ${user.discord_nickname || 'none'}): `, (newNickname) => {
            const nickname = newNickname.trim() === '' ? null : newNickname.trim();
            dbHelpers.setNicknameById(id, nickname);
            console.log(`\n✅ Success! Nickname for user ID ${id} set to ${nickname || 'none'}`);
            showMenu();
        });
    });
}

// Start the admin menu
showMenu();
