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
                    scale: isActive ? 1.15 : 1,
                    opacity: isDimmed ? 0.3 : (isGhost ? 0.6 : 1),
                    filter: isDimmed ? "blur(2px)" : "blur(0px)",
                    boxShadow: isActive ? "0 0 50px rgba(59,130,246,0.6)" : "0 0 20px rgba(0,0,0,0.2)"
                }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={`w-40 p-3 rounded-xl backdrop-blur-xl flex flex-col items-center gap-1 border-2 transition-all duration-300
          ${isActive
                        ? 'border-blue-400 bg-blue-600/20'
                        : isGhost
                            ? 'border-dashed border-yellow-400/50 bg-yellow-400/5 shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                            : 'border-blue-500/30 bg-slate-800/80 shadow-[0_0_30px_rgba(59,130,246,0.15)] group-hover:border-blue-400/50'
                    }`}
            >
                <div className={`p-2.5 rounded-2xl transition-all duration-500 ${isGhost ? 'bg-yellow-400/10' : 'bg-slate-900 shadow-inner group-hover:scale-110'}`}>
                    {getNodeIcon(type, label)}
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[13px] font-bold text-white tracking-wide text-center">
                        {label}
                    </span>
                    {isActive ? (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[9px] text-blue-300 font-bold uppercase tracking-widest mt-1"
                        >
                            • Active Node •
                        </motion.span>
                    ) : (
                        <span className="text-[9px] text-slate-400 text-center leading-tight line-clamp-2 px-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {data.description as string}
                        </span>
                    )}
                </div>

                {!isGhost && (
                    <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm" />
                )}
            </motion.div>

            <Handle type="source" position={Position.Right} className="w-0 h-0 opacity-0" />
        </div>
    );
};

export default memo(ArchitectNode);
