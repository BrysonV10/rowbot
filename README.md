# rowbot

Developed for maybe Erg-A-Thon?     

## Setup

To install dependencies:

```bash
bun install
```
     
Copy the .example.env file to .env and fill in the values. You'll need a Client ID and Secret from Concept2, a Discord Bot Token and Client ID, and a couple ID's from within Discord. 

To run:

```bash
bun run index.js
```   
This command exposes http://localhost:3000 (or whatever port you select in the config).   
This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Commands Within Discord
Anyone:    
`!pledge <meters>` - records a pledge from the user    
`!row-setup` - sends the button for whatever channel you choose to put it in    
Admin Only (as defined in the .env file):    
`!sync-meters` - manually syncs all meters for all users, requires a admin role specified in the .env file   
`!export-csv` - exports all user totals as a CSV file    
`!unverified` - shows all unverified activites in a table    
`!verify <ID>` - verifies an activity manually with an ID as given     


## Configuring the bot
An .example.env file is provided as a template for required values. Here's what each does and how to get the proper keys.   
`SERVER_PORT` - an integer representing the port to run the webserver on. Recommended to use 80, 443, or 3000.     
`DISCORD_TOKEN` - the Discord bot token, issued via the [Discord Developer Portal](https://discord.com/developers/home)    
`DISCORD_CLIENT_ID` - also issued via the Discord Developer Portal    
`CONCEPT2_CLIENT_ID` - issued from the [Concept2 Developer Portal](https://log.concept2.com/developers/keys)    
`CONCEPT2_CLIENT_SECRET` - also issued from the Concept2 Developer Portal    
`CONCEPT2_REDIRECT_URI` - this should match what is placed in the Concept2 Developer Portal. It'll take the form of https://your-domain.com/callback. This bot will register a route open at /callback, so make sure the dev portal matches that form.  
`START_DATE` - of the form YYYY-MM-DD. Defines the start date of the challenge, configures the countdown and ensures no activities logged prior to this date      
`END_DATE` - of the form YYYY-MM-DD. Defines the end date of the challenge for accurate countdown and activity restriction    
`ADMIN_ROLE_ID` - from Discord - found by going into the Roles menu in the server settings, right clicking the role, and clicking "Copy ID". You may need to enable Developer Mode within Discord.     
`WEBHOOK_URL` - since Concept2 doesn't support any Webhook authentication, I recommend configurating a long string of characters for this route to somewhat hide it. It's the best I can do for now as they don't have any way of locking it down further. I recommend following the form /webhook-XXXXXXXXXXXXXXXX.     
`DISCORD_DM_WEBHOOK_URL` - only needed if you want to have DM forwarding to your logging/admin channel. Create the webhook through Discord in the channel settings and paste the link here.    
`GEMINI_API_KEY` - I use Google's Gemini 2.5 Flash with an API key from Google AI Studio. The free plan should be enough for this project, though you may want to set up billing if needed. This model may need to be updated as Google changes what models are available for free, though updates should be a nearly drop in replacement using the Google AI Library that I'm using.    
`ENABLE_AI_AUTOVERIFY` - true/false. If you want the autoverify AI function via DMs. If false you can leave the Gemini API key blank.   
