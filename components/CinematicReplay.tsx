import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ReactFlow,
    Background,
    Node,
    Edge,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ArchitectNode from './ArchitectNode';
import ArchitectEdge from './ArchitectEdge';
import { getLayoutedElements } from '../services/layoutService';
import { SystemNode, SystemEdge } from '../types';
import { X, Play, RefreshCw, Layers, Zap, Info } from 'lucide-react';

const nodeTypes = { architect: ArchitectNode };
const edgeTypes = { architect: ArchitectEdge };

interface CinematicReplayProps {
    nodes: SystemNode[];
    edges: SystemEdge[];
    onClose: () => void;
}

const CinematicReplayContent: React.FC<CinematicReplayProps> = ({ nodes, edges, onClose }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const { setCenter } = useReactFlow();

    const [rfNodes, setRFNodes] = useNodesState([]);
    const [rfEdges, setRFEdges] = useEdgesState([]);

    // Sequence based on user input (we'll treat node order as logical flow)
    const totalSteps = nodes.length + edges.length;

    useEffect(() => {
        if (!isPlaying) return;

        const timer = setInterval(() => {
            setActiveStep((prev) => {
                if (prev >= totalSteps) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 2000); // 2 seconds per step for clarity

        return () => clearInterval(timer);
    }, [isPlaying, totalSteps]);

    useEffect(() => {
        const isNodeStep = activeStep <= nodes.length && activeStep > 0;
        const isEdgeStep = activeStep > nodes.length;

        const currentActiveNodeId = isNodeStep ? nodes[activeStep - 1]?.id : null;
        const currentActiveEdgeId = isEdgeStep ? edges[activeStep - nodes.length - 1]?.id : null;

        const formattedNodes: Node[] = nodes.map((n, idx) => {
            const isVisible = idx < activeStep;
            const isActive = n.id === currentActiveNodeId;

            // If we are at an edge step, highlight the source and target of that edge
            const activeEdge = isEdgeStep ? edges[activeStep - nodes.length - 1] : null;
            const isPartofActiveFlow = activeEdge && (n.id === activeEdge.fromId || n.id === activeEdge.toId);

            return {
                id: n.id,
                type: 'architect',
                position: n.position,
                data: {
                    ...n,
                    status: 'COMMITTED',
                    // Inject extra styling for "cinematic" focus
                    isActive: isActive || isPartofActiveFlow,
                    dimmed: activeStep > 0 && !isVisible && !isActive && !isPartofActiveFlow && activeStep <= nodes.length,
                    narrative: isActive ? n.description : ''
                },
                hidden: !isVisible && !isActive && activeStep <= nodes.length
            };
        });

        const formattedEdges: Edge[] = edges.map((e, idx) => {
            const edgeIdx = idx + nodes.length + 1;
            const isVisible = edgeIdx <= activeStep;
            const isActive = e.id === currentActiveEdgeId;

            return {
                id: e.id,
                source: e.fromId,
                target: e.toId,
                type: 'architect',
                data: {
                    ...e,
                    status: 'COMMITTED',
                    isActive: isActive
                },
                animated: isVisible, // Pulse effect
                style: {
                    stroke: isActive ? '#00ff88' : isVisible ? '#3B82F6' : '#1e293b',
                    strokeWidth: isActive ? 5 : 3,
                    opacity: isVisible ? 1 : 0.1,
                    transition: 'all 0.5s ease'
                },
                hidden: !isVisible
            };
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            formattedNodes.filter(n => !n.hidden),
            formattedEdges.filter(e => !e.hidden)
        );

        setRFNodes(layoutedNodes);
        setRFEdges(layoutedEdges);

        // Camera Focus Logic
        if (currentActiveNodeId) {
            const node = layoutedNodes.find(n => n.id === currentActiveNodeId);
            if (node) {
                setCenter(node.position.x + 86, node.position.y + 50, { zoom: 1.2, duration: 1000 });
            }
        } else if (currentActiveEdgeId) {
            // Fit view to see the flow
            // For better experience, we could find mid-point of edge
        }
    }, [activeStep, nodes, edges, setRFNodes, setRFEdges, setCenter]);

    return (
        <div className="absolute inset-0 z-[120] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_80%)]" />
                <AnimatePresence>
                    {isPlaying && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Narrative Overlay (Bottom) */}
            <AnimatePresence mode="wait">
                {activeStep > 0 && activeStep <= nodes.length && nodes[activeStep - 1] && (
                    <motion.div
                        key={`node-${activeStep}`}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute bottom-16 z-50 bg-slate-900/80 backdrop-blur-2xl border border-blue-500/30 p-8 rounded-[2rem] max-w-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-600/20 p-2 rounded-xl">
                                <Zap className="text-blue-400 w-5 h-5 fill-blue-400" />
                            </div>
                            <span className="text-xs font-mono text-blue-400 tracking-[0.5em] uppercase">Phase {activeStep}: Initialization</span>
                        </div>
                        <h3 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">
                            {nodes[activeStep - 1].label}
                        </h3>
                        <p className="text-slate-300 text-lg leading-relaxed font-medium">
                            {nodes[activeStep - 1].description}
                        </p>
                    </motion.div>
                )}

                {activeStep > nodes.length && edges[activeStep - nodes.length - 1] && (
                    <motion.div
                        key={`edge-${activeStep}`}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute bottom-16 z-50 bg-green-950/40 backdrop-blur-2xl border border-green-500/30 p-8 rounded-[2rem] max-w-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-green-600/20 p-2 rounded-xl">
                                <RefreshCw className="text-green-400 w-5 h-5 animate-spin-slow" />
                            </div>
                            <span className="text-xs font-mono text-green-400 tracking-[0.5em] uppercase">Data Transaction</span>
                        </div>
                        <h3 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">
                            Establishing Flow
                        </h3>
                        <p className="text-slate-200 text-lg leading-relaxed font-bold italic">
                            « {edges[activeStep - nodes.length - 1].label} »
                        </p>
                        <p className="text-slate-400 text-sm mt-4 max-w-lg">
                            Integrating data paths between identified architectural modules to ensure seamless communication and low-latency throughput.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stage Area */}
            <div className="w-full h-full relative">
                <ReactFlow
                    nodes={rfNodes}
                    edges={rfEdges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.5 }}
                    className="bg-transparent"
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    zoomOnScroll={false}
                    panOnDrag={true}
                    minZoom={0.5}
                    maxZoom={2}
                >
                    <Background color="#1e293b" variant="lines" gap={40} size={1} opacity={0.2} />
                </ReactFlow>

                {/* HUD Controls */}
                <div className="absolute top-8 right-8 flex items-center gap-3 z-50">
                    <button
                        onClick={() => { setActiveStep(0); setIsPlaying(true); }}
                        className="flex items-center gap-2 bg-slate-900 border border-white/10 px-5 py-3 rounded-2xl text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-xl"
                    >
                        <RefreshCw size={18} className={isPlaying ? 'animate-spin' : ''} /> RESTART
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-2xl shadow-xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress HUD */}
                <div className="absolute top-8 left-8 z-50 flex flex-col gap-1">
                    <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.4em] mb-2">Sequence Analysis Matrix</div>
                    <div className="flex gap-1.5">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={false}
                                animate={{
                                    width: i === activeStep - 1 ? 40 : 12,
                                    backgroundColor: i < activeStep ? '#3b82f6' : '#1e293b'
                                }}
                                className="h-1.5 rounded-full transition-all"
                            />
                        ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-blue-400 font-mono text-[10px] uppercase">
                        <Info size={12} /> Step {activeStep} of {totalSteps} // System Integrity Verified
                    </div>
                </div>
            </div>
        </div>
    );
};

const CinematicReplay: React.FC<CinematicReplayProps> = (props) => (
    <ReactFlowProvider>
        <CinematicReplayContent {...props} />
    </ReactFlowProvider>
);

export default CinematicReplay;
