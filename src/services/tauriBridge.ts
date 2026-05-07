import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import type { AppSnapshot, DigestPeriod } from "../types";
import { appSnapshot } from "../data/demoData";
import { ensureDatabase, upsertFeeds } from "./database";

export async function loadSnapshot(): Promise<AppSnapshot> {
  if (!isTauri()) {
    return appSnapshot;
  }

  try {
    await ensureDatabase();
    return await invoke<AppSnapshot>("load_snapshot");
  } catch (error) {
    console.warn("Falling back to demo snapshot", error);
    return appSnapshot;
  }
}

export async function importOpml(path = "/Users/peerapatj/Downloads/Subscriptions-OnMyMac.opml"): Promise<AppSnapshot> {
  if (!isTauri()) {
    return {
      ...appSnapshot,
      lastImport: {
        opmlPath: path,
        feedCount: appSnapshot.lastImport?.feedCount ?? appSnapshot.sources.length,
        importedAt: new Date().toISOString(),
      },
    };
  }

  const snapshot = await invoke<AppSnapshot>("import_opml", { path });
  await ensureDatabase();
  await upsertFeeds(snapshot.sources);
  return snapshot;
}

export async function runDigest(period: DigestPeriod): Promise<AppSnapshot> {
  if (!isTauri()) {
    return {
      ...appSnapshot,
      selectedPeriod: period,
    };
  }

  await ensureDatabase();
  return invoke<AppSnapshot>("run_digest", { period });
}

export async function notifyDigestReady(title: string, body: string): Promise<void> {
  if (!isTauri()) {
    return;
  }

  const granted = await isPermissionGranted();
  const permission = granted ? "granted" : await requestPermission();

  if (permission === "granted") {
    sendNotification({ title, body });
  }
}
