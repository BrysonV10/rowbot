# RowBot & Polyrower

A flexible platform for tracking rowing challenges (Erg-A-Thon) using Concept2 integration, featuring a Discord Bot for logging/management and a Web Interface that includes live results.

## Features

- **Discord Integration**: Log activities, sync Concept2 accounts, and manage users directly from a Discord server.
- **Concept2 OAuth**: Allows users to connect their Concept2 logbooks for automatic activity syncing.
- **AI Automated Verification**: Uses Google's Gemini to verify screenshot proofs of manually-logged activities via direct messages.
- **Web Interface (Polyrower)**: A web portal to view active challenges and see active progress bars.

## Setup

To install dependencies:

```bash
bun install
```
     
Copy the `.example.env` file to `.env` and fill in the values. You'll need a Client ID and Secret from Concept2, a Discord Bot Token and Client ID, a Gemini API Key from Google AI Studio, and a couple ID's from within Discord. 

To run the main application (Bot and Web Server):

```bash
bun run src/index.js
```   

To run the Admin TUI:

```bash
bun run admin.js
```

The web server will expose `http://localhost:3000` (or whatever port you select in your `.env` config).   
This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Commands Within Discord

**Anyone:**    
`!help` - Show the help message      
`!row-setup` - Connect your Concept2 account or manually log your activity    
`!pledge <meters>` - Records a pledge goal for the user    
`!users` - View all registered users and their pledges    

**Manager Only (Requires `ADMIN_ROLE_ID`):**    
`!sync-meters` - Manually syncs activities for all connected Concept2 accounts    
`!export-csv` - Exports all user totals as a CSV file    
`!unverified` - Shows all unverified manual activities in a table    
`!verify <ID>` - Verifies an activity manually with an ID as given     
`!activities <username>` - View all activities for a specific discord user    
`!delete <ID>` - Delete an activity by ID    

## Admin TUI (`admin.js`)

Provides an interactive console menu to:
- **Create a Showdown**: Setup a 1v1 matchup between two registered users for the Showdown View in the Polyrower interface.
- **Mass-input Pledges**: Quickly add `!pledge` goals for users who haven't set one yet.
- **Edit a Discord Nickname**: Manually assign or customize a user's display name.
- **Grab User Activities**: Debugging tool to fetch direct Concept2 activity logs for a reliable double-check.

## Configuring the bot

An `.example.env` file is provided as a template for required values. Here's what each does and how to get the proper keys:   

- `SERVER_PORT` - an integer representing the port to run the webserver on. Recommended to use 80, 443, or 3000.     
- `DISCORD_TOKEN` - the Discord bot token, issued via the [Discord Developer Portal](https://discord.com/developers/home)    
- `DISCORD_CLIENT_ID` - also issued via the Discord Developer Portal    
- `CONCEPT2_CLIENT_ID` - issued from the [Concept2 Developer Portal](https://log.concept2.com/developers/keys)    
- `CONCEPT2_CLIENT_SECRET` - also issued from the Concept2 Developer Portal    
- `CONCEPT2_REDIRECT_URI` - this should match what is placed in the Concept2 Developer Portal. It'll take the form of `https://your-domain.com/callback`. This bot will register a route open at `/callback`, so make sure the dev portal matches that form.  
- `START_DATE` - of the form YYYY-MM-DD. Defines the start date of the challenge, configures the countdown and ensures no activities logged prior to this date.      
- `END_DATE` - of the form YYYY-MM-DD. Defines the end date of the challenge for accurate countdown and activity restriction *NOTE: this is EXCLUSIVE*.    
- `ADMIN_ROLE_ID` - from Discord - found by going into the Roles menu in the server settings, right clicking the role, and clicking "Copy ID". You may need to enable Developer Mode within Discord.     
- `WEBHOOK_URL` - since Concept2 doesn't support any Webhook authentication, I recommend configurating a long string of characters for this route to somewhat hide it. It's the best I can do for now as they don't have any way of locking it down further. I recommend following the form `/webhook-XXXXXXXXXXXXXXXX`.     
- `DISCORD_DM_WEBHOOK_URL` - only needed if you want to have DM forwarding to your logging/admin channel. Create the webhook through Discord in the channel settings and paste the link here.    
- `GEMINI_API_KEY` - I use Google's Gemini 2.5 Flash with an API key from Google AI Studio for the image auto-verify workflow. The free plan should be enough for this project.    
- `ENABLE_AI_AUTOVERIFY` - `true`/`false`. If you want the autoverify AI function via DMs. If false you can leave the Gemini API key blank.   
