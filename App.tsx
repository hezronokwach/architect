import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from './services/firebase';
import DiagramCanvas from './components/DiagramCanvas';
import ChatInterface from './components/ChatInterface';
import { sendMessageToGemini, sendToolResponseToGemini } from './services/geminiService';
import { generateCinematicVideo, CinematicResult } from './services/videoService';
import CinematicReplay from './components/CinematicReplay';
import { SystemNode, SystemEdge, ChatMessage, Proposal, Position } from './types';
import { Play, Download, Loader2, Video, Film, Trash2, X, MessageSquare, ChevronRight, ChevronLeft, Undo2, Redo2 } from 'lucide-react';

// Use a more robust ID generator to prevent collisions (especially during real-time sync)
const generateId = () => `id_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;

// Utility to clean markdown formatting from AI responses
const cleanMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold **text**
    .replace(/\*(.+?)\*/g, '$1')      // Remove italic *text*
    .replace(/`(.+?)`/g, '$1')        // Remove code `text`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links [text](url)
    .replace(/#{1,6}\s/g, '')         // Remove headers
    .trim();
};
const SESSION_ID = 'architect_hackathon_session';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<SystemNode[]>([]);
  const [edges, setEdges] = useState<SystemEdge[]>([]);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello! I'm your AI System Architect. Describe what you want to build, and I'll design it step-by-step."
    }
  ]);

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState('');
  const [showCinematicReplay, setShowCinematicReplay] = useState(false);
  const [cinematicScript, setCinematicScript] = useState<Record<string, string>>({});
  const [veoPrompt, setVeoPrompt] = useState<string>('');
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [lastToolCallId, setLastToolCallId] = useState<string | null>(null);
  const [lastToolName, setLastToolName] = useState<string | null>(null);

  // Auto Mode State
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(1); // 0.5x to 3x
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // History for Undo/Redo
  const [history, setHistory] = useState<{ nodes: SystemNode[], edges: SystemEdge[], messages: ChatMessage[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: SystemNode[], edges: SystemEdge[], messages: ChatMessage[] }[]>([]);

  const addToHistory = useCallback((currentNodes: SystemNode[], currentEdges: SystemEdge[], currentMessages: ChatMessage[]) => {
    setHistory(prev => [...prev, { nodes: currentNodes, edges: currentEdges, messages: currentMessages }].slice(-20)); // Keep last 20 steps
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [...prev, { nodes, edges, messages }]);
    setHistory(prev => prev.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setMessages(previous.messages);
    persistToFirestore(previous.nodes, previous.edges, previous.messages);
  }, [history, nodes, edges, messages]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    setHistory(prev => [...prev, { nodes, edges, messages }]);
    setFuture(prev => prev.slice(0, -1));
    setNodes(next.nodes);
    setEdges(next.edges);
    setMessages(next.messages);
    persistToFirestore(next.nodes, next.edges, next.messages);
  }, [future, nodes, edges, messages]);

  // Firestore Real-time Sync
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sessions", SESSION_ID), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        if (data.messages) setMessages(data.messages);
      }
    });
    return () => unsub();
  }, []);

  const persistToFirestore = async (newNodes: SystemNode[], newEdges: SystemEdge[], newMessages: ChatMessage[]) => {
    try {
      await setDoc(doc(db, "sessions", SESSION_ID), {
        nodes: newNodes,
        edges: newEdges,
        messages: newMessages,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Firestore Save Error:", error);
    }
  };

  const processGeminiResponse = useCallback(async (response: any, currentNodes: SystemNode[], currentEdges: SystemEdge[], currentMessages: ChatMessage[]) => {
    const rawContent = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('') || '';

    const toolCalls = response.functionCalls;

    let updatedMessages = currentMessages;
    if (rawContent) {
      // Clean markdown formatting from AI responses
      const content = cleanMarkdown(rawContent);
      updatedMessages = [...currentMessages, { id: generateId(), role: 'model', content }];
      setMessages(updatedMessages);
      await persistToFirestore(currentNodes, currentEdges, updatedMessages);
    }

    if (toolCalls && toolCalls.length > 0) {
      const call = toolCalls[0];
      setLastToolCallId(call.id || 'unknown');
      setLastToolName(call.name);

      if (call.name === 'propose_node') {
        const args = call.args as any;
        setActiveProposal({
          type: 'node',
          data: { ...args, position: { x: 0, y: 0 }, status: 'PROPOSED' }
        });
      } else if (call.name === 'propose_connection') {
        const args = call.args as any;
        setActiveProposal({
          type: 'connection',
          data: {
            id: generateId(),
            fromId: args.from_id,
            toId: args.to_id,
            label: args.label,
            status: 'PROPOSED'
          }
        });
      }
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    try {
      await persistToFirestore(nodes, edges, updatedMessages);
      const context = JSON.stringify({
        nodes: nodes.map(n => ({ id: n.id, label: n.label })),
        edges: edges.map(e => ({ from: e.fromId, to: e.toId }))
      });
      const response = await sendMessageToGemini(userMsg.content, context);
      processGeminiResponse(response, nodes, edges, updatedMessages);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { id: generateId(), role: 'model', content: "Capacity reached. Please try again." }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleConfirm = useCallback(async () => {
    if (!activeProposal) return;

    addToHistory(nodes, edges, messages);

    let updatedNodes = nodes;
    let updatedEdges = edges;

    if (activeProposal.type === 'node') {
      updatedNodes = [...nodes, { ...activeProposal.data, status: 'COMMITTED' }];
      setNodes(updatedNodes);
    } else {
      updatedEdges = [...edges, { ...activeProposal.data, status: 'COMMITTED' }];
      setEdges(updatedEdges);
    }

    await persistToFirestore(updatedNodes, updatedEdges, messages);

    const tName = lastToolName;
    const tId = lastToolCallId;
    setActiveProposal(null);
    setIsStreaming(true);

    if (tName && tId) {
      try {
        const response = await sendToolResponseToGemini(tName, tId, 'confirmed');
        processGeminiResponse(response, updatedNodes, updatedEdges, messages);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsStreaming(false);
      }
    }
  }, [activeProposal, nodes, edges, messages, lastToolName, lastToolCallId, processGeminiResponse, addToHistory]);

  // Auto Mode: Auto-confirm proposals after delay
  useEffect(() => {
    if (isAutoMode && activeProposal && !isStreaming) {
      const delay = 2000 / autoSpeed; // Base delay of 2s, adjusted by speed
      autoTimerRef.current = setTimeout(() => {
        handleConfirm();
      }, delay);
    }

    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [isAutoMode, activeProposal, isStreaming, autoSpeed, handleConfirm]);

  const handleReject = async () => {
    const tName = lastToolName;
    const tId = lastToolCallId;
    setActiveProposal(null);
    setIsStreaming(true);
    if (tName && tId) {
      try {
        const response = await sendToolResponseToGemini(tName, tId, 'rejected');
        processGeminiResponse(response, nodes, edges, messages);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsStreaming(false);
      }
    }
  };

  const handleCinematicView = async () => {
    console.log("Frontend: handleCinematicView triggered.");
    if (nodes.length === 0) {
      console.warn("Frontend: No nodes to render. Aborting.");
      return;
    }

    setIsGeneratingVideo(true);
    setVideoStatus('Analyzing Design Sequence...');

    try {
      const canvas = document.querySelector('.react-flow__renderer') as HTMLElement;
      if (!canvas) {
        console.error("Frontend: .react-flow__renderer NOT FOUND in DOM");
        throw new Error("Canvas not found");
      }

      console.log("Frontend: Capturing snapshot for Gemini context...");
      const snapshot = await html2canvas(canvas, {
        backgroundColor: '#0f172a',
        scale: 2,
      });
      const base64Image = snapshot.toDataURL('image/png');

      const result: CinematicResult | null = await generateCinematicVideo(
        base64Image,
        nodes,
        edges
      );

      if (result && result.script) {
        console.log("Frontend: VideoService returned result with script.");
        setVideoStatus('Cinematic Protocol Ready!');
        setCinematicScript(result.script);
        setVeoPrompt(result.veoPrompt || '');
        setShowCinematicReplay(true);
      } else {
        console.error("Frontend: VideoService returned NULL/Empty result or no script.");
        setVideoStatus('Failed to generate cinematic script.');
      }
    } catch (error) {
      console.error("Frontend: Error generating cinematic video:", error);
      setVideoStatus('Error generating cinematic video.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleExportImage = async () => {
    const canvas = document.querySelector('.react-flow__renderer') as HTMLElement;
    if (!canvas) return;

    try {
      const snapshot = await html2canvas(canvas, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      const link = document.createElement('a');
      link.href = snapshot.toDataURL('image/png');
      link.download = `architect-design-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleClearDesign = async () => {
    if (window.confirm("Are you sure you want to clear the entire design?")) {
      addToHistory(nodes, edges, messages);
      const initialMessages: ChatMessage[] = [{
        id: 'welcome',
        role: 'model',
        content: "Hello! I'm your AI System Architect. Describe what you want to build, and I'll design it step-by-step."
      }];
      setNodes([]);
      setEdges([]);
      setMessages(initialMessages);
      await persistToFirestore([], [], initialMessages);
    }
  };

  const handleExportChat = () => {
    // ... (logic remains same)
  };

  const handleNewChat = async () => {
    if (window.confirm("Start a new chat? Current design will be saved to Firestore.")) {
      addToHistory(nodes, edges, messages);
      const initialMessages: ChatMessage[] = [{
        id: 'welcome',
        role: 'model',
        content: "Hello! I'm your AI System Architect. Describe what you want to build, and I'll design it step-by-step."
      }];
      setNodes([]);
      setEdges([]);
      setMessages(initialMessages);
      setActiveProposal(null);
      await persistToFirestore([], [], initialMessages);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-white font-sans">
      <div className="flex-1 relative" ref={canvasRef}>
        <DiagramCanvas
          nodes={nodes}
          edges={edges}
          proposedNode={activeProposal?.type === 'node' ? activeProposal.data : null}
          proposedEdge={activeProposal?.type === 'connection' ? activeProposal.data : null}
        />

        {/* Director's Monitor Overlay */}
        {isGeneratingVideo && (
          <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="relative">
              <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
              <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-blue-500/50 flex items-center justify-center relative shadow-2xl">
                <Video className="w-10 h-10 text-blue-400 animate-bounce" />
                <div className="absolute top-0 right-0 p-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                </div>
              </div>
            </div>

            <div className="mt-8 text-center space-y-2">
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-3">
                <Film className="w-5 h-5 text-purple-400" />
                DIRECTOR'S MONITOR
              </h3>
              <p className="text-blue-300 font-mono text-xs tracking-widest uppercase">
                {videoStatus}
              </p>
              <div className="w-48 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-shimmer" style={{ width: '100%', backgroundSize: '200% 100%' }} />
              </div>
            </div>
          </div>
        )}

        {/* Cinematic Replay Engine Overlay */}
        {showCinematicReplay && (
          <CinematicReplay
            nodes={nodes}
            edges={edges}
            script={cinematicScript}
            veoPrompt={veoPrompt}
            onClose={() => setShowCinematicReplay(false)}
          />
        )}

        {/* Floating Dock Toolbar */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-4 transition-all hover:scale-105 duration-300">
            <div className="flex gap-2 border-r border-slate-700/50 pr-4">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`p-2 rounded-xl transition-all ${history.length === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-blue-300 hover:text-white hover:bg-white/10'}`}
                title="Undo"
              >
                <Undo2 size={20} />
              </button>
              <button
                onClick={handleRedo}
                disabled={future.length === 0}
                className={`p-2 rounded-xl transition-all ${future.length === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-blue-300 hover:text-white hover:bg-white/10'}`}
                title="Redo"
              >
                <Redo2 size={20} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClearDesign}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                title="Reset Design"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={handleExportImage}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="Export Image"
              >
                <Download size={20} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-700/50 mx-2" />

            <button
              onClick={handleCinematicView}
              disabled={isGeneratingVideo || nodes.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold tracking-wide transition-all ${isGeneratingVideo || nodes.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40'
                }`}
            >
              {isGeneratingVideo ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
              <span>CINEMATIC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Chat Panel */}
      <motion.div
        animate={{ width: isChatCollapsed ? 0 : 420 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 glass-panel border-l border-white/5 bg-slate-900/80 backdrop-blur-3xl"
      >
        <button
          onClick={() => setIsChatCollapsed(!isChatCollapsed)}
          className={`absolute top-1/2 -left-3 transform -translate-y-1/2 w-6 h-12 bg-slate-800 border-y border-l border-white/10 rounded-l-lg text-blue-300 hover:text-white transition-all shadow-xl z-50 flex items-center justify-center hover:w-8 hover:-left-8 duration-200`}
        >
          {isChatCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {!isChatCollapsed && (
          <div className="w-[420px] h-full overflow-hidden">
            <ChatInterface
              messages={messages}
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isStreaming={isStreaming}
              activeProposal={activeProposal}
              onConfirmProposal={handleConfirm}
              onRejectProposal={handleReject}
              isAutoMode={isAutoMode}
              setIsAutoMode={setIsAutoMode}
              autoSpeed={autoSpeed}
              setAutoSpeed={setAutoSpeed}
              onExportChat={handleExportChat}
              onNewChat={handleNewChat}
              canUndo={history.length > 0}
              canRedo={future.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default App;
