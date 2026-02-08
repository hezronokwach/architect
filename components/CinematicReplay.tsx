import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
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
import { X, Play, Pause, RefreshCw, Layers, Zap, Download, Box, Video, Film, Loader2 } from 'lucide-react';

const nodeTypes = { architect: ArchitectNode };
const edgeTypes = { architect: ArchitectEdge };

interface CinematicReplayProps {
    nodes: SystemNode[];
    edges: SystemEdge[];
    technicalScript: Record<string, string>;
    simpleScript: Record<string, string>;
    technicalVeoPrompt: string;
    simpleVeoPrompt: string;
    onClose: () => void;
}

const CinematicReplayContent: React.FC<CinematicReplayProps> = ({
    nodes,
    edges,
    technicalScript,
    simpleScript,
    technicalVeoPrompt,
    simpleVeoPrompt,
    onClose
}) => {
    const [activeStep, setActiveStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [is3DMode, setIs3DMode] = useState(true);
    const [narrationMode, setNarrationMode] = useState<'pro' | 'simple'>('pro');

    const { setCenter } = useReactFlow();
    const replayContainerRef = useRef<HTMLDivElement>(null);

    const [rfNodes, setRFNodes] = useNodesState([]);
    const [rfEdges, setRFEdges] = useEdgesState([]);

    const totalSteps = nodes.length + edges.length;
    const intervalDuration = useMemo(() => 4500 / playbackSpeed, [playbackSpeed]);

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
        }, intervalDuration);

        return () => clearInterval(timer);
    }, [isPlaying, totalSteps, intervalDuration]);

    useEffect(() => {
        const isNodeStep = activeStep <= nodes.length && activeStep > 0;
        const isEdgeStep = activeStep > nodes.length;

        const currentActiveNodeId = isNodeStep ? nodes[activeStep - 1]?.id : null;
        const currentActiveEdgeId = isEdgeStep ? edges[activeStep - nodes.length - 1]?.id : null;

        const formattedNodes: Node[] = nodes.map((n, idx) => {
            const isVisible = idx < activeStep;
            const isActive = n.id === currentActiveNodeId;

            const activeEdge = isEdgeStep ? edges[activeStep - nodes.length - 1] : null;
            const isPartofActiveFlow = activeEdge && (n.id === activeEdge.fromId || n.id === activeEdge.toId);

            return {
                id: n.id,
                type: 'architect',
                position: n.position,
                data: {
                    ...n,
                    status: 'COMMITTED',
                    isActive: isActive || isPartofActiveFlow,
                    dimmed: activeStep > 0 && !isVisible && !isActive && !isPartofActiveFlow && activeStep <= nodes.length,
                },
                hidden: !isVisible && !isActive && activeStep <= nodes.length
            };
        });

        const formattedEdges: Edge[] = edges.map((e, idx) => {
            const edgeIdx = idx + nodes.length + 1;
            const isVisible = edgeIdx <= activeStep;
            const isActive = edgeIdx === activeStep;

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
                animated: isActive,
                className: isActive ? 'edge-active' : '',
                style: {
                    stroke: isActive ? '#00ff88' : '#3B82F6',
                    strokeWidth: isActive ? 6 : 2,
                    opacity: isVisible ? 1 : 0.05,
                    transition: 'all 0.4s ease'
                },
                hidden: !isVisible && !isActive
            };
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            formattedNodes.filter(n => !n.hidden),
            formattedEdges.filter(e => !e.hidden)
        );

        setRFNodes(layoutedNodes);
        setRFEdges(layoutedEdges);

        if (currentActiveNodeId) {
            const node = layoutedNodes.find(n => n.id === currentActiveNodeId);
            if (node) {
                setCenter(node.position.x + 86, node.position.y + 50, { zoom: 1.3, duration: 1500 });
            }
        }
    }, [activeStep, nodes, edges, setRFNodes, setRFEdges, setCenter]);

    const { fitView } = useReactFlow();

    const handleDownloadSnapshot = async () => {
        if (!replayContainerRef.current) return;

        // 1. Force fit view to ensure everything is visible for the screenshot
        fitView({ padding: 0.1, duration: 0 });

        // Short delay to allow fitView to apply
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = replayContainerRef.current.querySelector('.react-flow__renderer') as HTMLElement;
        if (canvas) {
            // Apply a temporary style to ensure background is captured
            const originalStyle = canvas.style.cssText;
            canvas.style.backgroundColor = '#020617';

            try {
                const screenshot = await html2canvas(canvas, {
                    backgroundColor: '#020617',
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: true
                });

                const link = document.createElement('a');
                link.href = screenshot.toDataURL('image/png');
                link.download = "architect-cinematic-flow-" + activeStep + ".png";
                link.click();
            } catch (err) {
            } finally {
                canvas.style.cssText = originalStyle;
            }
        }
    };

    const currentNarration = useMemo(() => {
        if (activeStep <= 0) return narrationMode === 'pro' ? "Click play to begin the technical walkthrough." : "Let's see how your system works in plain English!";
        const script = narrationMode === 'pro' ? technicalScript : simpleScript;

        if (activeStep <= nodes.length) {
            const node = nodes[activeStep - 1];
            if (!node) return "...";
            return script[node.id] || node.description || `Initializing ${node.label}.`;
        } else {
            const edge = edges[activeStep - nodes.length - 1];
            if (!edge) return "...";
            return script[edge.id] || `Data streams between components.`;
        }
    }, [activeStep, nodes, edges, technicalScript, simpleScript, narrationMode]);

    const activeVeoPrompt = narrationMode === 'pro' ? technicalVeoPrompt : simpleVeoPrompt;

    return (
        <div className="absolute inset-0 z-[120] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
            <style>{`
                @keyframes pulse-active {
                    0%, 100% { opacity: 1; stroke-width: 6; filter: drop-shadow(0 0 15px #00ff88); }
                    50% { opacity: 0.6; stroke-width: 4; filter: drop-shadow(0 0 5px #00ff88); }
                }
                .edge-active { animation: pulse-active 1s infinite ease-in-out; }
                .perspective-container { perspective: 1500px; transform-style: preserve-3d; }
                .canvas-3d {
                    transform: rotateX(25deg) rotateY(-5deg) rotateZ(0deg) translateY(-5%);
                    box-shadow: 0 50px 100px rgba(0, 0, 0, 0.8), 0 0 50px rgba(59, 130, 246, 0.1);
                    transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .canvas-2d {
                    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateY(0%);
                    transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .glass-panel {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                }
            `}</style>

            {/* CRT Effects */}
            <div className="absolute inset-0 pointer-events-none z-[110] overflow-hidden rounded-[3rem]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[110] bg-[length:100%_2px,3px_100%] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)] z-[111] pointer-events-none" />
            </div>


            {/* Narrative HUD */}
            <AnimatePresence mode="wait">
                {currentNarration && (
                    <motion.div
                        key={`${narrationMode}-step-${activeStep}`}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[55] w-full max-w-2xl px-4 pointer-events-none"
                    >
                        <div className={`bg-slate-900/40 backdrop-blur-sm border p-5 rounded-3xl flex items-center gap-6 shadow-2xl transition-all duration-500 ${narrationMode === 'simple' ? 'border-purple-500/30' : 'border-white/10'}`}>
                            <div className={`hidden md:flex flex-col items-center justify-center p-3 rounded-2xl border min-w-[70px] transition-all duration-500 ${narrationMode === 'simple' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                                <Zap className={`w-5 h-5 mb-1 transition-colors duration-500 ${narrationMode === 'simple' ? 'text-purple-400' : 'text-blue-400'}`} />
                                <span className="text-[10px] font-mono text-white/50 uppercase">STEP</span>
                                <span className="text-sm font-bold text-white font-mono">{activeStep}</span>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${narrationMode === 'simple' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {narrationMode === 'pro' ? 'Technical Architecture' : 'Simplified Domain Story'}
                                    </span>
                                </div>
                                <p className="text-sm md:text-lg font-medium text-white/95 leading-relaxed font-sans drop-shadow-sm">
                                    "{currentNarration}"
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                className="w-full h-full relative perspective-container flex items-center justify-center"
                ref={replayContainerRef}
            >
                <div className={`w-[95%] h-[90%] rounded-[3.5rem] overflow-hidden border transition-all duration-1000 ${is3DMode ? 'border-cyan-500/20 shadow-[0_0_80px_rgba(6,182,212,0.15)] canvas-3d' : 'border-white/5 canvas-2d'}`}>
                    <ReactFlow
                        nodes={rfNodes}
                        edges={rfEdges}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.5 }}
                        className="bg-slate-950"
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={true}
                        zoomOnScroll={true}
                        panOnDrag={true}
                        panOnScroll={false}
                        preventScrolling={true}
                        minZoom={0.1}
                        maxZoom={4}
                    >
                        <Background color="#1e293b" variant="lines" gap={60} size={1} opacity={is3DMode ? 0.6 : 0.3} />
                    </ReactFlow>
                </div>

                {/* HUD Controls */}
                <div className="absolute top-10 right-10 flex items-center gap-3 z-[100]">
                    {/* Narration Toggle */}
                    <div className="bg-slate-900/80 backdrop-blur border border-white/10 p-1 rounded-xl flex gap-1 shadow-lg">
                        <button
                            onClick={() => setNarrationMode('pro')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${narrationMode === 'pro' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            TECH
                        </button>
                        <button
                            onClick={() => setNarrationMode('simple')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${narrationMode === 'simple' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            STORY
                        </button>
                    </div>


                    <button
                        onClick={() => setIs3DMode(!is3DMode)}
                        className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${is3DMode ? 'bg-cyan-600/20 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-white/10 text-slate-400'}`}
                    >
                        <Box size={14} /> {is3DMode ? '3D' : '2D'}
                    </button>

                    <div className="h-8 w-px bg-white/10 mx-1" />

                    <div className="bg-slate-900/80 backdrop-blur border border-white/10 p-1 rounded-xl flex gap-1 shadow-lg">
                        {[0.5, 1, 2].map(speed => (
                            <button
                                key={speed}
                                onClick={() => setPlaybackSpeed(speed)}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${playbackSpeed === speed ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex items-center gap-2 bg-slate-900 border border-white/10 px-5 py-2 rounded-xl text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        {isPlaying ? 'PAUSE' : 'PLAY'}
                    </button>

                    <button
                        onClick={onClose}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 p-2 rounded-xl shadow-lg transition-all"
                    >
                        <X size={18} />
                    </button>
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
