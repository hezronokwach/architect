import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from './services/firebase';
import DiagramCanvas from './components/DiagramCanvas';
import ChatInterface from './components/ChatInterface';
import { sendMessageToGemini, sendToolResponseToGemini } from './services/geminiService';
import { generateCinematicVideo, CinematicResult } from './services/videoService';
import { SystemNode, SystemEdge, ChatMessage, Proposal, Position } from './types';
import { Play, Download, Loader2, Video, Film, Trash2, X } from 'lucide-react';

// Use a more robust ID generator to prevent collisions (especially during real-time sync)
const generateId = () => `id_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
const SESSION_ID = 'architect_hackathon_session';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<SystemNode[]>([]);
  const [edges, setEdges] = useState<SystemEdge[]>([]);
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
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedNarration, setGeneratedNarration] = useState<string>('');
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [lastToolCallId, setLastToolCallId] = useState<string | null>(null);
  const [lastToolName, setLastToolName] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

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
    const content = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('') || '';

    const toolCalls = response.functionCalls;

    let updatedMessages = currentMessages;
    if (content) {
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

  const handleConfirm = async () => {
    if (!activeProposal) return;

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
  };

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
    setVideoStatus('Capturing Diagram Canvas...');

    try {
      const canvas = document.querySelector('.react-flow__renderer') as HTMLElement;
      if (!canvas) {
        console.error("Frontend: .react-flow__renderer NOT FOUND in DOM");
        throw new Error("Canvas not found");
      }

      console.log("Frontend: Capturing screenshot with html2canvas...");
      const screenshot = await html2canvas(canvas, {
        backgroundColor: '#0f172a',
        scale: 2,
      });
      console.log("Frontend: Screenshot captured successfully.");

      setVideoStatus('Sending to Veo Pipeline (Gemini 2.5)...');
      const base64Image = screenshot.toDataURL('image/png');

      console.log("Frontend: Calling VideoService...");
      const result = await generateCinematicVideo(
        base64Image,
        JSON.stringify({ nodes, edges })
      );

      if (result) {
        console.log("Frontend: VideoService returned result.");
        setVideoStatus('Cinematic Rendered Successfully!');
        setGeneratedVideoUrl(result.snapshotUrl);
        setGeneratedNarration(result.narration);
      } else {
        console.error("Frontend: VideoService returned NULL/Empty result.");
      }

      setTimeout(() => {
        console.log("Frontend: Generation flow complete. Closing Director's Monitor.");
        setIsGeneratingVideo(false);
      }, 2000);
    } catch (error) {
      console.error("Frontend: Cinematic View flow FAILED:", error);
      setVideoStatus('Error Generating Video');
      setTimeout(() => setIsGeneratingVideo(false), 3000);
    }
  };

  const handleClearDesign = async () => {
    if (window.confirm("Are you sure you want to clear the entire design?")) {
      const initialMessages: ChatMessage[] = [{
        id: 'welcome',
        role: 'model',
        content: "Hello! I'm your AI System Architect. Describe what you want to build, and I'll design it step-by-step."
      }];
      setNodes([]);
      setEdges([]);
      setMessages(initialMessages);
      await persistToFirestore([], [], initialMessages);
      window.location.reload();
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

        {/* Cinematic Video Result Modal */}
        {generatedVideoUrl && (
          <div className="absolute inset-0 z-[110] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-in zoom-in duration-500">
            <div className="max-w-5xl w-full aspect-video bg-black rounded-[2rem] overflow-hidden shadow-[0_0_120px_rgba(59,130,246,0.25)] border border-white/10 relative group">
              {/* Ken Burns Effect Engine */}
              <div className="absolute inset-0 overflow-hidden bg-slate-950">
                <motion.img
                  src={generatedVideoUrl}
                  className="w-[120%] h-[120%] object-cover opacity-80"
                  initial={{ x: "-10%", y: "-10%", scale: 1 }}
                  animate={{
                    x: ["-10%", "0%", "-5%"],
                    y: ["-10%", "-5%", "0%"],
                    scale: [1, 1.1, 1.05]
                  }}
                  transition={{
                    duration: 20,
                    ease: "linear",
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />

                {/* Cinematic Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

                {/* Tech HUD Elements */}
                <div className="absolute top-8 left-8 flex items-center gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <div className="text-[10px] font-mono text-white/40 tracking-[0.3em] uppercase">Rec: AI_ARCHITECT_VIEW // V2.5</div>
                </div>

                {/* Narrated Subtitles */}
                <div className="absolute inset-x-0 bottom-16 flex flex-col items-center px-12 text-center">
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="text-2xl font-medium text-white max-w-3xl leading-relaxed tracking-tight"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                  >
                    "{generatedNarration}"
                  </motion.p>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "80px" }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="h-1 bg-blue-500 mt-6 rounded-full"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setGeneratedVideoUrl(null);
                  setGeneratedNarration('');
                }}
                className="absolute top-8 right-8 bg-white/10 hover:bg-white/20 backdrop-blur p-4 rounded-full text-white transition-all shadow-2xl border border-white/10 z-50 group-hover:scale-110"
              >
                <X size={24} />
              </button>

              <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-white uppercase tracking-tighter">Director's Cut Complete</h4>
                  <p className="text-blue-400 text-xs font-mono uppercase tracking-widest">Architectural Insight Engine • Gemini 2.5</p>
                </div>
                <button
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-2xl pointer-events-auto"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedVideoUrl!;
                    link.download = 'architect-design-cinematic.png';
                    link.click();
                  }}
                >
                  <Download size={20} /> Save Master Render
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setGeneratedVideoUrl(null);
                setGeneratedNarration('');
              }}
              className="mt-12 text-slate-500 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
            >
              Close Cinematic Review
            </button>
          </div>
        )}

        <div className="absolute top-4 right-4 flex gap-2 z-50">
          <button
            onClick={handleClearDesign}
            className="bg-slate-800/80 backdrop-blur border border-red-500/30 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-lg shadow-red-500/5"
          >
            <Trash2 size={16} /> Reset
          </button>
          <button className="bg-slate-800/80 backdrop-blur border border-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all">
            <Download size={16} /> Export
          </button>
          <button
            onClick={handleCinematicView}
            disabled={isGeneratingVideo || nodes.length === 0}
            className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-lg shadow-blue-500/20 transition-all ${isGeneratingVideo || nodes.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
          >
            {isGeneratingVideo ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            Cinematic View
          </button>
        </div>
      </div>
      <div className="w-[400px] shadow-2xl z-10 border-l border-slate-700">
        <ChatInterface
          messages={messages}
          input={input}
          setInput={setInput}
          onSend={handleSend}
          isStreaming={isStreaming}
          activeProposal={activeProposal}
          onConfirmProposal={handleConfirm}
          onRejectProposal={handleReject}
        />
      </div>
    </div>
  );
};

export default App;
