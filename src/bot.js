import { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";
import { dbHelpers } from "./db.js";
import axios from "axios";

export async function startBot() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages
        ],
        partials: [Partials.Channel]
    });

    client.on(Events.ClientReady, () => {
        console.log(`Logged in as ${client.user.tag}`);
    });

    client.on("messageCreate", async (message) => {
        if (message.author.bot) return;

        if (message.content.startsWith("!row-setup")) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('connect_concept2')
                        .setLabel('Connect Concept2')
                        .setStyle(ButtonStyle.Primary),
                );

            await message.reply({ content: "Click below to connect your Concept2 account!", components: [row] });
        }

        if (message.content.startsWith("!pledge")) {
            const args = message.content.split(" ");
            if (args.length < 2) {
                return message.reply("Usage: !pledge <meters>");
            }
            const meters = parseInt(args[1]);
            if (isNaN(meters)) {
                return message.reply("Please provide a valid number for meters.");
            }

            dbHelpers.createUser(message.author.id, message.author.username, message.author.displayName || message.author.username);
            dbHelpers.setPledge(message.author.id, meters);
            await message.reply(`Pledge of ${meters} meters recorded!`);
        }

        if (message.content.startsWith("!sync-meters")) {
            const adminRoleId = process.env.ADMIN_ROLE_ID;
            if (!message.member?.roles.cache.has(adminRoleId)) {
                return;
            }

            await message.reply("Starting sync process...");
            const count = await syncAllUsers();
            await message.channel.send(`Sync complete. Processed ${count} users.`);
        }
    });

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'connect_concept2') {
            const clientId = process.env.CONCEPT2_CLIENT_ID;
            const redirectUri = encodeURIComponent(process.env.CONCEPT2_REDIRECT_URI);
            const state = interaction.user.id;
            dbHelpers.createUser(interaction.user.id, interaction.user.username, interaction.user.displayName || interaction.user.username);
            const scope = "user:read,results:read";

            const authUrl = `https://log.concept2.com/oauth/authorize?client_id=${clientId}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;

            try {
                await interaction.user.send(`Click this link to authorize Concept2: ${authUrl}. \n Please do not share this link with others.`);
                await interaction.reply({ content: "Check your DMs!", flags: [64] });
            } catch (error) {
                await interaction.reply({ content: "I couldn't DM you. Please enable DMs.", flags: [64] });
            }
        }
    });

    await client.login(process.env.DISCORD_TOKEN);
    return client;
}

async function syncAllUsers() {
    const users = dbHelpers.getAllUsers();
    let count = 0;
    const startDate = process.env.START_DATE;
    const endDate = process.env.END_DATE;

    for (const user of users) {
        if (user.concept2_token) {
            try {
                const response = await axios.get('https://log.concept2.com/api/users/me/results', {
                    headers: { 'Authorization': `Bearer ${user.concept2_token}` },
                    params: { from: startDate, to: endDate, type: "rower" }
                });

                if (response.data && response.data.data) {
                    console.log(response.data.data);
                    for (const result of response.data.data) {
                        dbHelpers.addActivity(user.id, result.id, result.distance, result.date, result.type, result.verified);
                    }
                }
                count++;
            } catch (err) {
                if (err.response?.status === 401) {
                    console.log(`Token expired for ${user.discord_username}, attempting refresh...`);
                    const newToken = await refreshUserToken(user);
                    if (newToken) {
                        try {
                            const retryResponse = await axios.get('https://log.concept2.com/api/users/me/results', {
                                headers: { 'Authorization': `Bearer ${newToken}` },
                                params: { from: startDate, to: endDate, type: "rower" }
                            });
                            if (retryResponse.data && retryResponse.data.data) {
                                for (const result of retryResponse.data.data) {
                                    dbHelpers.addActivity(user.id, result.id, result.distance, result.date, result.type);
                                }
                            }
                            count++;
                            continue;
                        } catch (retryErr) {
                            console.error(`Retry sync failed for ${user.discord_username}:`, retryErr.message);
                        }
                    }
                }
                console.error(`Failed to sync user ${user.discord_username}:`, err.message);
            }
        }
    }
    return count;
}

async function refreshUserToken(user) {
    try {
        const response = await axios.post("https://log.concept2.com/oauth/access_token", new URLSearchParams({
            client_id: process.env.CONCEPT2_CLIENT_ID,
            client_secret: process.env.CONCEPT2_CLIENT_SECRET,
            grant_type: "refresh_token",
            scope: "user:read,results:read",
            refresh_token: user.concept2_refresh_token
        }));

        const { access_token, refresh_token } = response.data;
        dbHelpers.updateTokens(user.discord_id, access_token, refresh_token, user.concept2_account_id);
        console.log(`Refreshed token for ${user.discord_username}`);
        return access_token;
    } catch (err) {
        console.error(`Failed to refresh token for ${user.discord_username}:`, err.response?.data || err.message);
        return null;
    }
}
