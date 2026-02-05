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
import { X, Play, Pause, RefreshCw, Layers, Zap, Download, Box, Video } from 'lucide-react';

const nodeTypes = { architect: ArchitectNode };
const edgeTypes = { architect: ArchitectEdge };

interface CinematicReplayProps {
    nodes: SystemNode[];
    edges: SystemEdge[];
    script: Record<string, string>;
    veoPrompt?: string;
    onClose: () => void;
}

const CinematicReplayContent: React.FC<CinematicReplayProps> = ({ nodes, edges, script, veoPrompt, onClose }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [is3DMode, setIs3DMode] = useState(true);
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

    const { getNodes, getEdges, fitView } = useReactFlow();

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
                link.download = `architect-cinematic-flow-${activeStep}.png`;
                link.click();
            } catch (err) {
                console.error("Snapshot failed:", err);
            } finally {
                canvas.style.cssText = originalStyle;
            }
        }
    };

    const currentNarration = useMemo(() => {
        if (activeStep <= 0) return "Click play to begin the architectural walkthrough.";

        if (activeStep <= nodes.length) {
            const node = nodes[activeStep - 1];
            if (!node) return "...";
            const nodeFallback = node.description
                ? `${node.label} serves as a ${node.description.toLowerCase()}`
                : `Initializing ${node.label} as a core ${node.type} component within the system architecture.`;
            return script[node.id] || nodeFallback;
        } else {
            const edge = edges[activeStep - nodes.length - 1];
            if (!edge) return "...";
            const sourceNode = nodes.find(n => n.id === edge.fromId);
            const targetNode = nodes.find(n => n.id === edge.toId);
            const sourceName = sourceNode?.label || 'Primary component';
            const targetName = targetNode?.label || 'Target module';

            let fallback = "";
            const flowDescription = edge.label ? `transmitting ${edge.label.toLowerCase()}` : "handling traffic";

            if (targetNode?.type === 'cache') {
                fallback = `${sourceName} leverages high-speed caching on ${targetName} to reduce latency and database overhead.`;
            } else if (targetNode?.type === 'database') {
                fallback = `${sourceName} persists specific system state to ${targetName} ensuring data durability and integrity.`;
            } else if (targetNode?.type === 'gateway' || targetNode?.type === 'server') {
                fallback = `${sourceName} routes ${flowDescription} to ${targetName} for centralized request processing.`;
            } else if (sourceNode?.type === 'client') {
                fallback = `${sourceName} initiates safe ${flowDescription} requests to ${targetName} to begin the user session.`;
            } else {
                fallback = `${sourceName} exchanges data with ${targetName}, ${flowDescription} across the network fabric.`;
            }

            return script[edge.id] || fallback;
        }
    }, [activeStep, nodes, edges, script]);

    return (
        <div className="absolute inset-0 z-[120] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
            <style>{`
        @keyframes pulse-active {
          0%, 100% { opacity: 1; stroke-width: 6; filter: drop-shadow(0 0 15px #00ff88); }
          50% { opacity: 0.6; stroke-width: 4; filter: drop-shadow(0 0 5px #00ff88); }
        }
        .edge-active {
          animation: pulse-active 1s infinite ease-in-out;
        }
        .perspective-container {
          perspective: 1500px;
          transform-style: preserve-3d;
        }
        .canvas-3d {
          transform: rotateX(25deg) rotateY(-5deg) rotateZ(0deg) translateY(-5%);
          box-shadow: 0 50px 100px rgba(0,0,0,0.8), 0 0 50px rgba(59,130,246,0.1);
          transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .canvas-2d {
          transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateY(0%);
          transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

            {/* CRT/Scanline Effects */}
            <div className="absolute inset-0 pointer-events-none z-[110] overflow-hidden rounded-[3rem]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[110] bg-[length:100%_2px,3px_100%] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)] z-[111] pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent opacity-10 animate-scanline pointer-events-none z-[112]" />
            </div>

            {/* Veo Vision HUD */}
            {veoPrompt && (
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute top-32 left-10 z-[60] max-w-xs pointer-events-none"
                >
                    <div className="bg-blue-600/10 backdrop-blur-md border-l-2 border-blue-500 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Video size={12} className="text-blue-400" />
                            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">AI Visualization Dream</span>
                        </div>
                        <p className="text-[11px] text-slate-300 italic leading-relaxed">
                            "{veoPrompt}"
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Narrative HUD (Relocated to Top Center) */}
            <AnimatePresence mode="wait">
                {currentNarration && (
                    <motion.div
                        key={`step-${activeStep}`}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[55] w-full max-w-2xl px-4 pointer-events-none"
                    >
                        <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 p-4 rounded-xl flex items-center gap-4 shadow-xl">
                            <div className="hidden md:flex flex-col items-center justify-center p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 min-w-[60px]">
                                <Zap className="text-blue-400 w-4 h-4 mb-1" />
                                <span className="text-[9px] font-mono text-blue-300 uppercase">STEP</span>
                                <span className="text-xs font-bold text-white font-mono">{activeStep}</span>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <p className="text-sm md:text-base font-medium text-white/90 leading-relaxed font-sans drop-shadow-sm">
                                    "{currentNarration}"
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                className={`w-full h-full relative perspective-container flex items-center justify-center`}
                ref={replayContainerRef}
            >
                <div className={`w-[95%] h-[90%] rounded-[3rem] overflow-hidden border  ${is3DMode ? 'border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.1)] canvas-3d' : 'border-white/10 canvas-2d'}`}>
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
                        panOnScroll={true}
                        minZoom={0.1}
                        maxZoom={4}
                    >
                        <Background color="#1e293b" variant="lines" gap={60} size={1} opacity={is3DMode ? 0.6 : 0.3} />
                    </ReactFlow>
                </div>

                {/* HUD Controls */}
                <div className="absolute top-10 right-10 flex items-center gap-3 z-[100]">
                    <button
                        onClick={() => setIs3DMode(!is3DMode)}
                        className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${is3DMode ? 'bg-cyan-600/20 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-white/10 text-slate-400'}`}
                    >
                        <Box size={14} /> {is3DMode ? '3D' : '2D'}
                    </button>

                    <div className="bg-slate-900/80 backdrop-blur border border-white/10 p-1 rounded-xl flex gap-1 shadow-lg">
                        {[0.5, 1, 2].map(speed => (
                            <button
                                key={speed}
                                onClick={() => setPlaybackSpeed(speed)}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${playbackSpeed === speed ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex items-center gap-2 bg-slate-900/80 backdrop-blur border border-white/10 px-5 py-2 rounded-xl text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        {isPlaying ? 'PAUSE' : 'PLAY'}
                    </button>

                    <button
                        onClick={handleDownloadSnapshot}
                        className="bg-slate-900/80 backdrop-blur border border-white/10 text-white p-2 rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                    >
                        <Download size={16} />
                    </button>

                    <button
                        onClick={() => { setActiveStep(0); setIsPlaying(true); }}
                        className="bg-slate-900/80 backdrop-blur border border-white/10 text-white p-2 rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                    >
                        <RefreshCw size={16} className={isPlaying ? 'animate-spin-slow' : ''} />
                    </button>

                    <button
                        onClick={onClose}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 p-2 rounded-xl shadow-lg transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Zoom Controls (Simulated for HUD feel) */}
                <div className="absolute right-10 bottom-10 flex flex-col gap-2 z-[100]">
                    <div className="bg-slate-900/80 backdrop-blur border border-white/10 rounded-lg p-2 flex flex-col gap-2 shadow-lg">
                        <div className="text-[10px] text-center text-slate-500 font-mono">ZOOM</div>
                        <div className="w-8 h-24 bg-slate-800 rounded relative overflow-hidden">
                            <div className="absolute bottom-0 w-full bg-blue-500/50" style={{ height: '60%' }} />
                            {/* Hash marks */}
                            <div className="absolute inset-0 flex flex-col justify-between py-1 px-1">
                                {[...Array(5)].map((_, i) => <div key={i} className="w-2 h-[1px] bg-white/20" />)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step Progress HUD */}
                <div className="absolute top-10 left-10 z-[100]">
                    <div className="text-[10px] font-mono text-cyan-400/50 uppercase tracking-[0.5em] mb-2 drop-shadow-lg font-bold">Reconstruction Protocol</div>
                    <div className="flex gap-1 bg-black/20 p-1 rounded-full backdrop-blur-sm">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    height: 4,
                                    width: i === activeStep - 1 ? 24 : 8,
                                    backgroundColor: i < activeStep ? '#22d3ee' : 'rgba(255,255,255,0.1)'
                                }}
                                className="rounded-full transition-all shadow-[0_0_5px_rgba(34,211,238,0.5)]"
                            />
                        ))}
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
