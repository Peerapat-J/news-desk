import { describe, expect, it } from "vitest";
import { classifyArticle, dedupeArticles, selectDigestCandidates, type RawArticle } from "../src/services/rules";

const baseArticle: RawArticle = {
  id: "base",
  title: "Example",
  summary: "",
  source: "Example Source",
  sourceFolder: "Tech news",
  url: "https://example.com/article",
  publishedAt: "2026-05-07T09:00:00+07:00",
};

describe("classifyArticle", () => {
  it("classifies AI coding updates from relevant keywords", () => {
    const article = classifyArticle({
      ...baseArticle,
      title: "OpenAI Codex adds agent workflow for ChatGPT",
      source: "OpenAI",
    });

    expect(article.section).toBe("ai-coding");
    expect(article.tags[0]).toMatchObject({ label: "AI Coding", tone: "purple" });
    expect(article.score).toBeGreaterThanOrEqual(70);
  });

  it("classifies Apple developer updates from Swift/macOS keywords", () => {
    const article = classifyArticle({
      ...baseArticle,
      title: "SwiftData migration notes for macOS apps",
      sourceFolder: "Swift",
    });

    expect(article.section).toBe("apple-dev");
    expect(article.tags[0]).toMatchObject({ label: "Apple / macOS Dev", tone: "blue" });
  });

  it("classifies security updates from CVE/advisory keywords", () => {
    const article = classifyArticle({
      ...baseArticle,
      title: "GitHub Advisory warns about dependency vulnerability",
    });

    expect(article.section).toBe("dev-security");
    expect(article.tags[0].tone).toBe("red");
  });
});

describe("dedupeArticles", () => {
  it("deduplicates URL variants with query strings", () => {
    const articles = dedupeArticles([
      baseArticle,
      {
        ...baseArticle,
        id: "duplicate",
        url: "https://example.com/article?utm_source=rss",
      },
      {
        ...baseArticle,
        id: "unique",
        url: "https://example.com/other",
      },
    ]);

    expect(articles.map((article) => article.id)).toEqual(["base", "unique"]);
  });
});

describe("selectDigestCandidates", () => {
  it("keeps high-signal items and orders by score", () => {
    const candidates = selectDigestCandidates(
      [
        {
          ...baseArticle,
          id: "low",
          title: "General product update",
        },
        {
          ...baseArticle,
          id: "ai",
          title: "Claude Code MCP agent update",
          url: "https://example.com/ai",
        },
        {
          ...baseArticle,
          id: "swift",
          title: "Xcode SwiftUI release notes",
          url: "https://example.com/swift",
        },
      ],
      2,
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0].score).toBeGreaterThanOrEqual(candidates[1].score);
    expect(candidates.map((article) => article.id)).toContain("ai");
    expect(candidates.map((article) => article.id)).toContain("swift");
  });
});

