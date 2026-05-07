import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bell,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  FolderOpen,
  Github,
  Grid2X2,
  Inbox,
  List,
  Loader2,
  Newspaper,
  RefreshCcw,
  Search,
  Settings,
  Sparkles,
  SunMedium,
  Target,
  Type,
} from "lucide-react";
import clsx from "clsx";
import type { AppSnapshot, DigestPeriod, DigestRun, NewsItem, NewsTag } from "./types";
import { importOpml, loadSnapshot, notifyDigestReady, runDigest } from "./services/tauriBridge";

const periodMeta: Record<DigestPeriod, { label: string; icon: string; empty: string }> = {
  morning: {
    label: "Morning Update",
    icon: "☀",
    empty: "ยังไม่มี morning digest สำหรับวันนี้",
  },
  evening: {
    label: "Evening Update",
    icon: "☾",
    empty: "ถ้ารอบเย็นไม่มีข่าวใหม่สำคัญ ระบบจะแสดงสถานะสั้น ๆ ตรงนี้",
  },
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function tagToneClass(tag: NewsTag) {
  return `tag-${tag.tone}`;
}

function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DigestPeriod>("morning");
  const [fontScale, setFontScale] = useState(1);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusText, setStatusText] = useState("Loading local newsroom...");

  useEffect(() => {
    loadSnapshot().then((loaded) => {
      setSnapshot(loaded);
      setSelectedPeriod(loaded.selectedPeriod);
      setStatusText("Ready");
    });
  }, []);

  const activeRun = useMemo(() => {
    if (!snapshot) return undefined;
    return snapshot.runs.find((run) => run.date === snapshot.currentDate && run.period === selectedPeriod);
  }, [selectedPeriod, snapshot]);

  const morningRun = snapshot?.runs.find((run) => run.date === snapshot.currentDate && run.period === "morning");
  const eveningRun = snapshot?.runs.find((run) => run.date === snapshot.currentDate && run.period === "evening");

  async function handleImportOpml() {
    setIsRefreshing(true);
    setStatusText("Importing NetNewsWire OPML...");
    try {
      const next = await importOpml();
      setSnapshot(next);
      setStatusText(`Imported ${next.lastImport?.feedCount ?? 0} feeds`);
    } catch (error) {
      setStatusText("OPML import failed");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRunDigest(period: DigestPeriod) {
    setIsRefreshing(true);
    setStatusText(`Running ${periodMeta[period].label}...`);
    try {
      const next = await runDigest(period);
      setSnapshot(next);
      setSelectedPeriod(period);
      const run = next.runs.find((item) => item.date === next.currentDate && item.period === period);
      if (run) {
        await notifyDigestReady("News Desk", `${periodMeta[period].label} พร้อมแล้ว • ${run.items.length} ข่าวใหม่`);
      }
      setStatusText("Digest ready");
    } catch (error) {
      setStatusText("Digest run failed");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  }

  if (!snapshot) {
    return (
      <main className="loading-screen">
        <Loader2 className="spin" size={28} />
        <p>Preparing News Desk...</p>
      </main>
    );
  }

  return (
    <div className="app-shell" style={{ "--font-scale": fontScale } as React.CSSProperties}>
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">N</div>
          <div>
            <h1>News Desk</h1>
            <p>Your daily developer digest</p>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button className="nav-item active">
            <SunMedium size={17} />
            Today
          </button>
          <button className="nav-item">
            <Inbox size={17} />
            All Updates
          </button>
          <button className="nav-item">
            <Bookmark size={17} />
            Saved
          </button>
          <button className="nav-item">
            <CheckCircle2 size={17} />
            Read
          </button>
          <button className="nav-item">
            <Archive size={17} />
            Archive
          </button>
        </nav>

        <CalendarPanel currentDate={snapshot.currentDate} />
        <SourceList sources={snapshot.sources} />

        <div className="sidebar-footer">
          <button className="nav-item">
            <Settings size={17} />
            Manage Sources
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="window-title">News Desk</div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input placeholder="Search articles..." />
              <kbd>⌘K</kbd>
            </label>
            <button className="icon-button" aria-label="Open signals">
              <Sparkles size={18} />
            </button>
            <button className="icon-button notification-button" aria-label="Notifications">
              <Bell size={18} />
              <span>2</span>
            </button>
          </div>
        </header>

        <div className="content-grid">
          <section className="digest-column">
            <div className="digest-header">
              <div>
                <h2>Today</h2>
                <p>{formatDate(snapshot.currentDate)}</p>
              </div>
              <div className="toolbar">
                <div className="segmented mini">
                  <button
                    className={clsx(viewMode === "list" && "selected")}
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                  >
                    <List size={17} />
                  </button>
                  <button
                    className={clsx(viewMode === "cards" && "selected")}
                    onClick={() => setViewMode("cards")}
                    aria-label="Card view"
                  >
                    <Grid2X2 size={17} />
                  </button>
                </div>
                <button className="filter-button">
                  <Filter size={16} />
                  Filter
                </button>
              </div>
            </div>

            <div className="period-tabs" role="tablist" aria-label="Digest periods">
              <PeriodTab
                period="morning"
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
                count={morningRun?.items.length ?? 0}
              />
              <PeriodTab
                period="evening"
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
                count={eveningRun?.items.length ?? 0}
              />
            </div>

            <div className="run-controls">
              <button className="secondary-button" onClick={handleImportOpml} disabled={isRefreshing}>
                <FolderOpen size={16} />
                Import OPML
              </button>
              <button className="primary-button" onClick={() => handleRunDigest(selectedPeriod)} disabled={isRefreshing}>
                {isRefreshing ? <Loader2 className="spin" size={16} /> : <RefreshCcw size={16} />}
                Fetch Now
              </button>
              <div className="font-control" aria-label="Font size">
                <Type size={16} />
                <input
                  type="range"
                  min="0.92"
                  max="1.12"
                  step="0.02"
                  value={fontScale}
                  onChange={(event) => setFontScale(Number(event.currentTarget.value))}
                />
              </div>
              <span className="status-pill">{statusText}</span>
            </div>

            <DigestContent run={activeRun} viewMode={viewMode} />
          </section>

          <aside className="right-rail">
            <NotificationPreview run={activeRun} />
            <ActionPanel run={activeRun} />
            <SavedPanel items={snapshot.saved} />
          </aside>
        </div>
      </main>
    </div>
  );
}

interface PeriodTabProps {
  period: DigestPeriod;
  selectedPeriod: DigestPeriod;
  setSelectedPeriod: (period: DigestPeriod) => void;
  count: number;
}

function PeriodTab({ period, selectedPeriod, setSelectedPeriod, count }: PeriodTabProps) {
  const meta = periodMeta[period];

  return (
    <button
      className={clsx("period-tab", selectedPeriod === period && "active")}
      role="tab"
      aria-selected={selectedPeriod === period}
      onClick={() => setSelectedPeriod(period)}
    >
      <span>{meta.icon}</span>
      {meta.label}
      <strong>{count}</strong>
    </button>
  );
}

function CalendarPanel({ currentDate }: { currentDate: string }) {
  const days = [
    ["27", "28", "29", "30", "1", "2", "3"],
    ["4", "5", "6", "7", "8", "9", "10"],
    ["11", "12", "13", "14", "15", "16", "17"],
    ["18", "19", "20", "21", "22", "23", "24"],
    ["25", "26", "27", "28", "29", "30", "31"],
  ];

  return (
    <section className="sidebar-section calendar-section">
      <div className="section-label">Calendar</div>
      <div className="calendar-header">
        <strong>May 2026</strong>
        <div>
          <ChevronLeft size={15} />
          <ChevronRight size={15} />
        </div>
      </div>
      <div className="calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span className="weekday" key={day}>
            {day}
          </span>
        ))}
        {days.flat().map((day, index) => (
          <span
            key={`${day}-${index}`}
            className={clsx("day", day === "7" && "selected", ["2", "12", "16"].includes(day) && "has-dot")}
          >
            {day}
          </span>
        ))}
      </div>
      <p className="tiny-note">Active archive: {formatShortDate(currentDate)}</p>
    </section>
  );
}

function SourceList({ sources }: { sources: AppSnapshot["sources"] }) {
  const icons = [Newspaper, Sparkles, FolderOpen, Github, CalendarDays, Target, Archive];

  return (
    <section className="sidebar-section">
      <div className="section-label">Sources</div>
      <div className="source-list">
        {sources.map((source, index) => {
          const Icon = icons[index % icons.length];
          return (
            <button className="source-row" key={source.id}>
              <Icon size={16} />
              <span>{source.title}</span>
              <strong>{source.unreadCount}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DigestContent({ run, viewMode }: { run?: DigestRun; viewMode: "cards" | "list" }) {
  if (!run) {
    return (
      <section className="empty-state">
        <Newspaper size={28} />
        <h3>No digest yet</h3>
        <p>Run Fetch Now or wait for the next scheduled update.</p>
      </section>
    );
  }

  if (run.status === "empty") {
    return (
      <section className="empty-state">
        <CheckCircle2 size={28} />
        <h3>No important new updates</h3>
        <p>{periodMeta[run.period].empty}</p>
      </section>
    );
  }

  const mustKnow = run.items.filter((item) => item.section === "must-know").slice(0, 3);
  const aiItems = run.items.filter((item) => item.section === "ai-coding");
  const appleItems = run.items.filter((item) => item.section === "apple-dev");
  const securityItems = run.items.filter((item) => item.section === "dev-security");

  return (
    <div className="digest-stack">
      {mustKnow.length > 0 && (
        <section>
          <div className="content-section-title">
            <Bookmark size={19} />
            <h3>Must Know</h3>
          </div>
          <div className={clsx(viewMode === "cards" ? "hero-card-grid" : "list-card-stack")}>
            {mustKnow.map((item) => (
              <NewsCard key={item.id} item={item} featured={viewMode === "cards"} />
            ))}
          </div>
        </section>
      )}

      {aiItems.length > 0 && <CompactSection title="AI Coding Tools" items={aiItems} />}
      {appleItems.length > 0 && <CompactSection title="Apple / macOS Dev" items={appleItems} />}
      {securityItems.length > 0 && <CompactSection title="General Dev / Security" items={securityItems} />}
    </div>
  );
}

function CompactSection({ title, items }: { title: string; items: NewsItem[] }) {
  return (
    <section>
      <div className="content-section-title compact">
        <Sparkles size={17} />
        <h3>{title}</h3>
      </div>
      <div className="compact-list">
        {items.map((item) => (
          <article className="compact-row" key={item.id}>
            <MiniArtwork item={item} />
            <div>
              <h4>{item.title}</h4>
              <p>{item.summary}</p>
              <div className="meta-line">
                <span>{item.source}</span>
                <span>{formatShortDate(item.publishedAt.slice(0, 10))}</span>
              </div>
            </div>
            <Tag tag={item.tags[0]} />
            <Bookmark size={18} className={clsx("save-icon", item.isSaved && "saved")} />
          </article>
        ))}
      </div>
    </section>
  );
}

function NewsCard({ item, featured }: { item: NewsItem; featured?: boolean }) {
  return (
    <article className={clsx("news-card", featured && "featured")}>
      <Artwork item={item} />
      <div className="news-card-body">
        <h4>{item.title}</h4>
        <p>{item.summary}</p>
        <div className="news-card-footer">
          <div className="source-dot">{item.source.charAt(0)}</div>
          <span>{item.source}</span>
          <span>{formatShortDate(item.publishedAt.slice(0, 10))}</span>
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}>
            <ExternalLink size={16} />
          </a>
          <Bookmark size={17} className={clsx("save-icon", item.isSaved && "saved")} />
        </div>
      </div>
    </article>
  );
}

function Artwork({ item }: { item: NewsItem }) {
  if (item.imageUrl) {
    return (
      <div className="artwork">
        <img src={item.imageUrl} alt="" />
        <Tag tag={item.tags[0]} />
      </div>
    );
  }

  return (
    <div className={clsx("artwork", artClassForItem(item), item.imageKind === "repo-preview" && "repo-art")}>
      <Tag tag={item.tags[0]} />
      {item.imageKind === "repo-preview" ? (
        <>
          <div className="repo-window">
            <div />
            <div />
            <div />
          </div>
          <div className="repo-copy">
            <strong>{item.url.replace("https://github.com/", "")}</strong>
            <span>8.9k stars • TypeScript</span>
          </div>
        </>
      ) : (
        <div className="art-copy">
          <strong>{artHeadlineForItem(item)}</strong>
          <span>{item.source}</span>
        </div>
      )}
    </div>
  );
}

function MiniArtwork({ item }: { item: NewsItem }) {
  return (
    <div className={clsx("mini-artwork", artClassForItem(item))}>
      <span>{item.source.charAt(0)}</span>
    </div>
  );
}

function artClassForItem(item: NewsItem) {
  const label = item.tags[0]?.label.toLowerCase() ?? "";
  if (item.imageKind === "repo-preview" || label.includes("github")) return "art-github-repos";
  if (label.includes("apple") || item.sourceFolder.toLowerCase().includes("swift")) return "art-apple-dev";
  if (label.includes("security")) return "art-dev-security";
  if (label.includes("ai") || item.source.toLowerCase().includes("openai") || item.source.toLowerCase().includes("anthropic")) return "art-ai-coding";
  return `art-${item.section}`;
}

function artHeadlineForItem(item: NewsItem) {
  const label = item.tags[0]?.label.toLowerCase() ?? "";
  if (item.id.includes("anthropic")) return "CLAUDE\nCODE";
  if (label.includes("apple") || item.sourceFolder.toLowerCase().includes("swift")) return "15.5";
  if (label.includes("ai")) return ">";
  return item.source.charAt(0);
}

function Tag({ tag }: { tag?: NewsTag }) {
  if (!tag) return null;
  return <span className={clsx("tag", tagToneClass(tag))}>{tag.label}</span>;
}

function NotificationPreview({ run }: { run?: DigestRun }) {
  return (
    <section className="notification-preview">
      <div className="brand-mark small">N</div>
      <div>
        <div className="notification-row">
          <strong>News Desk</strong>
          <span>now</span>
        </div>
        <h3>{run?.headline ?? "Digest พร้อมแล้ว"}</h3>
        <p>{run ? `${run.items.length} ข่าวใหม่ • Must Know ${run.items.filter((item) => item.section === "must-know").length} รายการ` : "รอรอบถัดไป"}</p>
        <div className="notification-actions">
          <button>Open</button>
          <button>Later</button>
        </div>
      </div>
    </section>
  );
}

function ActionPanel({ run }: { run?: DigestRun }) {
  return (
    <section className="rail-section">
      <div className="rail-title">
        <Target size={20} />
        <h3>Action for You</h3>
        <span>•••</span>
      </div>
      <div className="action-list">
        {(run?.actions ?? []).map((action) => (
          <article className="action-row" key={action.id}>
            <input type="checkbox" checked={action.done} readOnly />
            <div>
              <Tag tag={action.tag} />
              <p>{action.title}</p>
            </div>
            <Bookmark size={17} className={clsx(action.saved && "saved")} />
          </article>
        ))}
      </div>
    </section>
  );
}

function SavedPanel({ items }: { items: NewsItem[] }) {
  return (
    <section className="rail-section saved-panel">
      <div className="rail-title">
        <Bookmark size={20} />
        <h3>Recently Saved</h3>
      </div>
      <div className="saved-list">
        {items.map((item) => (
          <article key={item.id}>
            <div>
              <Tag tag={item.tags[0]} />
              <h4>{item.title}</h4>
              <span>{formatShortDate(item.publishedAt.slice(0, 10))}</span>
            </div>
            <MiniArtwork item={item} />
          </article>
        ))}
      </div>
      <button className="wide-button">
        View all saved
        <ExternalLink size={15} />
      </button>
    </section>
  );
}

export default App;
