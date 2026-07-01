import test from "node:test";
import assert from "node:assert/strict";
import { contentHash, isRelevantTitle, normalize } from "../src/normalize.js";

test("contentHash ignores case and extra whitespace", () => {
  assert.equal(contentHash("Wix ", "Junior  Developer"), contentHash("wix", "junior developer"));
});

test("contentHash differs for different jobs", () => {
  assert.notEqual(contentHash("Wix", "Junior Developer"), contentHash("Wix", "Senior Developer"));
});

test("isRelevantTitle accepts junior/student roles", () => {
  assert.ok(isRelevantTitle("Junior Full Stack Developer"));
  assert.ok(isRelevantTitle("Student Software Engineer"));
  assert.ok(isRelevantTitle("Frontend Developer (React)"));
  assert.ok(isRelevantTitle("מפתח פול סטאק ג'וניור"));
});

test("isRelevantTitle rejects senior roles", () => {
  assert.equal(isRelevantTitle("Senior Backend Engineer"), false);
  assert.equal(isRelevantTitle("Engineering Manager"), false);
  assert.equal(isRelevantTitle("Staff Software Engineer"), false);
  assert.equal(isRelevantTitle("Frontend Team Leader"), false);
});

test("normalize trims fields and adds hash", () => {
  const n = normalize({
    source: "greenhouse", company: " Wix ", title: " Junior Dev ",
    description: "d", location: " TLV ", url: "https://x/1", postedAt: null,
  });
  assert.equal(n.company, "Wix");
  assert.equal(n.title, "Junior Dev");
  assert.equal(n.location, "TLV");
  assert.ok(n.contentHash.length >= 16);
});
