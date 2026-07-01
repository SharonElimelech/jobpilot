import test from "node:test";
import assert from "node:assert/strict";
import { formatAlert } from "../src/notify.js";

const job = {
  source: "greenhouse", company: "Wix", title: "Junior <Dev>",
  description: "", location: "Tel Aviv", url: "https://x/1",
  postedAt: new Date(Date.now() - 3600_000).toISOString(), contentHash: "h",
};
const score = { score: 88, reasons: ["React"], missing_skills: ["Docker"] };

test("fresh job gets fire emoji and escapes HTML", () => {
  const msg = formatAlert(job, score, false);
  assert.ok(msg.includes("🔥"));
  assert.ok(msg.includes("&lt;Dev&gt;"));
  assert.ok(msg.includes("88"));
  assert.ok(msg.includes("https://x/1"));
});

test("ghost job gets ghost emoji", () => {
  assert.ok(formatAlert({ ...job, postedAt: null }, score, true).includes("👻"));
});

test("old job gets no fire emoji", () => {
  const old = { ...job, postedAt: new Date(Date.now() - 3 * 86_400_000).toISOString() };
  assert.equal(formatAlert(old, score, false).includes("🔥"), false);
});
