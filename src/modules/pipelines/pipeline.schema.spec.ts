import { describe, expect, it } from "vitest";

import { createPipelineStageSchema, reorderPipelineStagesSchema } from "./pipeline.schema.js";

describe("pipeline schemas", () => {
  it("rejects an invalid stage name", () => {
    expect(createPipelineStageSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("rejects an invalid hexadecimal color", () => {
    expect(
      createPipelineStageSchema.safeParse({ name: "Valid stage", color: "blue" }).success,
    ).toBe(false);
  });

  it("rejects duplicate IDs when reordering", () => {
    const stageId = "00000000-0000-4000-8000-000000000001";

    expect(reorderPipelineStagesSchema.safeParse({ stageIds: [stageId, stageId] }).success).toBe(
      false,
    );
  });
});
