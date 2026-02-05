import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Check, X, Loader2, Zap, Download, Plus, Undo2, Redo2 } from 'lucide-react';
import { ChatMessage, Proposal } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  activeProposal: Proposal | null;
  onConfirmProposal: () => void;
  onRejectProposal: () => void;
  isAutoMode: boolean;
  setIsAutoMode: (value: boolean) => void;
  autoSpeed: number;
  setAutoSpeed: (value: number) => void;
  onExportChat: () => void;
  onNewChat: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  input,
  setInput,
  onSend,
  isStreaming,
  activeProposal,
  onConfirmProposal,
  onRejectProposal,
  isAutoMode,
  setIsAutoMode,
  autoSpeed,
  setAutoSpeed,
  onExportChat,
  onNewChat,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeProposal]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Bot className="text-blue-400" /> ArchitectAI
            </h2>
            <p className="text-xs text-slate-400">Gemini 3 Powered • System Designer</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors ${!canUndo ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Undo"
            >
              <Undo2 size={16} className="text-slate-300" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors ${!canRedo ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Redo"
            >
              <Redo2 size={16} className="text-slate-300" />
            </button>
            <div className="w-1 h-6 bg-slate-700 mx-1 self-center" />
            <button
              onClick={onNewChat}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="New Chat"
            >
              <Plus size={16} className="text-slate-300" />
            </button>
            <button
              onClick={onExportChat}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Export Chat"
            >
              <Download size={16} className="text-slate-300" />
            </button>
          </div>
        </div>

        {/* Auto Mode Toggle */}
        <div className="flex items-center justify-between gap-3 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${isAutoMode ? 'text-yellow-400' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold text-slate-300">Auto Mode</span>
          </div>
          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isAutoMode ? 'bg-yellow-500' : 'bg-slate-600'
              }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAutoMode ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
          </button>
        </div>

        {/* Speed Control */}
        {isAutoMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Speed: {autoSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={autoSpeed}
              onChange={(e) => setAutoSpeed(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
          </motion.div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && <span className="text-[10px] text-slate-500 uppercase font-semibold">You</span>}
            {msg.role === 'model' && <span className="text-[10px] text-slate-500 uppercase font-semibold">Architect</span>}
          </motion.div>
        ))}

        {activeProposal && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-xl mx-4 mt-2"
          >
            <h3 className="text-yellow-400 text-xs font-bold uppercase mb-2 tracking-wider">
              {activeProposal.type === 'node' ? 'New Component Proposed' : 'New Connection Proposed'}
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              I want to add <strong className="text-white">{activeProposal.data.label}</strong> to the design.
            </p>
            {!isAutoMode && (
              <div className="flex gap-2">
                <button
                  onClick={onConfirmProposal}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Check size={16} /> Confirm
                </button>
                <button
                  onClick={onRejectProposal}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <X size={16} /> Reject
                </button>
              </div>
            )}
            {isAutoMode && (
              <div className="flex items-center justify-center gap-2 text-yellow-400 text-xs">
                <Loader2 className="animate-spin w-4 h-4" />
                <span>Auto-confirming in {(2 / autoSpeed).toFixed(1)}s...</span>
              </div>
            )}
          </motion.div>
        )}

        {isStreaming && !activeProposal && (
          <div className="flex items-center gap-2 text-slate-500 text-sm ml-2">
            <Loader2 className="animate-spin w-4 h-4" /> Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800/50 border-t border-slate-700">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming || (activeProposal !== null && isAutoMode)}
            placeholder={
              activeProposal && !isAutoMode
                ? "Ask questions or request changes before confirming..."
                : activeProposal && isAutoMode
                  ? "Auto Mode active..."
                  : "Describe a system (e.g., 'Build a scalable e-commerce backend')..."
            }
            className="w-full bg-slate-900 text-white rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700 resize-none h-14 disabled:opacity-50"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isStreaming || (activeProposal !== null && isAutoMode)}
            className="absolute right-2 top-2 p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
