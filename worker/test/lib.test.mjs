// Unit tests for the Worker's crypto/security primitives.
// Run with: node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { signJwt, verifyJwt, hashValue } from "../src/lib/auth.js";

test("password hashing round-trips", async () => {
  const hash = await hashPassword("S3cure!password");
  assert.ok(hash.startsWith("pbkdf2$sha256$100000$"));
  assert.ok(await verifyPassword("S3cure!password", hash));
  assert.ok(!(await verifyPassword("wrong", hash)));
});

test("password hashes are salted (unique per call)", async () => {
  const a = await hashPassword("samepassword");
  const b = await hashPassword("samepassword");
  assert.notEqual(a, b);
});

test("JWT sign + verify round-trips", async () => {
  const token = await signJwt({ sub: "user-1" }, "test-secret", 3600);
  const payload = await verifyJwt(token, "test-secret");
  assert.equal(payload.sub, "user-1");
});

test("JWT fails with wrong secret", async () => {
  const token = await signJwt({ sub: "user-1" }, "secret-a", 3600);
  assert.equal(await verifyJwt(token, "secret-b"), null);
});

test("JWT rejects expired tokens", async () => {
  const token = await signJwt({ sub: "user-1" }, "test-secret", -10);
  assert.equal(await verifyJwt(token, "test-secret"), null);
});

test("JWT rejects tampered tokens", async () => {
  const token = await signJwt({ sub: "user-1" }, "test-secret", 3600);
  const [h, p, s] = token.split(".");
  const tampered = `${h}.${btoa(JSON.stringify({ sub: "attacker" })).replace(/=+$/, "")}.${s}`;
  assert.equal(await verifyJwt(tampered, "test-secret"), null);
});

test("hashValue is deterministic and 64 hex chars", async () => {
  const a = await hashValue("abc");
  const b = await hashValue("abc");
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});
