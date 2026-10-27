import { describe, it, expect } from "vitest";
import { getEdgeParams } from "../components/graph/FloatingEdge";
import { Position, type InternalNode, type Node } from "@xyflow/react";

function createMockInternalNode(
  id: string,
  type: "kanji" | "word",
  x: number,
  y: number,
  w: number,
  h: number
): InternalNode<Node> {
  return {
    id,
    type,
    position: { x, y },
    data: {},
    measured: { width: w, height: h },
    internals: {
      positionAbsolute: { x, y },
      z: 0,
      userNode: { id, type, position: { x, y }, data: {} } as any,
    },
  } as unknown as InternalNode<Node>;
}

describe("Floating Edge Dynamic Connection (Eraser.io style)", () => {
  const centerNode = createMockInternalNode("center", "kanji", 300, 300, 80, 80);

  it("1. Connects from Right of source to Left of target when target is to the right", () => {
    const rightNode = createMockInternalNode("right", "word", 500, 300, 140, 50);
    const params = getEdgeParams(centerNode, rightNode);

    expect(params.sourcePos).toBe(Position.Right);
    expect(params.targetPos).toBe(Position.Left);
    expect(params.sx).toBe(380); // right edge of center (300 + 80)
    expect(params.tx).toBe(500); // left edge of rightNode
  });

  it("2. Connects from Bottom of source to Top of target when target is below", () => {
    const bottomNode = createMockInternalNode("bottom", "word", 300, 500, 140, 50);
    const params = getEdgeParams(centerNode, bottomNode);

    expect(params.sourcePos).toBe(Position.Bottom);
    expect(params.targetPos).toBe(Position.Top);
    expect(params.sy).toBe(380); // bottom edge of center (300 + 80)
    expect(params.ty).toBe(500); // top edge of bottomNode
  });

  it("3. Connects from Left of source to Right of target when target is to the left", () => {
    const leftNode = createMockInternalNode("left", "word", 100, 300, 140, 50);
    const params = getEdgeParams(centerNode, leftNode);

    expect(params.sourcePos).toBe(Position.Left);
    expect(params.targetPos).toBe(Position.Right);
    expect(params.sx).toBe(300); // left edge of center
    expect(params.tx).toBe(240); // right edge of leftNode (100 + 140)
  });

  it("4. Connects from Top of source to Bottom of target when target is above", () => {
    const topNode = createMockInternalNode("top", "word", 300, 100, 140, 50);
    const params = getEdgeParams(centerNode, topNode);

    expect(params.sourcePos).toBe(Position.Top);
    expect(params.targetPos).toBe(Position.Bottom);
    expect(params.sy).toBe(300); // top edge of center
    expect(params.ty).toBe(150); // bottom edge of topNode (100 + 50)
  });
});
