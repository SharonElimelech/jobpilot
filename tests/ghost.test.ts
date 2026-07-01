import test from "node:test";
import assert from "node:assert/strict";
import { ghostFlag } from "../src/ghost.js";

const now = new Date("2026-07-01T00:00:00Z");
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

test("new job is not a ghost", () => {
  assert.equal(ghostFlag(null, now), false);
});

test("fresh continuously-listed job is not a ghost", () => {
  assert.equal(ghostFlag({ first_seen: iso(3), last_seen: iso(0.1) }, now), false);
});

test("job reappearing after 7+ day gap is a ghost", () => {
  assert.equal(ghostFlag({ first_seen: iso(30), last_seen: iso(10) }, now), true);
});

test("job listed 45+ days is a ghost", () => {
  assert.equal(ghostFlag({ first_seen: iso(50), last_seen: iso(0.1) }, now), true);
});
