<div align="center">
  <img src="./public/architect_logo.png" width="120" height="120" alt="Architect AI Logo" />
  <h1>Architect AI</h1>
  <p><strong>The Cinematic System Architect</strong></p>
  <p><em>Transforming abstract ideas into production-ready architectures with narrative intelligence.</em></p>
</div>

---

## 🚀 Overview

Architect AI is a collaborative, AI-powered whiteboard designed for senior engineers and system architects. It leverages **Gemini Flash 2.0** to design systems that bridge the gap between a simple MVP and a production-grade infrastructure, providing real-time technical explanations and cinematic visualizations of the design process.

## ✨ Key Features

- **Balanced Professional Mode**: Defaults to modern best practices (Auth, Load Balancers, CDNs, Caches) while avoiding enterprise bloat unless requested.
- **Cinematic Replay**: A narrative-driven playback mode that walks through the "Why" and "How" of your architecture as it was built.
- **Auto-Pilot Mode**: High-velocity iteration where the AI proposes and builds steps autonomously.
- **Undo/Redo & Versioning**: Complete history management with Firestore synchronization for persistence across sessions.
- **Professional Export**: Download high-resolution architecture snapshots and full technical chat history.

## 🛠️ Tech Stack

- **Intelligence**: Google Gemini Flash 2.0 (via Google AI Studio)
- **Frontend**: React, TypeScript, Vite
- **Diagramming**: React Flow (XYFlow)
- **Persistence**: Firebase Firestore
- **Styling**: Vanilla CSS (Premium Dark Theme/Glassmorphism)

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- A Google AI Studio API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd architect
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env.local` file in the root and add your Gemini and Firebase credentials:
   ```env
   # Gemini API Key
   VITE_GEMINI_API_KEY=your_gemini_api_key

   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run Locally**:
   ```bash
   npm run dev
   ```

## 📄 License
This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
