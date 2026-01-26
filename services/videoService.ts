import { GoogleGenAI } from "@google/genai";
import { SystemNode, SystemEdge } from "../types";

export interface CinematicResult {
    snapshotUrl: string;
    script: Record<string, string>; // Maps node/edge ID to a 1-sentence architectural insight
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

    For EVERY ID listed above, provide a 1-sentence profound architectural insight.
    - Nodes: Explain its ROLE and STRATEGIC IMPACT.
    - Edges: Explain WHY it exists and WHAT EXACT DATA flows through it (e.g., "The API Gateway propagates authenticated JWT tokens to the microservices layer").
    
    CONSTRAINTS:
    - NEVER start with "Connecting...", "Establishing...", or "This connection...".
    - BE ARCHITECTURALLY ACCURATE: Distinguish between caching, persistence, and compute.
    - Return EXACTLY one insight for EVERY ID provided above.
    
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
