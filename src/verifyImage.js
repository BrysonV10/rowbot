import { GoogleGenerativeAI } from "@google/generative-ai";
import { dbHelpers } from "./db.js";
import axios from "axios";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function handleImageVerification(message) {
    if (process.env.ENABLE_AI_AUTOVERIFY == "false") {
        return false;
    }
    // 1. Check if there is an image in the message
    const attachment = message.attachments.find(a => a.contentType && a.contentType.startsWith('image/'));
    if (!attachment) {
        return false;
    }

    try {
        const user = dbHelpers.getUser(message.author.id);
        if (!user) {
            await message.reply("Please connect your Concept2 account first using `!row-setup` in the server before submitting verifications.");
            return true;
        }

        // 2. Fetch the image data
        const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        // 3. Call Gemini API
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Analyze the following image. Determine if the image is a Concept2 PM5 and determine the completed number of meters shown in the picture. Do not get confused with predicted meters, only parse the actual completed meters. This is totaled on the screen for you. Do not total the meters yourself, look for the total on the screen (if the screen has View Detail in the top left, the top entry in the log is the total. It does not say total but interpret it as the total)
Return nothing but a boolean representing if the image is a Concept2 PM5 separated by a comma with an integer representing the number of meters completed. Return the integer 0000 if this is not a concept2 PM5.`
        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: attachment.contentType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text().trim();

        console.log(responseText);

        // 4. Parse the `<boolean>, <integer>` response
        // Expected format: "true, 5000" or "false, 0"
        const parts = responseText.split(',').map(s => s.trim());
        if (parts.length !== 2) {
            await message.reply("Failed to verify image: Could not parse program response.");
            return true;
        }

        const isValid = parts[0].toLowerCase() === 'true';
        const meters = parseInt(parts[1], 10);

        if (!isValid || isNaN(meters)) {
            await message.reply("Failed to verify image: The program did not recognize this as a valid Concept2 PM5.");
            return true;
        }

        // 5. Look up unverified activity
        const activity = dbHelpers.getUnverifiedActivityByMeters(user.id, meters);
        if (!activity) {
            await message.reply(`Failed to verify image: Could not find an unverified activity for ${meters} meters. Make sure you log the activity first.`);
            return true;
        }

        // 6. Verify and reply
        dbHelpers.verifyActivity(activity.id);
        await message.reply(`Success! Successfully verified your activity of ${meters} meters.`);
        return true;

    } catch (error) {
        console.error("Error in handleImageVerification:", error);
        await message.reply("An error occurred while trying to verify the image. Please try again later.");
        return true;
    }
}
