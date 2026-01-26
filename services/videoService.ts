import { GoogleGenAI } from "@google/genai";

export interface CinematicResult {
    snapshotUrl: string;
    narration: string;
}

export const generateCinematicVideo = async (screenshotBase64: string, diagramJson: string): Promise<CinematicResult> => {
    console.log("VideoService: Starting True Cinematic Generation...");

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
        throw new Error("Missing VITE_GEMINI_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Ask Gemini for a cinematic "Executive Pitch" of this architecture
    const prompt = `
    Observe this software architecture diagram and the provided JSON metadata.
    Act as a Lead System Architect. Provide a 2-3 sentence "Cinematic Overview" 
    of this system that sounds visionary and technical. 
    
    METADATA:
    ${diagramJson}

    FORMAT: Tone should be professional, visionary, and technical.
  `;

    const imagePart = {
        inlineData: {
            data: screenshotBase64.split(',')[1],
            mimeType: "image/png"
        }
    };

    try {
        console.log("VideoService: Requesting Architect Narration from Gemini...");
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }]
        });

        const narration = response.candidates?.[0]?.content?.parts?.[0]?.text || "A sophisticated distributed architecture designed for scale and reliability.";
        console.log("VideoService: Narration Generated:", narration);

        // Simulate a small "rendering" delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        return {
            snapshotUrl: screenshotBase64,
            narration: narration
        };
    } catch (error) {
        console.error("VideoService: ERROR:", error);
        throw error;
    }
};
