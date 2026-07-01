import { readFileSync } from "node:fs";
import type { RawJob } from "../types.js";
import { fetchGreenhouse } from "./greenhouse.js";
import { fetchLever } from "./lever.js";

export interface Source {
  name: string;
  fetchJobs(): Promise<RawJob[]>;
}

interface Companies {
  greenhouse: { slug: string; company: string }[];
  lever: { slug: string; company: string }[];
  comeet: { slug: string; company: string }[];
}

export function buildSources(): Source[] {
  const companies = JSON.parse(readFileSync("companies.json", "utf8")) as Companies;
  return [
    ...companies.greenhouse.map((c) => ({
      name: `greenhouse:${c.slug}`,
      fetchJobs: () => fetchGreenhouse(c.slug, c.company),
    })),
    ...companies.lever.map((c) => ({
      name: `lever:${c.slug}`,
      fetchJobs: () => fetchLever(c.slug, c.company),
    })),
  ];
}
