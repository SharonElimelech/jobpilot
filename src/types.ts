export interface RawJob {
  source: string;
  company: string;
  title: string;
  description: string;
  location: string;
  url: string;
  postedAt: string | null; // ISO 8601 or null when the source doesn't expose it
}

export interface NormalizedJob extends RawJob {
  contentHash: string;
}

export interface ScoreResult {
  score: number;
  reasons: string[];
  missing_skills: string[];
}
