Building a "YouTube-style" system design chatbot is an ambitious and exciting project. Since you are using **Gemini 3**, **Next.js**, and **Veo 3.1**, you have access to a "Triple Threat" of AI: high-speed reasoning (Gemini Flash), high-fidelity image icons (Nano Banana), and cinematic video (Veo).

Here is your comprehensive implementation plan.

---

## 1. The Core Tech Stack

* **Framework:** Next.js 15+ (App Router).
* **AI SDK:** `@google/generative-ai` (for Gemini 3 & Veo 3.1 access).
* **Diagram Engine:** **React Flow** (best for nodes/edges) or **SVG-based Canvas**.
* **Animation Library:** **Framer Motion** (essential for that "YouTube" smooth feel).
* **Styling:** Tailwind CSS + `lucide-react` for basic icons.

---

## 2. Phase 1: The AI "Brain" (Gemini 3 Tooling)

You won't just ask Gemini for text. You will define **Tools** (Functions) that Gemini must call to build the diagram. This ensures the AI outputs structured data you can actually code against.

### **The Tool Schema**

Define these functions in your Gemini configuration:

* `propose_node(id, label, iconType, description)`: AI suggests a new element.
* `propose_connection(fromId, toId, label)`: AI suggests a data flow line.

### **The Prompt Logic**

You must instruct Gemini 3 using the `thinking_level` parameter.

> "You are a Senior System Architect. When a user describes a system, first explain your reasoning using your internal thoughts. Then, call the `propose_node` function for the first element. Wait for user confirmation before calling the next tool."

---

## 3. Phase 2: The "Confirmation" State Machine

The user specifically wants to confirm before building. You need a **Drafting Layer** in your Next.js state.

| Interaction Step | State Change | UI Logic |
| --- | --- | --- |
| **AI Proposes** | `proposedNode = { ... }` | Display a "Ghost Node" (dashed border, 50% opacity). |
| **User Action** | Click "Confirm" or "Modify" | If confirm, move `proposedNode` to `activeNodes` array. |
| **Trigger Animation** | `onConfirm()` | Fire the Framer Motion animation to "solidify" the node. |

---

## 4. Phase 3: "YouTube Style" Animation Logic

To get that professional look, use these three specific techniques:

### **A. The "Ghost to Solid" Entry**

When a node is confirmed, animate it with a "Spring" bounce and a glow effect.

```tsx
<motion.div
  initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
  animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
  transition={{ type: "spring", stiffness: 260, damping: 20 }}
  className="shadow-[0_0_15px_rgba(59,130,246,0.5)]"
>
  {/* Node Content */}
</motion.div>

```

### **B. The Animated Line Drawing**

This is the "hand-drawn" look you see on YouTube. Use SVG `pathLength`.

```tsx
<motion.path
  d="M 10 10 L 100 100" // Coordinates from React Flow
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 1.5, ease: "easeInOut" }}
  stroke="currentColor"
  strokeWidth="2"
/>

```

---

## 5. Phase 4: Icon Generation (Nano Banana)

Standard icons look boring. When Gemini creates a node, use its image generation capabilities to create a custom icon.

1. Gemini creates a "Database" node.
2. Backend triggers a Nano Banana request: *"A sleek, minimalist 3D icon of a cybernetic database, neon blue, glass texture."*
3. The resulting image is set as the background of that node.

---

## 6. Phase 5: The Veo Cinematic Reveal

Once the design is complete, offer a "Cinematic Export."

1. **Capture:** Your app takes a screenshot of the final React Flow canvas.
2. **Veo Call:** Send the image to Veo 3.1.
3. **Prompt:** *"Transform this software architecture diagram into a 3D animated scene. Cinematic camera panning across the nodes. Lines glow as data pulses through them. Background music: Deep tech ambient."*
4. **Result:** The user gets an 8-second professional video of their actual design.

---

## 7. Step-by-Step Coding Roadmap

### **Week 1: Foundations**

* Set up Next.js project and install `framer-motion` and `@xyflow/react`.
* Connect the Gemini 3 API using a **Server Action**.
* Implement a basic chat window that prints Gemini's text.

### **Week 2: The Tooling Loop**

* Implement **Function Calling**. Make sure Gemini outputs JSON for `add_node`.
* Build the `DiagramCanvas` component that renders nodes from an array in state.
* Add the "Ghost Node" logic where nodes only appear permanently after a button click.



### **Week 3: The "YouTube" Polish**

* Replace standard lines with `framer-motion` SVG paths.
* Add a "Grid Background" to the canvas (common in design videos).
* Implement the icon generation tool using Nano Banana for specific nodes.

### **Week 4: The Veo Export**

* Implement the screenshot-to-API pipeline.
* Hook up the Veo 3.1 endpoint to generate the final MP4.
* Add a "Download Video" button for the user.

---



This document outlines the architectural strategy for managing the complex state and logic of your AI-driven system design tool. To achieve that "YouTube-style" polished feel, we must separate the **Conversation State** from the **Visual Design State**.

---

## 1. The State Management Architecture

We will use a **Finite State Machine (FSM)** approach. This prevents the AI from trying to draw a connection before a node exists.

### **The Design Store (Zustand or React Context)**

You need a central store to manage the diagram. Each element in the system will have a `status`: `PROPOSED` (Ghost) or `COMMITTED` (Solid).

```typescript
interface SystemState {
  nodes: Node[];
  edges: Edge[];
  pendingAction: null | 'NODE_PROPOSAL' | 'CONNECTION_PROPOSAL';
  isAnimating: boolean;
}

```

### **The Lifecycle of a Node**

1. **Thinking:** Gemini 3 processes the request.
2. **Proposal:** Gemini calls a tool. The UI adds a node to the `nodes` array with `status: 'PROPOSED'`. It appears on screen with a dashed border and 50% opacity.
3. **Confirmation:** The user clicks "Confirm" in the chat.
4. **Commit:** The status changes to `'COMMITTED'`. This triggers the **Framer Motion** "Solidify" animation.
5. **Clean up:** The `pendingAction` is cleared, and the AI is notified via a hidden message that it can proceed.

---

## 2. Handling Spatial Intelligence (Layout Engine)

**The Problem:** Gemini 3 is a language model; it is not naturally good at calculating exact pixel coordinates () for a beautiful layout.

**The Solution:** Use **Dagre** or **Elkjs**.
Instead of asking Gemini to "Put the database at ", you ask Gemini for the **Hierarchy**.

* Gemini says: "Add Database *below* the API Gateway."
* Your code uses a layout library to calculate the coordinates:


* This ensures the "YouTube look" stays organized and doesn't become a messy pile of nodes.

---

## 3. The "Tool Use" Synchronization

Since you want the conversation to continue *while* things are being built, you must handle **Asynchronous Tool Streams**.

* **Step 1:** Gemini emits a "Function Call" mid-sentence.
* **Step 2:** Your Next.js frontend intercepts this call and pauses the text streaming.
* **Step 3:** The UI renders the "Confirm/Reject" buttons directly in the chat bubble.
* **Step 4:** Only after the user interacts does the AI get the "Result" of the tool, allowing it to write the next sentence (e.g., "Great, now that the Auth is set up, let's add the Landing Page...").

---

## 4. Asset Pipeline (Nano Banana & Veo)

Managing images and videos requires a "Placeholder Strategy" to keep the UI snappy.

### **Icon Generation (Nano Banana)**

* When a node is created, display a generic `lucide-react` icon immediately.
* Trigger the Nano Banana image generation in the background.
* Once the high-quality 3D icon is ready, use a **Cross-Fade animation** to replace the generic icon with the AI-generated one. This prevents the user from waiting for the AI to "draw" before they see the node.

### **Video Buffering (Veo 3.1)**

* Veo generation can take 30+ seconds.
* **The UI Concept:** Show a "Director's Monitor" overlay. While Veo works, show a progress bar with technical labels like *"Rendering Cinematic Lighting..."* or *"Calculating Camera Path..."* to maintain the "YouTube/High-Tech" vibe.

---

## 5. Important Concepts Often Missed

### **A. The "Undo" State**

System design is iterative. You must keep a **History Stack**. If the user says "Actually, move the database to the cloud," you need to be able to revert the state of the nodes and edges instantly.

### **B. Responsive Canvas**

Designers often work on different screens. Use a **Zoom-to-Fit** function. Every time a new node is confirmed, the React Flow canvas should smoothly animate its viewport to ensure the entire design is centered and visible.

### **C. Exporting Metadata**

Don't just build a picture. At the end of the session, Gemini 3 should be able to generate a **README.md** or a **Terraform/Docker Compose** file based on the `nodes` and `edges` in your state. This turns a "cool animation tool" into a "productivity powerhouse."

---

This document defines the "System Prompt"—the invisible set of instructions that governs how Gemini 3 behaves, thinks, and interacts with your Next.js frontend tools. This is the most critical part of the build because it ensures the AI doesn't just "talk" but actually "acts" as a state controller.

---

## 1. The Persona: The Senior System Architect

The prompt must first establish an identity. This ensures the AI uses professional terminology (e.g., "latency," "scalability," "state persistence") and maintains a helpful, educational tone.

> **Instruction:** "You are a Senior System Architect and Educator. Your goal is to help the user design a robust system while explaining the 'why' behind every node. Think like a YouTube technical creator: clear, engaging, and visual."

---

## 2. The Operational Loop (The "Confirmation" Guardrail)

To meet your requirement of "step-by-step confirmation," the system prompt must explicitly forbid the AI from building the whole design at once.

**The Loop Logic:**

1. **Analyze:** Understand the user's request.
2. **Propose:** Suggest **one** node or connection.
3. **Wait:** Explicitly stop generating text and wait for the user to confirm via the UI.
4. **Iterate:** Once confirmed, move to the next logical step.

---

## 3. Tool Definition & Constraints

The prompt instructs the AI on how to use the specific functions you've coded in Next.js.

* **`propose_node`**: Used to suggest a new element.
* **`propose_connection`**: Used to suggest a relationship between existing elements.
* **`generate_icon`**: Triggers Nano Banana for the 3D asset.

**Constraint:** "Never call `propose_connection` before the two nodes involved have been confirmed and committed to the state."

---

## 4. The Master System Prompt Template

You can copy and adapt this block for your API configuration.

```markdown
## Role
You are the "Architect AI," a specialist in system design and interactive visualization. 

## Objectives
1. Build software architecture diagrams step-by-step.
2. Use professional, educational language similar to high-end tech YouTube channels.
3. Always wait for user confirmation before finalizing a design element.

## Rules of Engagement
- **One Step at a Time:** You must only propose one new node or one new connection per turn. 
- **The Protocol:** - First, explain the reasoning for the node.
   - Second, call the `propose_node` tool.
   - Third, ask the user: "Should we add this to the design?"
- **Visual Style:** When describing icons, use keywords like "3D," "Glass-morphism," "Neon accents," and "Minimalist."
- **Spatial Reasoning:** Use relative positioning. If a database is added for a backend, suggest placing it "below" or "to the right" of the service.

## Tool Usage
- If the user wants to start, call `propose_node` for the entry point (e.g., Client/User).
- If a node is confirmed, suggest the next logical component (e.g., Load Balancer).
- After two related nodes exist, use `propose_connection` to draw the animated line.

```

---

## 5. Handling "Context Window" Memory

As the design grows, the system prompt must remind Gemini to keep track of the current "Schema State."

**State Tracking:** The AI needs to remember what is already on the canvas.

* *Incorrect AI behavior:* Proposing a "Database" when one already exists.
* *Solution:* In the **User Prompt** (the message sent alongside the system prompt), you must always include a JSON snippet of the current confirmed design:
`"Current State: { nodes: 3, edges: 2, components: ['Auth', 'Gateway', 'Lambda'] }"`

---

## 6. The "YouTube" Tone & Style Guidelines

To ensure the animations feel earned, the system prompt should encourage "pacing."

* **Directives:**
* "Use transition phrases like 'Now, let's look at the data flow' or 'This is where the magic happens.'"
* "When a connection is made, describe the data being transferred (e.g., 'An encrypted JWT token travels from Auth to the API')."



---
To make the "step-by-step" build work, you need to provide Gemini 3 with a specific **Function Declaration**. This is how the AI moves from "talking about a design" to actually "sending data" to your Next.js frontend.

In the Gemini 3 SDK, these are called **Tools**. Here is the technical documentation for the two primary functions you will need to implement.

---

## 1. Tool 1: `propose_node`

This tool is called when Gemini wants to introduce a new component. It doesn't build it immediately; it sends the data so your frontend can show the "Draft" version for user confirmation.

### **JSON Schema Definition**

```json
{
  "name": "propose_node",
  "description": "Proposes a new architectural element to be added to the diagram.",
  "parameters": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Unique identifier (e.g., 'auth_service')." },
      "label": { "type": "string", "description": "Display name (e.g., 'AWS Cognito')." },
      "type": { 
        "type": "string", 
        "enum": ["client", "server", "database", "gateway", "cache", "queue"],
        "description": "The category of the node which dictates the icon."
      },
      "position_hint": {
        "type": "string",
        "enum": ["left", "right", "above", "below"],
        "description": "Where to place this relative to the previous node."
      },
      "animation_style": {
        "type": "string",
        "enum": ["fade_in", "slide_up", "pop_in"],
        "description": "The 'YouTube style' entrance animation to use."
      }
    },
    "required": ["id", "label", "type", "position_hint"]
  }
}

```

---

## 2. Tool 2: `propose_connection`

Once two nodes are "Committed," Gemini uses this tool to draw the animated line between them.

### **JSON Schema Definition**

```json
{
  "name": "propose_connection",
  "description": "Proposes an animated data flow line between two existing nodes.",
  "parameters": {
    "type": "object",
    "properties": {
      "from_id": { "type": "string", "description": "The source node ID." },
      "to_id": { "type": "string", "description": "The target node ID." },
      "label": { "type": "string", "description": "Text to display on the line (e.g., 'HTTPS/JSON')." },
      "is_bidirectional": { "type": "boolean", "description": "If true, shows arrows on both ends." },
      "line_style": { 
        "type": "string", 
        "enum": ["solid", "dashed", "pulsing"],
        "description": "The visual behavior of the animated line."
      }
    },
    "required": ["from_id", "to_id", "label"]
  }
}

```

---

## 3. How to implement the "Wait for Confirmation"

This is the trickiest part. You cannot simply let the AI keep talking after it calls a tool. You must handle the **Tool Call Response**.

1. **AI Action:** Gemini sends a `functionCall` for `propose_node`.
2. **Frontend Logic:**
* Stop the AI's text stream.
* Render the "Ghost Node" on the canvas.
* Display a "Confirm ✅" and "Reject ❌" button in the chat.


3. **User Action:** User clicks "Confirm."
4. **Backend Response:** Your Next.js app sends a **Tool Response** back to Gemini:
```json
{
  "functionResponse": {
    "name": "propose_node",
    "response": { "status": "confirmed", "message": "Node has been successfully built." }
  }
}

```


5. **AI Resumes:** Gemini receives this, knows the node is now "Solid," and proceeds to suggest the next step or the next connection.

---

## 4. The "Style" Map (For YouTube Aesthetics)

In your Next.js code, you should create a mapping object that translates the `type` and `animation_style` from the tool into Framer Motion props.

| Type | Default Icon | Entrance Animation |
| --- | --- | --- |
| **database** | `Database` (Lucide) | `slide_up` (y: 50 -> 0) |
| **gateway** | `ShieldCheck` | `fade_in` (scale: 0.8 -> 1) |
| **client** | `Smartphone` | `pop_in` (bounce effect) |

---

## 5. Summary of the Integration Code (Next.js)

```typescript
// Inside your Chat logic
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash",
  tools: [{ functionDeclarations: [proposeNodeSchema, proposeConnectionSchema] }],
});

const chat = model.startChat();

// When processing the result:
if (response.functionCalls) {
  const call = response.functionCalls[0];
  // 1. Update UI state to show 'Proposed' element
  setProposedElement(call.args);
  // 2. Wait for User interaction before calling chat.sendMessage() again
}

```

