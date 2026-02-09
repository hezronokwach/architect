import { GoogleGenAI } from "@google/genai";
import { SystemNode, SystemEdge } from "../types";

export interface CinematicResult {
    snapshotUrl: string;
    technicalScript: Record<string, string>; // ID -> Technical insight
    simpleScript: Record<string, string>;    // ID -> Domain-aware metaphor
    technicalVeoPrompt: string;              // Cinematic description for techies
    simpleVeoPrompt: string;                 // Metaphor-driven story description
}

export const generateCinematicVideo = async (
    screenshotBase64: string,
    nodes: SystemNode[],
    edges: SystemEdge[]
): Promise<CinematicResult> => {

    const diagramData = {
        nodes: nodes.map(n => ({ id: n.id, label: n.label, type: n.type, description: n.description })),
        edges: edges.map(e => ({ from: e.fromId, to: e.toId, label: e.label }))
    };

    const diagramJson = JSON.stringify(diagramData, null, 2);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY");

    const ai = new GoogleGenAI({ apiKey });
    const allIds = [...nodes, ...edges].map(item => item.id);

    const prompt = `
    Act as a Master Architect and a World-Class Storyteller for non-technical people.
    Analyze this architecture (JSON provided) and generate a DUAL-MODE cinematic experience.
    
    DIAGRAM DATA (Current System):
    ${diagramJson}

    REQUIRED IDs:
    ${allIds.join(', ')}

    TASKS:
    1. "technicalScript": For EVERY ID (nodes and edges), provide a deep technical insight (e.g., "Using Redis for sub-millisecond session state").
    2. "simpleScript": For EVERY ID, provide a domain-aware metaphor. 
    3. "technicalVeoPrompt": A professional 3-sentence visual explanation of this system, focusing on its core operation and data flow across nodes.
    4. "simpleVeoPrompt": A clear, educational 3-sentence visual story that explains how a user's request travels through this architecture. 

    CONSTRAINTS:
    - BE ARCHITECTURALLY ACCURATE even in simple mode.
    - Metaphors must be consistent across the whole system.
    - Return a single JSON object.

    JSON STRUCTURE:
    {
      "technicalScript": { "id1": "...", "id2": "..." },
      "simpleScript": { "id1": "...", "id2": "..." },
      "technicalVeoPrompt": "...",
      "simpleVeoPrompt": "..."
    }
    `;


    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.0-flash",
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }],
            config: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(response.text || "{}");

        return {
            snapshotUrl: screenshotBase64,
            technicalScript: data.technicalScript || {},
            simpleScript: data.simpleScript || {},
            technicalVeoPrompt: data.technicalVeoPrompt || "A neon data metropolis.",
            simpleVeoPrompt: data.simpleVeoPrompt || "A digital story unfolding in a real-world scenario."
        };
    } catch (error) {
        return {
            snapshotUrl: screenshotBase64,
            technicalScript: {},
            simpleScript: {},
            technicalVeoPrompt: "A professional architectural walkthrough.",
            simpleVeoPrompt: "A simple explanation of the system."
        };
    }
};
