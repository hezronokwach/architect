import { GoogleGenAI } from "@google/genai";

export interface CinematicResult {
    snapshotUrl: string;
    script: Record<string, string>; // Maps node/edge ID to a 1-sentence architectural insight
}

export const generateCinematicVideo = async (screenshotBase64: string, diagramJson: string): Promise<CinematicResult> => {
    console.log("VideoService: Generating Director's Script...");

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
    Act as a Lead System Architect narrating a high-end technical walkthrough for a CEO.
    Analyze this architecture (JSON provided) and write a "Director's Script".
    
    For EVERY node provide a 1-sentence profound architectural insight.
    For EVERY edge, explain WHY the connection exists and WHAT data moves through it.
    
    CONSTRAINTS:
    - NEVER start a sentence with "Connecting...", "Establishing...", or "This connection...".
    - Start directly with the action or value (e.g., "The Student User initiates HTTPS requests to the Load Balancer to begin the authentication handshake").
    - Maximum one punchy sentence per item.
    - Focus on the technical REALITY of the interaction.
    
    DIAGRAM DATA:
    ${diagramJson}

    OUTPUT FORMAT:
    Return ONLY a JSON object where keys are the IDs and values are the 1-sentence insights.
  `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const scriptText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const script = JSON.parse(scriptText);

        console.log("VideoService: Script generated for", Object.keys(script).length, "elements.");

        return {
            snapshotUrl: screenshotBase64,
            script: script
        };
    } catch (error) {
        console.error("VideoService: Script Generation ERROR:", error);
        return {
            snapshotUrl: screenshotBase64,
            script: {} // Fallback to empty script
        };
    }
};
