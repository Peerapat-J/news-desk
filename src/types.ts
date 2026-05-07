export type DigestPeriod = "morning" | "evening";

export type DigestSection =
  | "must-know"
  | "ai-coding"
  | "apple-dev"
  | "github-repos"
  | "dev-security"
  | "broader-it";

export type TagTone = "purple" | "blue" | "green" | "red" | "amber" | "slate";

export interface NewsTag {
  label: string;
  tone: TagTone;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceFolder: string;
  url: string;
  publishedAt: string;
  section: DigestSection;
  tags: NewsTag[];
  imageUrl?: string;
  imageKind?: "photo" | "repo-preview" | "product-art" | "source-icon";
  score: number;
  isRead: boolean;
  isSaved: boolean;
  action?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  tag: NewsTag;
  done: boolean;
  saved: boolean;
}

export interface DigestRun {
  id: string;
  date: string;
  period: DigestPeriod;
  generatedAt: string;
  headline: string;
  status: "ready" | "empty" | "failed";
  items: NewsItem[];
  actions: ActionItem[];
}

export interface FeedSource {
  id: string;
  title: string;
  folder: string;
  url: string;
  unreadCount: number;
}

export interface AppSnapshot {
  currentDate: string;
  selectedPeriod: DigestPeriod;
  runs: DigestRun[];
  sources: FeedSource[];
  saved: NewsItem[];
  lastImport?: {
    opmlPath: string;
    feedCount: number;
    importedAt: string;
  };
}

