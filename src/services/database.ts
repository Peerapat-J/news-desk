import { isTauri } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import type { FeedSource } from "../types";

let databasePromise: Promise<Database> | undefined;

export async function getDatabase() {
  if (!isTauri()) {
    return undefined;
  }

  databasePromise ??= Database.load("sqlite:news-desk.db");
  return databasePromise;
}

export async function ensureDatabase() {
  const db = await getDatabase();
  if (!db) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      folder TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      unread_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      feed_id TEXT,
      title TEXT NOT NULL,
      summary TEXT,
      source TEXT NOT NULL,
      source_folder TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      published_at TEXT,
      image_url TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(feed_id) REFERENCES feeds(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS digest_runs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      period TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      headline TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, period)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS digest_items (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      article_id TEXT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source TEXT NOT NULL,
      source_folder TEXT NOT NULL,
      url TEXT NOT NULL,
      section TEXT NOT NULL,
      score INTEGER NOT NULL,
      action TEXT,
      tags_json TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      is_saved INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(run_id) REFERENCES digest_runs(id),
      FOREIGN KEY(article_id) REFERENCES articles(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function upsertFeeds(feeds: FeedSource[]) {
  const db = await getDatabase();
  if (!db) return;

  for (const feed of feeds) {
    await db.execute(
      `
        INSERT INTO feeds (id, title, folder, url, unread_count, updated_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT(url) DO UPDATE SET
          title = excluded.title,
          folder = excluded.folder,
          unread_count = excluded.unread_count,
          updated_at = CURRENT_TIMESTAMP
      `,
      [feed.id, feed.title, feed.folder, feed.url, feed.unreadCount],
    );
  }
}

