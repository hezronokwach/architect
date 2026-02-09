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
    <div className="flex flex-col h-full bg-slate-900/50">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur space-y-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-white tracking-wide">
              <img src="/logo.svg" alt="Architect Logo" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> ARCHITECT<span className="text-cyan-400">.AI</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              SYSTEM_ONLINE
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2 bg-slate-800/50 border border-white/5 hover:bg-white/5 hover:border-cyan-500/30 rounded-lg transition-all ${!canUndo ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Undo"
            >
              <Undo2 size={16} className="text-cyan-300/70" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-2 bg-slate-800/50 border border-white/5 hover:bg-white/5 hover:border-cyan-500/30 rounded-lg transition-all ${!canRedo ? 'opacity-30 cursor-not-allowed' : ''}`}
              title="Redo"
            >
              <Redo2 size={16} className="text-cyan-300/70" />
            </button>
            <div className="w-[1px] h-6 bg-white/10 mx-1 self-center" />
            <button
              onClick={onNewChat}
              className="p-2 bg-slate-800/50 border border-white/5 hover:bg-white/5 hover:border-green-500/30 rounded-lg transition-all group"
              title="New Chat"
            >
              <Plus size={16} className="text-green-400/70 group-hover:text-green-400" />
            </button>
            <button
              onClick={onExportChat}
              className="p-2 bg-slate-800/50 border border-white/5 hover:bg-white/5 hover:border-purple-500/30 rounded-lg transition-all group"
              title="Export Chat"
            >
              <Download size={16} className="text-purple-400/70 group-hover:text-purple-400" />
            </button>
          </div>
        </div>

        {/* Auto Mode Toggle */}
        <div className="flex items-center justify-between gap-3 p-2 bg-slate-800/40 rounded-lg border border-white/5">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${isAutoMode ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-slate-600'}`} />
            <span className={`text-xs font-mono font-semibold tracking-wider ${isAutoMode ? 'text-yellow-400' : 'text-slate-500'}`}>
              AUTO_PILOT
            </span>
          </div>
          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${isAutoMode ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-slate-700/50 border border-white/5'
              }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-md ${isAutoMode ? 'translate-x-5 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'translate-x-0 bg-slate-400'
                }`}
            />
          </button>
        </div>

        {/* Speed Control */}
        {isAutoMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 pt-1"
          >
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span>Latency</span>
              <span className="text-yellow-400">{(2000 / autoSpeed).toFixed(0)}ms</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={autoSpeed}
              onChange={(e) => setAutoSpeed(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
          </motion.div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-xl text-sm leading-relaxed border backdrop-blur-md relative ${msg.role === 'user'
                ? 'bg-blue-600/10 border-blue-500/30 text-blue-100 rounded-tr-none shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                : 'bg-slate-800/40 border-slate-700 text-slate-200 rounded-tl-none shadow-[0_0_15px_rgba(0,0,0,0.2)]'
                }`}
            >
              {/* Decorative corner accents */}
              <div className={`absolute w-2 h-2 border-t border-r ${msg.role === 'user' ? 'border-blue-400 -top-[1px] -right-[1px]' : 'border-slate-500 -top-[1px] -left-[1px]'}`} />
              <div className={`absolute w-2 h-2 border-b border-l ${msg.role === 'user' ? 'border-blue-400 -bottom-[1px] -left-[1px]' : 'border-slate-500 -bottom-[1px] -right-[1px]'}`} />

              {msg.content}
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest opacity-60">
              {msg.role === 'user' ? 'CMD_INPUT' : 'SYS_RESPONSE'}
            </span>
          </motion.div>
        ))}

        {activeProposal && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-yellow-950/30 border border-yellow-500/30 p-5 rounded-lg mx-2 mt-4 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <Zap size={64} className="text-yellow-500" />
            </div>

            <div className="relative z-10">
              <h3 className="text-yellow-400 text-xs font-bold font-mono uppercase mb-3 tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" />
                {activeProposal.type === 'node' ? 'COMPONENT_PROPOSAL' : 'CONNECTION_PROPOSAL'}
              </h3>
              <p className="text-sm text-slate-300 mb-5 font-light">
                Confirm integration of <strong className="text-yellow-200 drop-shadow-[0_0_5px_rgba(253,224,71,0.5)]">{activeProposal.data.label}</strong> into architecture?
              </p>
              {!isAutoMode && (
                <div className="flex gap-3">
                  <button
                    onClick={onConfirmProposal}
                    className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/50 hover:border-green-400 text-green-400 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_10px_rgba(34,197,94,0.1)] hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                  >
                    <Check size={14} /> [ACCEPT]
                  </button>
                  <button
                    onClick={onRejectProposal}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 hover:border-red-400 text-red-400 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  >
                    <X size={14} /> [DENY]
                  </button>
                </div>
              )}
              {isAutoMode && (
                <div className="flex items-center justify-center gap-2 text-yellow-400/80 text-xs font-mono">
                  <Loader2 className="animate-spin w-3 h-3" />
                  <span>AUTO_COMMIT_SEQUENCE_INITIATED... {(2 / autoSpeed).toFixed(1)}s</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {isStreaming && !activeProposal && (
          <div className="flex items-center gap-2 text-cyan-500/60 text-xs font-mono ml-2 animate-pulse">
            <Bot className="w-3 h-3" /> PROCESSING_LOGIC...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-900/50 backdrop-blur border-t border-white/5 relative">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming || (activeProposal !== null && isAutoMode)}
            placeholder={
              activeProposal && !isAutoMode
                ? "> Query proposal or request changes..."
                : activeProposal && isAutoMode
                  ? "> Auto-Pilot Active..."
                  : "> Initialize system parameters..."
            }
            className="w-full bg-black/40 text-blue-100 rounded-lg pl-4 pr-12 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50 border border-slate-700 group-hover:border-slate-600 resize-none h-14 disabled:opacity-30 placeholder:text-slate-600 transition-all"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isStreaming || (activeProposal !== null && isAutoMode)}
            className="absolute right-2 top-2 p-2 bg-cyan-600/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500 hover:text-white disabled:opacity-0 disabled:cursor-default transition-all duration-300"
          >
            <Send size={16} />
          </button>

          {/* Decorative glowing lines */}
          <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
