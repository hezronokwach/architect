import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import {
    Database, Server, Smartphone, Cloud, ShieldCheck, Layers, Cpu, Box,
    Globe, Lock, Terminal, Activity, Zap, HardDrive, Share2, Search,
    User, Settings, Mail, Bell, CreditCard, ShoppingCart
} from 'lucide-react';
import { NodeType } from '../types';

const getNodeIcon = (type: string, label: string = '') => {
    const l = (label || '').toLowerCase();
    const t = (type || '').toLowerCase();

    // Specific Keyword Overrides
    if (l.includes('postgres') || l.includes('sql') || l.includes('mongo')) return <Database className="w-6 h-6 text-cyan-400" />;
    if (l.includes('redis') || l.includes('memcached')) return <Zap className="w-6 h-6 text-pink-400" />;
    if (l.includes('auth') || l.includes('security') || l.includes('login')) return <Lock className="w-6 h-6 text-emerald-400" />;
    if (l.includes('s3') || l.includes('storage') || l.includes('bucket')) return <HardDrive className="w-6 h-6 text-amber-400" />;
    if (l.includes('search') || l.includes('elastic')) return <Search className="w-6 h-6 text-indigo-400" />;
    if (l.includes('user') || l.includes('profile')) return <User className="w-6 h-6 text-blue-300" />;
    if (l.includes('payment') || l.includes('stripe')) return <CreditCard className="w-6 h-6 text-green-400" />;
    if (l.includes('cart') || l.includes('order')) return <ShoppingCart className="w-6 h-6 text-orange-400" />;
    if (l.includes('api') || l.includes('gateway')) return <Globe className="w-6 h-6 text-sky-400" />;

    switch (t) {
        case 'database': return <Database className="w-6 h-6 text-blue-400" />;
        case 'server': return <Server className="w-6 h-6 text-green-400" />;
        case 'client': return <Smartphone className="w-6 h-6 text-purple-400" />;
        case 'cloud': return <Cloud className="w-6 h-6 text-sky-300" />;
        case 'gateway': return <ShieldCheck className="w-6 h-6 text-yellow-400" />;
        case 'cache': return <Layers className="w-6 h-6 text-pink-500" />;
        case 'queue': return <Cpu className="w-6 h-6 text-orange-500" />;
        default: return <Box className="w-6 h-6 text-slate-400" />;
    }
};

const ArchitectNode = ({ data }: NodeProps) => {
    const isGhost = data.status === 'PROPOSED';
    const type = data.type as NodeType;
    const label = (data.label as string) || '';
    const isActive = !!data.isActive;
    const isDimmed = !!data.dimmed;

    return (
        <div className="relative group">
            <Handle type="target" position={Position.Left} className="w-0 h-0 opacity-0" />

            <motion.div
                initial={{ scale: 0.8, opacity: 0, filter: "blur(5px)" }}
                animate={{
                    scale: isActive ? 1.2 : 1,
                    opacity: isDimmed ? 0.4 : (isGhost ? 0.6 : 1),
                    filter: isDimmed ? "blur(2px) grayscale(50%)" : "blur(0px)",
                    boxShadow: isActive
                        ? "0 0 50px rgba(0,240,255,0.4), inset 0 0 20px rgba(0,240,255,0.2)"
                        : "0 0 20px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.05)"
                }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={`w-44 p-4 rounded-2xl backdrop-blur-3xl flex flex-col items-center gap-2 border-[1.5px] transition-all duration-300 relative overflow-hidden
          ${isActive
                        ? 'border-cyan-400 bg-cyan-950/40 z-50'
                        : isGhost
                            ? 'border-dashed border-yellow-500/30 bg-yellow-400/5'
                            : 'border-white/10 bg-slate-900/60 group-hover:border-cyan-500/50 group-hover:bg-slate-800/80'
                    }`}
            >
                {/* Holographic Scanline Effect */}
                {isActive && (
                    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-2xl opacity-30">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent w-full h-[50%] animate-scanline" />
                    </div>
                )}

                <div className={`p-3 rounded-full transition-all duration-500 relative ${isGhost ? 'bg-yellow-400/10' : 'bg-slate-950 border border-white/5 shadow-inner group-hover:scale-110 group-hover:border-cyan-500/30'
                    }`}>
                    <div className="relative z-10">{getNodeIcon(type, label)}</div>
                    {isActive && <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md animate-pulse" />}
                </div>

                <div className="flex flex-col items-center w-full">
                    <span className="text-[14px] font-bold text-white tracking-wide text-center font-mono leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {label}
                    </span>

                    {isActive ? (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-1 mt-1"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                            <span className="text-[9px] text-cyan-300 font-bold uppercase tracking-widest font-mono">
                                ACTIVE_NODE
                            </span>
                        </motion.div>
                    ) : (
                        <span className="text-[10px] text-slate-400 text-center leading-tight line-clamp-2 px-1 opacity-70 group-hover:opacity-100 transition-opacity mt-1 font-sans">
                            {data.description as string}
                        </span>
                    )}
                </div>

                {!isGhost && !isActive && (
                    <>
                        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/5 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />
                    </>
                )}
            </motion.div>

            <Handle type="source" position={Position.Right} className="w-0 h-0 opacity-0" />
        </div>
    );
};

export default memo(ArchitectNode);
