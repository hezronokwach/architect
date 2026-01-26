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
import { X, Play, Pause, RefreshCw, Layers, Zap, Download } from 'lucide-react';

const nodeTypes = { architect: ArchitectNode };
const edgeTypes = { architect: ArchitectEdge };

interface CinematicReplayProps {
    nodes: SystemNode[];
    edges: SystemEdge[];
    script: Record<string, string>;
    onClose: () => void;
}

const CinematicReplayContent: React.FC<CinematicReplayProps> = ({ nodes, edges, script, onClose }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
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
                animated: isVisible,
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

        if (currentActiveNodeId) {
            const node = layoutedNodes.find(n => n.id === currentActiveNodeId);
            if (node) {
                setCenter(node.position.x + 86, node.position.y + 50, { zoom: 1.3, duration: 1500 });
            }
        }
    }, [activeStep, nodes, edges, setRFNodes, setRFEdges, setCenter]);

    const handleDownloadSnapshot = async () => {
        if (!replayContainerRef.current) return;
        const canvas = replayContainerRef.current.querySelector('.react-flow__renderer') as HTMLElement;
        if (canvas) {
            const screenshot = await html2canvas(canvas, { backgroundColor: '#020617', scale: 2 });
            const link = document.createElement('a');
            link.href = screenshot.toDataURL('image/png');
            link.download = `architect-cinematic-step-${activeStep}.png`;
            link.click();
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

            // Context-aware "Why/What" logic
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
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_80%)]" />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={`step-${activeStep}`}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute bottom-16 z-50 bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] w-full max-w-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col items-center text-center"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="bg-blue-600/20 p-2.5 rounded-2xl">
                            <Zap className="text-blue-400 w-6 h-6 fill-blue-400" />
                        </div>
                        <span className="text-[11px] font-mono text-blue-400 tracking-[0.6em] uppercase">
                            Phase {activeStep}: {activeStep <= nodes.length ? 'System Node' : 'Network Flow'}
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-white leading-relaxed tracking-tight max-w-2xl italic">
                        "{currentNarration}"
                    </p>
                    <div className="w-full h-1 bg-slate-800 mt-8 rounded-full overflow-hidden">
                        <motion.div
                            key={`progress-bar-${activeStep}-${playbackSpeed}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: intervalDuration / 1000, ease: "linear" }}
                            className="h-full bg-blue-500 origin-left"
                        />
                    </div>
                </motion.div>
            </AnimatePresence>

            <div className="w-full h-full relative" ref={replayContainerRef}>
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
                    <Background color="#111827" variant="lines" gap={50} size={1} opacity={0.3} />
                </ReactFlow>

                <div className="absolute top-10 right-10 flex items-center gap-3 z-50">
                    <div className="bg-slate-900 border border-white/10 p-1.5 rounded-[1.5rem] flex gap-1 shadow-2xl">
                        {[0.5, 1, 2].map(speed => (
                            <button
                                key={speed}
                                onClick={() => setPlaybackSpeed(speed)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${playbackSpeed === speed ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex items-center gap-2 bg-slate-900 border border-white/10 px-5 py-3.5 rounded-[1.5rem] text-xs font-black text-white hover:bg-slate-800 transition-all shadow-2xl active:scale-95"
                    >
                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        {isPlaying ? 'PAUSE' : 'RESUME'}
                    </button>

                    <button
                        onClick={handleDownloadSnapshot}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-[1.5rem] shadow-2xl transition-all active:scale-95"
                        title="Download Step Snapshot"
                    >
                        <Download size={20} />
                    </button>

                    <button
                        onClick={() => { setActiveStep(0); setIsPlaying(true); }}
                        className="bg-slate-900 border border-white/10 text-white p-3.5 rounded-[1.5rem] shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
                    >
                        <RefreshCw size={20} className={isPlaying ? 'animate-spin-slow' : ''} />
                    </button>

                    <button
                        onClick={onClose}
                        className="bg-red-600/20 hover:bg-red-600 border border-red-500/50 text-white p-4 rounded-[1.5rem] shadow-2xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="absolute top-10 left-10 z-50">
                    <div className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em] mb-4">Reconstruction Protocol</div>
                    <div className="flex gap-2">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    height: i === activeStep - 1 ? 24 : 8,
                                    width: 8,
                                    backgroundColor: i < activeStep ? '#3b82f6' : '#1e293b'
                                }}
                                className="rounded-full transition-all"
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
