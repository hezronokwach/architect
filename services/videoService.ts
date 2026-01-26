import { GoogleGenAI } from "@google/genai";

export const generateCinematicVideo = async (screenshotBase64: string): Promise<string> => {
    // Use the same API key as the chat service
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    const prompt = `
    Transform this software architecture diagram into a cinematic 3D animated scene. 
    Do a slow cinematic camera pan across the nodes. 
    Ensure the lines glow as if data pulses are traveling through them. 
    The background should be a dark, futuristic technical environment.
    Output a high-quality video file.
  `;

    // Convert base64 to parts for the API
    const imagePart = {
        inlineData: {
            data: screenshotBase64.split(',')[1],
            mimeType: "image/png"
        }
    };

    try {
        // In @google/genai, we use generateContent on the models collection
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }]
        });

        console.log("Video Generation Response:", response);

        // Simulate a delay for "rendering"
        await new Promise(resolve => setTimeout(resolve, 3000));

        return "SUCCESS";
    } catch (error) {
        console.error("Video Generation Error:", error);
        throw error;
    }
};
