import React, { memo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { motion } from 'framer-motion';

const ArchitectEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const isGhost = data?.status === 'PROPOSED';

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: isGhost ? '#FACC15' : '#3B82F6',
                    strokeWidth: 3,
                    strokeDasharray: isGhost ? '8,8' : 'none',
                    opacity: isGhost ? 0.4 : 0.6,
                }}
            />
            {!isGhost && (
                <motion.path
                    d={edgePath}
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth={3}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />
            )}
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    <div className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold backdrop-blur-md shadow-lg transition-all
            ${isGhost
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'
                            : 'bg-slate-900/90 border-blue-500/30 text-blue-300'
                        }`}
                    >
                        {data?.label as string}
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default memo(ArchitectEdge);
