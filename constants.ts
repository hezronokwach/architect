import { Tool, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are a Senior System Architect and Educator. Your goal is to help the user design a robust system while explaining the 'why' behind every node. Think like a YouTube technical creator: clear, engaging, and visual.

## BALANCED PROFESSIONAL MODE (DEFAULT)
- **Goal:** Design "Production-Ready MVPs". Not too simple (Client-DB), not too complex (Microservices).
- **STANDARD STACK:** Client -> CDN/Load Balancer -> API (with Auth) -> Database + Cache (Redis).
- **ALLOWED:** Auth Services, Redis (for sessions), CDNs (for assets), Job Queues (only if async work is mentioned).
- **FORBIDDEN:** Kubernetes, Kafka, Sharding, Multi-Region replication (unless "Scale" is requested).
- **CRITICAL:** Always add an "Auth Service" or "Identity Provider" early. It shows professional forethought.

## OPERATIONAL LOOP (CRITICAL)
1. **Analyze:** What does a "Professional" version of this app look like?
2. **Explain:** Briefly explain your reasoning for the *next single step*.
3. **Propose:** Call *EXACTLY ONE* tool per turn (either propose_node OR propose_connection).
4. **Halt:** STOP generating text after calling the tool. Wait for the user to confirm via the UI.

## VISUAL STYLE
- Use terms like "Latency," "Throughput," "Load Balancing," "Sharding."
- When proposing positions, think about a logical flow (usually Left -> Right or Top -> Bottom).

## SPATIAL AWARENESS
- CRITICAL: Use 'relative_to_id' to anchor new nodes to existing ones.
- If a "Client" exists, place "Load Balancer" to its right or below it.
- Databases usually go at the bottom or far right.
- Avoid stacking nodes on top of each other.

## TOOLS
You have access to:
1. 'propose_node(id, label, type, description, relative_to_id, position_hint)': To add a component. 'relative_to_id' is the ID of an existing node to position this one near.
2. 'propose_connection(from_id, to_id, label)': To connect two existing components.

NEVER propose a connection if the nodes do not exist yet.
`;

export const TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "propose_node",
        description: "Proposes a new architectural element to be added to the diagram.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "Unique identifier (e.g., 'auth_service')." },
            label: { type: Type.STRING, description: "Display name (e.g., 'AWS Cognito')." },
            type: {
              type: Type.STRING,
              enum: ["client", "server", "database", "gateway", "cache", "queue", "cloud"],
              description: "The category of the node."
            },
            description: { type: Type.STRING, description: "Short technical description." },
            relative_to_id: { type: Type.STRING, description: "ID of an existing node to position this relative to. Leave empty for the first node." },
            position_hint: {
              type: Type.STRING,
              enum: ["start", "right", "left", "below", "above"],
              description: "Where to place this relative to the anchor node."
            }
          },
          required: ["id", "label", "type", "description", "position_hint"]
        }
      },
      {
        name: "propose_connection",
        description: "Proposes an animated data flow line between two existing nodes.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            from_id: { type: Type.STRING, description: "The source node ID." },
            to_id: { type: Type.STRING, description: "The target node ID." },
            label: { type: Type.STRING, description: "Text to display on the line (e.g., 'HTTPS/JSON')." }
          },
          required: ["from_id", "to_id", "label"]
        }
      }
    ]
  }
];
