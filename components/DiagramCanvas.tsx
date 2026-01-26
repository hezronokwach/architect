import React from 'react';
import { motion } from 'framer-motion';
import { SystemNode, SystemEdge } from '../types';
import { Database, Server, Smartphone, Cloud, ShieldCheck, Layers, Cpu, Box } from 'lucide-react';

interface DiagramCanvasProps {
  nodes: SystemNode[];
  edges: SystemEdge[];
  proposedNode: SystemNode | null;
  proposedEdge: SystemEdge | null;
}

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

const DiagramCanvas: React.FC<DiagramCanvasProps> = ({ nodes, edges, proposedNode, proposedEdge }) => {
  
  const renderNode = (node: SystemNode, isGhost: boolean) => (
    <motion.div
      key={node.id}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: isGhost ? 0.6 : 1,
        left: node.position.x,
        top: node.position.y
      }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className={`absolute w-40 p-3 rounded-xl backdrop-blur-md flex flex-col items-center gap-1 border-2 z-20
        ${isGhost 
          ? 'border-dashed border-yellow-400 bg-yellow-500/10 shadow-[0_0_15px_rgba(250,204,21,0.2)]' 
          : 'border-blue-500/40 bg-slate-800/90 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
        }`}
    >
      <div className={`p-2 rounded-full ${isGhost ? 'bg-yellow-400/20' : 'bg-slate-900 shadow-inner'}`}>
        {getNodeIcon(node.type)}
      </div>
      <span className="text-sm font-bold text-white tracking-tight">{node.label}</span>
      <span className="text-[10px] text-gray-400 text-center leading-tight line-clamp-2">{node.description}</span>
    </motion.div>
  );

  const getCenter = (node: SystemNode) => ({
    x: node.position.x + 80, // Half of w-40 (160px)
    y: node.position.y + 45  // Approx center of node height
  });

  const renderEdge = (edge: SystemEdge, isGhost: boolean) => {
    const allNodes = [...nodes, ...(proposedNode ? [proposedNode] : [])];
    const startNode = allNodes.find(n => n.id === edge.fromId);
    const endNode = allNodes.find(n => n.id === edge.toId);

    if (!startNode || !endNode) return null;

    const start = getCenter(startNode);
    const end = getCenter(endNode);
    
    // Bezier curve
    const cp1x = start.x + (end.x - start.x) * 0.5;
    const cp1y = start.y;
    const cp2x = start.x + (end.x - start.x) * 0.5;
    const cp2y = end.y;

    const pathD = `M ${start.x} ${start.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${end.x} ${end.y}`;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    return (
      <g key={edge.id} className="z-10">
        <motion.path
          d={pathD}
          fill="none"
          stroke={isGhost ? "#FACC15" : "#3B82F6"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={isGhost ? "8,8" : "none"}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: isGhost ? 0.6 : 0.8 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <motion.foreignObject 
          x={midX - 50} 
          y={midY - 12} 
          width={100} 
          height={24}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex justify-center">
            <span className="bg-slate-900/95 text-[10px] font-medium text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 whitespace-nowrap shadow-sm">
              {edge.label}
            </span>
          </div>
        </motion.foreignObject>
      </g>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {edges.map(e => renderEdge(e, false))}
        {proposedEdge && renderEdge(proposedEdge, true)}
      </svg>

      <div className="absolute inset-0 pointer-events-none overflow-visible">
         {nodes.map(n => renderNode(n, false))}
         {proposedNode && renderNode(proposedNode, true)}
      </div>
    </div>
  );
};

export default DiagramCanvas;
