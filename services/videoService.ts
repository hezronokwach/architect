import { GoogleGenAI } from "@google/genai";
import { SystemNode, SystemEdge } from "../types";

export interface CinematicResult {
    snapshotUrl: string;
    script: Record<string, string>; // Maps node/edge ID to a 1-sentence architectural insight
    veoPrompt?: string; // The visionary prompt for cinematic video generation
}

export const generateCinematicVideo = async (
    screenshotBase64: string,
    nodes: SystemNode[],
    edges: SystemEdge[]
): Promise<CinematicResult> => {
    console.log("VideoService: Generating Director's Script...");

    const diagramJson = JSON.stringify({ nodes, edges });
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

    const ai = new GoogleGenAI({ apiKey });

    const allIds = [...nodes, ...edges].map(item => item.id);

    const prompt = `
    Act as a Lead System Architect narrating a high-end technical walkthrough for a CEO.
    Analyze this architecture (JSON provided) and write a "Director's Script".
    
    REQUIRED IDs TO NARRATE:
    ${allIds.join(', ')}

    TASKS:
    1. For EVERY ID listed above, provide a 1-sentence profound architectural insight.
    2. Provide a "veoPrompt": A visionary 2-sentence description of how this architecture would look as a cinematic 3D movie (e.g., "A sprawling data metropolis with neon pulses traveling through crystalline glass fibers...").
    
    CONSTRAINTS:
    - NEVER start with "Connecting...", "Establishing...", or "This connection...".
    - BE ARCHITECTURALLY ACCURATE: Distinguish between caching, persistence, and compute.
    - Return EXACTLY one insight for EVERY ID provided above.
    
    DIAGRAM DATA:
    ${diagramJson}

    OUTPUT FORMAT:
    Return ONLY a JSON object with two keys: "script" (the ID mapping) and "veoPrompt" (the movie description).
  `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            config: { responseMimeType: "application/json" }
        });

        const scriptData = JSON.parse(response.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
        const script = scriptData.script || {};
        const veoPrompt = scriptData.veoPrompt || "A futuristic, interconnected digital landscape with visible data flows.";

        console.log("VideoService: Script generated for", Object.keys(script).length, "elements.");

        return {
            snapshotUrl: screenshotBase64,
            script: script,
            veoPrompt: veoPrompt
        };
    } catch (error) {
        console.error("VideoService: Script Generation ERROR:", error);
        return {
            snapshotUrl: screenshotBase64,
            script: {},
            veoPrompt: "A professional architectural walkthrough of a complex distributed system."
        };
    }
};
