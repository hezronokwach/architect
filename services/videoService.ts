import { GoogleGenAI } from "@google/genai";
import { SystemNode, SystemEdge } from "../types";

export interface CinematicResult {
    snapshotUrl: string;
    technicalScript: Record<string, string>; // ID -> Technical insight
    simpleScript: Record<string, string>;    // ID -> Simple metaphor for non-techies
    veoPrompt: string;                       // Cinematic description
}

export const generateCinematicVideo = async (
    screenshotBase64: string,
    nodes: SystemNode[],
    edges: SystemEdge[]
): Promise<CinematicResult> => {
    console.log("VideoService: Generating Dual-Mode Director's Script...");

    const diagramJson = JSON.stringify({
        nodes: nodes.map(n => ({ id: n.id, label: n.label, type: n.type, description: n.description })),
        edges: edges.map(e => ({ from: e.fromId, to: e.toId, label: e.label }))
    });
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

    const ai = new GoogleGenAI({ apiKey });
    const allIds = [...nodes, ...edges].map(item => item.id);

    const prompt = `
    Act as a Master Architect and a World-Class Explainer. 
    Analyze this architecture (JSON provided) and generate a TWO-MODE narrated experience.
    
    REQUIRED IDs:
    ${allIds.join(', ')}

    TASKS:
    1. For EVERY ID, write a "technicalScript" entry: Professional, deep architectural insight (e.g., "Implementing a write-through cache to minimize DB latency").
    2. For EVERY ID, write a "simpleScript" entry: A clever metaphor for non-techies (e.g., "Like a sticky note on a fridge so you don't have to look in the heavy cookbook").
    3. Generate a "veoPrompt": A vivid, 3-sentence description of this system as a high-end cinematic 3D world (e.g., "A sprawling diamond-grid metropolis where neon energy pulses zip through translucent glass highways...").

    CONSTRAINTS:
    - BE CREATIVE. Avoid "This node does X". Use active, evocative language.
    - Metaphors should be relatable (kitchens, post offices, traffic, library).
    - Return a single JSON object.

    DIAGRAM DATA:
    ${diagramJson}

    JSON STRUCTURE:
    {
      "technicalScript": { "id1": "...", "id2": "..." },
      "simpleScript": { "id1": "...", "id2": "..." },
      "veoPrompt": "..."
    }
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

        const data = JSON.parse(response.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

        return {
            snapshotUrl: screenshotBase64,
            technicalScript: data.technicalScript || {},
            simpleScript: data.simpleScript || {},
            veoPrompt: data.veoPrompt || "A futuristic digital landscape pulsing with data energy."
        };
    } catch (error) {
        console.error("VideoService: Generation ERROR:", error);
        return {
            snapshotUrl: screenshotBase64,
            technicalScript: {},
            simpleScript: {},
            veoPrompt: "A professional architectural walkthrough."
        };
    }
};
