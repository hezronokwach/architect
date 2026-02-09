# Architect AI: Codebase Document

## 🏗️ Technical Architecture

Architect AI is a React-based application built with TypeScript and Vite. It follows a modular architecture that separates UI components, layout logic, and AI service integration.

## 📂 Directory Structure

### `components/`
- **`DiagramCanvas.tsx`**: The core interactive workspace using React Flow. It handles node rendering, connections, and layout updates.
- **`ChatInterface.tsx`**: The primary communication hub. Manages user messages, AI tool-call proposals, and the manual/auto-pilot switch.
- **`CinematicReplay.tsx`**: A specialized overlay that converts the list of historical architecture changes into a narrative playback.
- **`ArchitectNode.tsx` & `ArchitectEdge.tsx`**: Custom sub-components for React Flow, styled with premium dark-mode glassmorphism.

### `services/`
- **`geminiService.ts`**: Handles all communication with the Gemini Flash 2.0 API, including streaming responses and structured tool outputs.
- **`layoutService.ts`**: Uses the Dagre engine to calculate optimal node positioning, ensuring a clean, non-overlapping flow (typically Left-to-Right).
- **`videoService.ts`**: (Legacy/Refined) Manages the generation of scripts and prompts for external media generation based on the architectural narrative.
- **`firebase.ts`**: Configuration and initialization for Firestore persistence.

### `constants.ts`
- Contains the **System Instruction**, which defines the AI's "Balanced Professional Mode" and the strict "One-by-One" operational loop.

## 🔄 Key Operational Flows

### 1. The Design Loop
1. **User Input**: A natural language request (e.g., "Build a payment system").
2. **Analysis**: Gemini analyzes the request through the lens of "Balanced Professional" standards.
3. **Proposal**: The AI calls `propose_node` or `propose_connection`.
4. **Confirmation**: The user accepts/rejects (Manual Mode) or the system auto-commits (Auto-Pilot).
5. **Layout & Sync**: `layoutService` updates the canvas, and changes are synced to Firestore.

### 2. Cinematic Workflow
- The app tracks every snapshot of the architecture.
- `CinematicReplay` reads this history and uses an AI-generated script to provide a step-by-step walkthrough, highlighting nodes and explaining their roles in real-time.

## 💅 Styling Strategy
- **Vanilla CSS**: Used for maximum performance and fine-grained control over gradients and holographic animations.
- **CSS Variables**: Centralized in `index.css` for easy theme management.
- **Glassmorphism**: Achieved using `backdrop-filter` and transparency for a modern, high-tech feel.
