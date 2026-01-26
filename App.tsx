import React, { useState } from 'react';
import DiagramCanvas from './components/DiagramCanvas';
import ChatInterface from './components/ChatInterface';
import { sendMessageToGemini, sendToolResponseToGemini } from './services/geminiService';
import { SystemNode, SystemEdge, ChatMessage, Proposal, Position } from './types';
import { Play, Download } from 'lucide-react';

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
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [lastToolCallId, setLastToolCallId] = useState<string | null>(null);
  const [lastToolName, setLastToolName] = useState<string | null>(null);

  const calculatePosition = (hint: string, relativeToId?: string): Position => {
    // Anchor node selection
    const anchor = nodes.find(n => n.id === relativeToId) || nodes[nodes.length - 1];
    if (!anchor) return { x: 50, y: 150 };

    const offsetWidth = 220;
    const offsetHeight = 180;
    let target = { x: anchor.position.x, y: anchor.position.y };

    switch (hint) {
      case 'right': target.x += offsetWidth; break;
      case 'left': target.x -= offsetWidth; break;
      case 'below': target.y += offsetHeight; break;
      case 'above': target.y -= offsetHeight; break;
      case 'start': target = { x: 50, y: 150 }; break;
    }

    // Collision detection: If someone is already there, nudge it
    let collision = true;
    let attempts = 0;
    while (collision && attempts < 5) {
      const isOccupied = nodes.some(n => Math.abs(n.position.x - target.x) < 50 && Math.abs(n.position.y - target.y) < 50);
      if (isOccupied) {
        target.y += 40; // Nudge down
        attempts++;
      } else {
        collision = false;
      }
    }

    return target;
  };

  const processGeminiResponse = (response: any) => {
    // Fix: Manually extract text parts to avoid the SDK warning about function calls
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
        const pos = calculatePosition(args.position_hint, args.relative_to_id);
        setActiveProposal({
          type: 'node',
          data: { ...args, position: pos, status: 'PROPOSED' }
        });
      } else if (call.name === 'propose_connection') {
        const args = call.args as any;
        setActiveProposal({
          type: 'connection',
          data: { ...args, id: generateId(), status: 'PROPOSED' }
        });
      }
    }
  };

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-white font-sans">
      <div className="flex-1 relative">
        <DiagramCanvas 
          nodes={nodes} 
          edges={edges} 
          proposedNode={activeProposal?.type === 'node' ? activeProposal.data : null}
          proposedEdge={activeProposal?.type === 'connection' ? activeProposal.data : null}
        />
        <div className="absolute top-4 right-4 flex gap-2">
            <button className="bg-slate-800/80 backdrop-blur border border-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all">
                <Download size={16} /> Export
            </button>
            <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-lg shadow-blue-500/20 transition-all">
                <Play size={16} /> Cinematic View
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
