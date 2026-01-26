import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import DiagramCanvas from './components/DiagramCanvas';
import ChatInterface from './components/ChatInterface';
import { sendMessageToGemini, sendToolResponseToGemini } from './services/geminiService';
import { generateCinematicVideo } from './services/videoService';
import { SystemNode, SystemEdge, ChatMessage, Proposal, Position } from './types';
import { Play, Download, Loader2, Video, Film } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

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
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [lastToolCallId, setLastToolCallId] = useState<string | null>(null);
  const [lastToolName, setLastToolName] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const processGeminiResponse = useCallback((response: any) => {
    const content = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('') || '';

    const toolCalls = response.functionCalls;

    if (content) {
      setMessages(prev => [...prev, { id: generateId(), role: 'model', content }]);
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
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    try {
      const context = JSON.stringify({
        nodes: nodes.map(n => ({ id: n.id, label: n.label })),
        edges: edges.map(e => ({ from: e.fromId, to: e.toId }))
      });
      const response = await sendMessageToGemini(userMsg.content, context);
      processGeminiResponse(response);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { id: generateId(), role: 'model', content: "Capacity reached. Please try again." }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleConfirm = async () => {
    if (!activeProposal) return;

    if (activeProposal.type === 'node') {
      setNodes(prev => [...prev, { ...activeProposal.data, status: 'COMMITTED' }]);
    } else {
      setEdges(prev => [...prev, { ...activeProposal.data, status: 'COMMITTED' }]);
    }

    const tName = lastToolName;
    const tId = lastToolCallId;
    setActiveProposal(null);
    setIsStreaming(true);

    if (tName && tId) {
      try {
        const response = await sendToolResponseToGemini(tName, tId, 'confirmed');
        processGeminiResponse(response);
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
        processGeminiResponse(response);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsStreaming(false);
      }
    }
  };

  const handleCinematicView = async () => {
    if (nodes.length === 0) return;

    setIsGeneratingVideo(true);
    setVideoStatus('Capturing Diagram Canvas...');

    try {
      const canvas = document.querySelector('.react-flow__renderer') as HTMLElement;
      if (!canvas) throw new Error("Canvas not found");

      const screenshot = await html2canvas(canvas, {
        backgroundColor: '#0f172a',
        scale: 2,
      });

      setVideoStatus('Sending to Veo Pipeline (Gemini 2.5)...');
      const base64Image = screenshot.toDataURL('image/png');

      await generateCinematicVideo(base64Image);

      setVideoStatus('Video Rendered Successfully!');
      setTimeout(() => setIsGeneratingVideo(false), 2000);
    } catch (error) {
      console.error("Video Gen Error:", error);
      setVideoStatus('Error Generating Video');
      setTimeout(() => setIsGeneratingVideo(false), 3000);
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

        <div className="absolute top-4 right-4 flex gap-2 z-50">
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
