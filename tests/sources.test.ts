import test from "node:test";
import assert from "node:assert/strict";
import { mapGreenhouseJob } from "../src/sources/greenhouse.js";
import { mapLeverJob } from "../src/sources/lever.js";

test("mapGreenhouseJob maps and strips HTML", () => {
  const j = mapGreenhouseJob({
    title: "Junior Developer",
    absolute_url: "https://boards.greenhouse.io/wix/jobs/1",
    location: { name: "Tel Aviv" },
    updated_at: "2026-06-30T10:00:00Z",
    content: "&lt;p&gt;Build &lt;b&gt;cool&lt;/b&gt; stuff&lt;/p&gt;",
  }, "Wix");
  assert.equal(j.source, "greenhouse");
  assert.equal(j.company, "Wix");
  assert.equal(j.title, "Junior Developer");
  assert.equal(j.location, "Tel Aviv");
  assert.ok(j.description.includes("cool stuff"));
  assert.equal(j.description.includes("<"), false);
});

test("mapLeverJob maps fields", () => {
  const j = mapLeverJob({
    text: "Junior Backend Engineer",
    hostedUrl: "https://jobs.lever.co/fireblocks/abc",
    categories: { location: "Tel Aviv" },
    createdAt: 1751300000000,
    descriptionPlain: "Node.js role",
  }, "Fireblocks");
  assert.equal(j.source, "lever");
  assert.equal(j.title, "Junior Backend Engineer");
  assert.equal(j.location, "Tel Aviv");
  assert.equal(j.postedAt, new Date(1751300000000).toISOString());
});
