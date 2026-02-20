import { dbHelpers } from "./db.js";
import axios from "axios";
import { file } from "bun";

export function startServer(client) {
    const port = process.env.SERVER_PORT || 3000;

    Bun.serve({
        port,
        hostname: "0.0.0.0",
        async fetch(req) {
            const url = new URL(req.url);

            // OAuth Callback
            if (url.pathname === "/callback") {
                const code = url.searchParams.get("code");
                const state = url.searchParams.get("state"); // This is the Discord User ID
                const error = url.searchParams.get("error");

                if (error) return new Response(`Error: ${error}`, { status: 400 });
                if (!code || !state) return new Response("Missing code or state", { status: 400 });

                try {
                    // Exchange code for token
                    const tokenRes = await axios.post("https://log.concept2.com/oauth/access_token", new URLSearchParams({
                        client_id: process.env.CONCEPT2_CLIENT_ID,
                        client_secret: process.env.CONCEPT2_CLIENT_SECRET,
                        grant_type: "authorization_code",
                        scope: "user:read,results:read",
                        code,
                        redirect_uri: process.env.CONCEPT2_REDIRECT_URI
                    }));

                    const { access_token, refresh_token } = tokenRes.data;

                    // Fetch user details to get the Concept2 ID
                    const userRes = await axios.get("https://log.concept2.com/api/users/me", {
                        headers: { "Authorization": `Bearer ${access_token}` }
                    });

                    // Handle both root-level id and data-wrapped id
                    const account_id = userRes.data.data ? userRes.data.data.id : userRes.data.id;
                    // Update DB
                    // We identify the user by the 'state' param which corresponds to discord_id
                    // Verify if user exists first (they should from !pledge or at least stubbed)
                    // If they don't exist (maybe they clicked link without !pledge), we create them.
                    const existingUser = dbHelpers.getUser(state);
                    // send a discord DM to the user confirming that their account is connected
                    const user = await client.users.fetch(state);
                    await user.send(`Your Concept2 account has been connected!\n\nAll that's left is to use the ErgData App to record your workouts during Erg-A-Thon. As you participate, activities will be automatically uploaded to our webpage, where you can track your progress toward your pledge!`);

                    if (!existingUser) {
                        // We might not know their username yet if they haven't chatted, 
                        // but we can insert the ID and update details later or fetch from Discord API if needed.
                        dbHelpers.createUser(state, "Unknown", "Unknown");
                    }

                    dbHelpers.updateTokens(state, access_token, refresh_token, account_id.toString());

                    return new Response(file("public/connected.html"));

                } catch (err) {
                    console.error("OAuth Error:", err.response?.data || err.message);
                    return new Response("Error exchanging token.", { status: 500 });
                }
            }

            // Webhook Receiver
            if (url.pathname === process.env.WEBHOOK_URL && req.method === "POST") {
                console.log(req.headers);
                const body = await req.json();
                // Verify logic here if secret provided (omitted for simplicity but recommended)
                /* 
                   Concept2 Webhooks payload structure needs to be checked.
                   Assuming it sends activity data.
                   Actually documentation says they send a POST with activity details.
                */

                // For security, checking a simplified secret if header present
                // if (req.headers.get("Authorization") !== process.env.WEBHOOK_SECRET) ...

                // Process activity
                // NOTE: Concept2 webhook format usually sends list of new results.
                // We need to map their user ID to our DB user.
                // Users table has 'concept2_account_id'.

                // Implementation detail depends on C2 webhook payload.
                // Assuming payload has property 'user_id' and 'new_results'
                console.log("Received Webhook Payload:", JSON.stringify(body, null, 2));
                // if someone adds a result to our database
                if (body.type == "result-added") {
                    const user = dbHelpers.getUserByConcept2Id(body.result.user_id);
                    if (!user) {
                        console.warn(`Received webhook for unknown Concept2 ID: ${user_id}`);
                        // We return 200 OK to stop C2 from retrying, even if we don't know the user yet
                        return new Response("User not found", { status: 200 });
                    }
                    const { user_id, time, date, distance, id } = body.result;
                    if (!user_id || !time || !date || !distance || !id) {
                        console.error("Invalid webhook payload structure");
                        return new Response("Invalid payload", { status: 400 });
                    }
                    // verify that the activity is within the date range
                    if (new Date(date).getTime() < new Date(process.env.START_DATE).getTime() || new Date(date).getTime() > new Date(process.env.END_DATE).getTime()) {
                        console.warn(`Received webhook for activity outside of date range: ${date}`);
                        return new Response("Activity outside of date range", { status: 200 });
                    }
                    dbHelpers.addActivity(user.id, id, distance, date, body.result.type, body.result.verified);

                    // if we recieve a webhook indicating a user deleted an activity 
                } else if (body.type == "result-deleted") {
                    const { result_id } = body;
                    if (!result_id) {
                        console.error("Invalid webhook payload structure");
                        return new Response("Invalid payload", { status: 400 });
                    }
                    dbHelpers.deleteActivity(result_id);
                }
                return new Response("Webhook processed", { status: 200 });
            }

            // API Leaderboard
            if (url.pathname === "/api/leaderboard") {
                const start = process.env.START_DATE;
                const end = process.env.END_DATE;
                const data = dbHelpers.getLeaderboardData(start, end);
                return new Response(JSON.stringify(data), {
                    headers: { "Content-Type": "application/json" }
                });
            }

            // Config Status for Frontend
            if (url.pathname === "/api/config") {
                return new Response(JSON.stringify({
                    start: `${process.env.START_DATE}T00:00:00-05:00`,
                    end: process.env.END_DATE
                }), {
                    headers: { "Content-Type": "application/json" }
                });
            }

            // Static Frontend
            if (url.pathname === "/" || url.pathname === "/index.html") {
                const start = new Date(process.env.START_DATE);
                const now = new Date();

                // If detailed logging is needed
                // console.log("Checking dates:", now, start, now < start);

                if (now < start) {
                    return new Response(file("public/coming_soon.html"));
                }
                return new Response(file("public/index.html"));
            }

            return new Response("Not Found", { status: 404 });
        }
    });
    console.log(`Server started on port ${port}`);
}
