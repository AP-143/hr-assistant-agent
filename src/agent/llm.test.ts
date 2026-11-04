import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripReasoning } from "./llm.js";

describe("stripReasoning", () => {
  it("keeps plain answers untouched", () => {
    assert.equal(stripReasoning("12 hari kerja."), "12 hari kerja.");
  });

  it("drops a full <think>...</think> block", () => {
    assert.equal(stripReasoning("<think>hmm</think>\n\n12 hari."), "12 hari.");
  });

  it("drops reasoning that only has the closing tag", () => {
    assert.equal(stripReasoning("Okay, let me see...\nWait.\n</think>\n\n7 hari"), "7 hari");
  });

  it("returns an empty string for an empty reply", () => {
    assert.equal(stripReasoning(""), "");
  });
});
