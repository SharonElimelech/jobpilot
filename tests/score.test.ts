import test from "node:test";
import assert from "node:assert/strict";
import { parseScore } from "../src/score.js";

test("parseScore parses valid JSON", () => {
  const r = parseScore('{"score": 85, "reasons": ["React match"], "missing_skills": ["Docker"]}');
  assert.equal(r.score, 85);
  assert.deepEqual(r.reasons, ["React match"]);
  assert.deepEqual(r.missing_skills, ["Docker"]);
});

test("parseScore clamps out-of-range score", () => {
  assert.equal(parseScore('{"score": 150, "reasons": [], "missing_skills": []}').score, 100);
  assert.equal(parseScore('{"score": -5, "reasons": [], "missing_skills": []}').score, 0);
});

test("parseScore throws on malformed JSON", () => {
  assert.throws(() => parseScore("not json"));
});

test("parseScore throws on missing fields", () => {
  assert.throws(() => parseScore('{"score": 50}'));
});
