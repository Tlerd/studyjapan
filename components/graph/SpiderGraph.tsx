"use client";

import React, { useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { type NodeData, type GraphResult } from "../../lib/graphBuilder";
import { Furigana } from "../Furigana";

interface SpiderGraphProps {
  graphData: GraphResult | null;
  selectedNodeId: string | null;
  onSelectNode: (node: NodeData) => void;
  onCenterChange?: (label: string) => void;
}

// Custom Kanji Node Component (Hỗ trợ kéo thả và đổi trỏ chuột)
function KanjiNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeData;
  const isCenter = nodeData.circle === 0;

  return (
    <div
      className={`group relative flex flex-col items-center justify-center rounded-full border-2 transition-shadow cursor-grab active:cursor-grabbing select-none ${
        isCenter
          ? "w-24 h-24 bg-accent text-accent-ink border-white shadow-xl ring-4 ring-accent/30"
          : "w-16 h-16 bg-card text-text border-line hover:border-accent hover:shadow-md"
      } ${selected ? "ring-4 ring-amber-400" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <span
        className={`font-ja font-bold leading-none ${
          isCenter ? "text-4xl text-white" : "text-2xl text-accent"
        }`}
      >
        {nodeData.label}
      </span>
      {nodeData.hanViet && (
        <span
          className={`text-[10px] font-bold uppercase mt-1 ${
            isCenter ? "text-white/90" : "text-muted"
          }`}
        >
          {nodeData.hanViet}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

// Custom Word Node Component (Hỗ trợ kéo thả và đổi trỏ chuột)
function WordNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeData;
  const isCenter = nodeData.circle === 0;

  return (
    <div
      className={`group relative px-3 py-2 rounded-xl border transition-shadow cursor-grab active:cursor-grabbing select-none max-w-[180px] text-center ${
        isCenter
          ? "bg-accent text-accent-ink border-white shadow-xl ring-4 ring-accent/30"
          : "bg-card text-text border-line hover:border-accent hover:shadow-md"
      } ${selected ? "ring-2 ring-amber-400" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="font-ja text-base font-bold">
        <Furigana
          surface={nodeData.label}
          reading={nodeData.reading}
          className={isCenter ? "text-white" : "text-text"}
        />
      </div>
      {nodeData.meaning && (
        <p
          className={`text-[10px] truncate max-w-[140px] mt-0.5 ${
            isCenter ? "text-white/80" : "text-muted"
          }`}
        >
          {nodeData.meaning}
        </p>
      )}
      {nodeData.rank && (
        <span
          className={`inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
            isCenter
              ? "bg-white/20 text-white"
              : "bg-unk-bg text-muted group-hover:text-text"
          }`}
        >
          #{nodeData.rank}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = {
  kanji: KanjiNodeComponent,
  word: WordNodeComponent
};

export function SpiderGraph({
  graphData,
  selectedNodeId,
  onSelectNode,
  onCenterChange
}: SpiderGraphProps) {
  // Use React Flow state hooks so nodes can be freely dragged around
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Function to calculate radial layout positions
  const computeLayout = useCallback(() => {
    if (!graphData) return { initialNodes: [], initialEdges: [] };

    const centerX = 360;
    const centerY = 300;

    const nodesMap = new Map<string, Node>();
    const flowEdges: Edge[] = [];

    // Center Node (Circle 0)
    const cNode = graphData.centerNode;
    nodesMap.set(cNode.id, {
      id: cNode.id,
      type: cNode.type,
      position: { x: centerX - 48, y: centerY - 48 },
      data: cNode as any,
      selected: selectedNodeId === cNode.id,
      draggable: true
    });

    // Group nodes by circle
    const circle1Nodes = graphData.nodes.filter((n) => n.circle === 1);
    const circle2Nodes = graphData.nodes.filter((n) => n.circle === 2);

    // Circle 1 (Orbit 1)
    const r1 = 180;
    const count1 = circle1Nodes.length;
    const angleStep1 = count1 > 0 ? (2 * Math.PI) / count1 : 0;

    circle1Nodes.forEach((node, i) => {
      const angle = i * angleStep1 - Math.PI / 2;
      const x = centerX + r1 * Math.cos(angle) - 40;
      const y = centerY + r1 * Math.sin(angle) - 30;

      nodesMap.set(node.id, {
        id: node.id,
        type: node.type,
        position: { x, y },
        data: node as any,
        selected: selectedNodeId === node.id,
        draggable: true
      });
    });

    // Circle 2 (Outer Orbit)
    const r2 = 320;
    const count2 = circle2Nodes.length;
    const angleStep2 = count2 > 0 ? (2 * Math.PI) / count2 : 0;

    circle2Nodes.forEach((node, i) => {
      const angle = i * angleStep2 - Math.PI / 2 + 0.2;
      const x = centerX + r2 * Math.cos(angle) - 40;
      const y = centerY + r2 * Math.sin(angle) - 30;

      nodesMap.set(node.id, {
        id: node.id,
        type: node.type,
        position: { x, y },
        data: node as any,
        selected: selectedNodeId === node.id,
        draggable: true
      });
    });

    // Edges
    graphData.edges.forEach((edge) => {
      flowEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edge.type === "same-situation",
        style: {
          stroke:
            edge.type === "same-situation"
              ? "#10b981"
              : edge.type === "interference"
              ? "#ef4444"
              : edge.type === "same-component"
              ? "#f59e0b"
              : "#94a3b8",
          strokeWidth: 2,
          strokeDasharray:
            edge.type === "same-situation"
              ? "5,5"
              : edge.type === "interference"
              ? "3,3"
              : undefined
        }
      });
    });

    return {
      initialNodes: Array.from(nodesMap.values()),
      initialEdges: flowEdges
    };
  }, [graphData, selectedNodeId]);

  // Sync state whenever graphData changes (new search query or center change)
  useEffect(() => {
    const { initialNodes, initialEdges } = computeLayout();
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [computeLayout, setNodes, setEdges]);

  // Sync selected node highlight without resetting dragged positions
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId
      }))
    );
  }, [selectedNodeId, setNodes]);

  if (!graphData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted text-sm">
        Không có dữ liệu đồ thị
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[460px] bg-bg relative rounded-2xl overflow-hidden border border-line">
      {/* Quick Reset Layout Button */}
      <button
        type="button"
        onClick={() => {
          const { initialNodes, initialEdges } = computeLayout();
          setNodes(initialNodes);
          setEdges(initialEdges);
        }}
        title="Đặt lại vị trí ban đầu của các khối"
        className="absolute top-3 right-3 z-10 px-2.5 py-1 text-xs font-semibold rounded-lg border border-line bg-card/90 backdrop-blur hover:border-accent hover:text-accent shadow-sm transition-all flex items-center gap-1.5"
      >
        <span>🔄</span>
        <span>Đặt lại vị trí</span>
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.3}
        maxZoom={2.5}
        onNodeClick={(_, node) => {
          onSelectNode(node.data as unknown as NodeData);
        }}
        onNodeDoubleClick={(_, node) => {
          const data = node.data as unknown as NodeData;
          if (onCenterChange) {
            onCenterChange(data.label);
          }
        }}
      >
        <Background gap={18} size={1} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
