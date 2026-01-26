import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ArchitectNode from './ArchitectNode';
import ArchitectEdge from './ArchitectEdge';
import { getLayoutedElements } from '../services/layoutService';
import { SystemNode, SystemEdge } from '../types';

const nodeTypes = {
  architect: ArchitectNode,
};

const edgeTypes = {
  architect: ArchitectEdge,
};

interface DiagramCanvasProps {
  nodes: SystemNode[];
  edges: SystemEdge[];
  proposedNode: SystemNode | null;
  proposedEdge: SystemEdge | null;
}

const DiagramCanvasContent: React.FC<DiagramCanvasProps> = ({
  nodes: systemNodes,
  edges: systemEdges,
  proposedNode,
  proposedEdge
}) => {
  const [rfNodes, setRFNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRFEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const formattedNodes: Node[] = systemNodes.map(n => ({
      id: n.id,
      type: 'architect',
      position: n.position,
      data: { ...n },
    }));

    if (proposedNode) {
      formattedNodes.push({
        id: proposedNode.id,
        type: 'architect',
        position: proposedNode.position,
        data: { ...proposedNode },
      });
    }

    const formattedEdges: Edge[] = systemEdges.map(e => ({
      id: e.id,
      source: e.fromId,
      target: e.toId,
      type: 'architect',
      data: { ...e },
    }));

    if (proposedEdge) {
      formattedEdges.push({
        id: proposedEdge.id,
        source: proposedEdge.fromId,
        target: proposedEdge.toId,
        type: 'architect',
        data: { ...proposedEdge },
      });
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      formattedNodes,
      formattedEdges
    );

    setRFNodes(layoutedNodes);
    setRFEdges(layoutedEdges);
  }, [systemNodes, systemEdges, proposedNode, proposedEdge, setRFNodes, setRFEdges]);

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="bg-slate-950"
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#334155" variant="dots" gap={20} size={1} />
        <Controls
          className="bg-slate-800 border-slate-700 fill-blue-400"
          showInteractive={false}
        />
        <Panel position="bottom-right" className="bg-slate-800/50 backdrop-blur-md px-3 py-1 transparent-xs rounded-full border border-slate-700 text-[10px] text-slate-400">
          React Flow Powered • Smart Layout Engine
        </Panel>
      </ReactFlow>
    </div>
  );
};

const DiagramCanvas: React.FC<DiagramCanvasProps> = (props) => (
  <ReactFlowProvider>
    <DiagramCanvasContent {...props} />
  </ReactFlowProvider>
);

export default DiagramCanvas;
