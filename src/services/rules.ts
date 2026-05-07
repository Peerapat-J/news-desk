import type { DigestSection, NewsTag } from "../types";

export interface RawArticle {
  id: string;
  title: string;
  summary?: string;
  source: string;
  sourceFolder: string;
  url: string;
  publishedAt: string;
}

export interface ClassifiedArticle extends RawArticle {
  section: DigestSection;
  tags: NewsTag[];
  score: number;
}

const sectionRules: Array<{
  section: DigestSection;
  tag: NewsTag;
  scoreBoost: number;
  keywords: string[];
}> = [
  {
    section: "ai-coding",
    tag: { label: "AI Coding", tone: "purple" },
    scoreBoost: 24,
    keywords: ["codex", "claude code", "chatgpt", "cursor", "copilot", "agent", "mcp", "openai", "anthropic"],
  },
  {
    section: "apple-dev",
    tag: { label: "Apple / macOS Dev", tone: "blue" },
    scoreBoost: 22,
    keywords: ["xcode", "swiftui", "swiftdata", "swift", "macos", "app store", "testflight", "screen capturekit"],
  },
  {
    section: "github-repos",
    tag: { label: "GitHub Repos", tone: "green" },
    scoreBoost: 20,
    keywords: ["github", "repository", "repo", "open source", "trending", "cli", "library", "framework"],
  },
  {
    section: "dev-security",
    tag: { label: "General / Security", tone: "red" },
    scoreBoost: 18,
    keywords: ["cve", "security", "vulnerability", "advisory", "supply chain", "dependency", "malware", "patch"],
  },
  {
    section: "broader-it",
    tag: { label: "Broader IT", tone: "amber" },
    scoreBoost: 10,
    keywords: ["platform", "pricing", "privacy", "cloud", "aws", "microsoft", "google", "apple"],
  },
];

export function classifyArticle(article: RawArticle): ClassifiedArticle {
  const haystack = `${article.title} ${article.summary ?? ""} ${article.source} ${article.sourceFolder}`.toLowerCase();
  const matched = sectionRules
    .map((rule) => ({
      ...rule,
      matches: rule.keywords.filter((keyword) => haystack.includes(keyword)).length,
    }))
    .sort((left, right) => right.matches - left.matches || right.scoreBoost - left.scoreBoost)[0];

  const score = Math.min(100, 44 + matched.scoreBoost + matched.matches * 8);

  return {
    ...article,
    section: matched.matches > 0 ? matched.section : "broader-it",
    tags: [matched.matches > 0 ? matched.tag : { label: "Broader IT", tone: "amber" }],
    score,
  };
}

export function dedupeArticles<T extends RawArticle>(articles: T[]): T[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = normalizeKey(article.url || article.title);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function selectDigestCandidates(articles: RawArticle[], limit = 24): ClassifiedArticle[] {
  return dedupeArticles(articles)
    .map(classifyArticle)
    .filter((article) => article.score >= 54)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "");
}

