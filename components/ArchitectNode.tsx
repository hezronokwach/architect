import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Database, Server, Smartphone, Cloud, ShieldCheck, Layers, Cpu, Box } from 'lucide-react';
import { NodeType, NodeStatus } from '../types';

const getNodeIcon = (type: string) => {
    switch (type) {
        case 'database': return <Database className="w-6 h-6 text-blue-400" />;
        case 'server': return <Server className="w-6 h-6 text-green-400" />;
        case 'client': return <Smartphone className="w-6 h-6 text-purple-400" />;
        case 'cloud': return <Cloud className="w-6 h-6 text-sky-300" />;
        case 'gateway': return <ShieldCheck className="w-6 h-6 text-yellow-400" />;
        case 'cache': return <Layers className="w-6 h-6 text-pink-400" />;
        case 'queue': return <Cpu className="w-6 h-6 text-orange-400" />;
        default: return <Box className="w-6 h-6 text-gray-400" />;
    }
};

const ArchitectNode = ({ data }: NodeProps) => {
    const isGhost = data.status === 'PROPOSED';
    const type = data.type as NodeType;

    return (
        <div className="relative group">
            <Handle type="target" position={Position.Left} className="w-0 h-0 opacity-0" />

            <motion.div
                initial={{ scale: 0.8, opacity: 0, filter: "blur(5px)" }}
                animate={{
                    scale: 1,
                    opacity: isGhost ? 0.6 : 1,
                    filter: "blur(0px)",
                }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className={`w-40 p-3 rounded-xl backdrop-blur-xl flex flex-col items-center gap-1 border-2 transition-all duration-300
          ${isGhost
                        ? 'border-dashed border-yellow-400/50 bg-yellow-400/5 shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                        : 'border-blue-500/30 bg-slate-800/80 shadow-[0_0_30px_rgba(59,130,246,0.15)] group-hover:border-blue-400/50 group-hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]'
                    }`}
            >
                <div className={`p-2.5 rounded-2xl transition-all duration-500 ${isGhost ? 'bg-yellow-400/10' : 'bg-slate-900 shadow-inner group-hover:scale-110'}`}>
                    {getNodeIcon(type)}
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[13px] font-bold text-white tracking-wide text-center">
                        {data.label as string}
                    </span>
                    <span className="text-[9px] text-slate-400 text-center leading-tight line-clamp-2 px-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {data.description as string}
                    </span>
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
