"use client";

import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useInternalNode,
  Position,
  type InternalNode,
  type Node,
} from "@xyflow/react";

function getNodeDimensionsAndCenter(node: InternalNode<Node>) {
  const x = node.internals?.positionAbsolute?.x ?? node.position.x;
  const y = node.internals?.positionAbsolute?.y ?? node.position.y;
  const isKanji = node.type === "kanji";
  const isCenter = (node.data as any)?.circle === 0;

  const defaultW = isKanji ? (isCenter ? 96 : 64) : (isCenter ? 160 : 130);
  const defaultH = isKanji ? (isCenter ? 96 : 64) : (isCenter ? 68 : 56);

  const w = node.measured?.width ?? defaultW;
  const h = node.measured?.height ?? defaultH;

  return {
    x: x + w / 2,
    y: y + h / 2,
    w,
    h,
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
  };
}

export function getEdgeParams(
  sourceNode: InternalNode<Node>,
  targetNode: InternalNode<Node>
) {
  const s = getNodeDimensionsAndCenter(sourceNode);
  const t = getNodeDimensionsAndCenter(targetNode);

  const dx = t.x - s.x;
  const dy = t.y - s.y;

  // Normalized distance based on half-dimensions to choose the best exit side
  const nx = dx / (s.w / 2 || 1);
  const ny = dy / (s.h / 2 || 1);

  let sourcePos: Position;
  let sx: number;
  let sy: number;

  if (Math.abs(nx) >= Math.abs(ny)) {
    if (nx >= 0) {
      sourcePos = Position.Right;
      sx = s.right;
      sy = s.y;
    } else {
      sourcePos = Position.Left;
      sx = s.left;
      sy = s.y;
    }
  } else {
    if (ny >= 0) {
      sourcePos = Position.Bottom;
      sx = s.x;
      sy = s.bottom;
    } else {
      sourcePos = Position.Top;
      sx = s.x;
      sy = s.top;
    }
  }

  // Normalized distance to choose best entry side on target facing source
  const tnx = -dx / (t.w / 2 || 1);
  const tny = -dy / (t.h / 2 || 1);

  let targetPos: Position;
  let tx: number;
  let ty: number;

  if (Math.abs(tnx) >= Math.abs(tny)) {
    if (tnx >= 0) {
      targetPos = Position.Right;
      tx = t.right;
      ty = t.y;
    } else {
      targetPos = Position.Left;
      tx = t.left;
      ty = t.y;
    }
  } else {
    if (tny >= 0) {
      targetPos = Position.Bottom;
      tx = t.x;
      ty = t.bottom;
    } else {
      targetPos = Position.Top;
      tx = t.x;
      ty = t.top;
    }
  }

  return { sx, sy, tx, ty, sourcePos, targetPos };
}

export function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
    curvature: 0.35,
  });

  const dotColor = (style?.stroke as string) || "#64748b";
  const edgeData = data as { label?: string } | undefined;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Subtle source anchor dot (phong cách Eraser.io) */}
      <circle
        cx={sx}
        cy={sy}
        r={3}
        fill={dotColor}
        className="pointer-events-none opacity-80"
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-card/95 backdrop-blur border border-line text-muted shadow-xs select-none"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
