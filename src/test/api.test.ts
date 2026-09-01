import { describe, it, expect } from "vitest";
import { unwrapArray, unwrapKey } from "../lib/api";

describe("api response normalization", () => {
  it("passes through an already-array response", () => {
    const input = [1, 2, 3];
    expect(unwrapArray(input)).toEqual([1, 2, 3]);
  });

  it("extracts the first array from a wrapped {key:[...]} response", () => {
    expect(unwrapArray({ posts: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it("returns [] for empty/unknown responses", () => {
    expect(unwrapArray({})).toEqual([]);
    expect(unwrapArray(null)).toEqual([]);
    expect(unwrapArray("nope")).toEqual([]);
  });

  it("unwraps a specific key from a wrapped object", () => {
    expect(unwrapKey({ event: { id: "e1" } }, "event")).toEqual({ id: "e1" });
  });

  it("returns the data unchanged when the key is absent", () => {
    const data = { title: "x" };
    expect(unwrapKey(data, "event")).toBe(data);
  });
});
