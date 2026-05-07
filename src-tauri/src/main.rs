use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NewsTag {
    label: String,
    tone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NewsItem {
    id: String,
    title: String,
    summary: String,
    source: String,
    source_folder: String,
    url: String,
    published_at: String,
    section: String,
    tags: Vec<NewsTag>,
    image_kind: Option<String>,
    score: i32,
    is_read: bool,
    is_saved: bool,
    action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActionItem {
    id: String,
    title: String,
    tag: NewsTag,
    done: bool,
    saved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DigestRun {
    id: String,
    date: String,
    period: String,
    generated_at: String,
    headline: String,
    status: String,
    items: Vec<NewsItem>,
    actions: Vec<ActionItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FeedSource {
    id: String,
    title: String,
    folder: String,
    url: String,
    unread_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportInfo {
    opml_path: String,
    feed_count: usize,
    imported_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSnapshot {
    current_date: String,
    selected_period: String,
    runs: Vec<DigestRun>,
    sources: Vec<FeedSource>,
    saved: Vec<NewsItem>,
    last_import: Option<ImportInfo>,
}

#[tauri::command]
fn load_snapshot() -> AppSnapshot {
    demo_snapshot(None, "morning")
}

#[tauri::command]
fn import_opml(path: String) -> Result<AppSnapshot, String> {
    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let sources = parse_opml_sources(&content);
    let mut snapshot = demo_snapshot(Some(sources), "morning");
    let feed_count = snapshot.sources.len();
    snapshot.last_import = Some(ImportInfo {
        opml_path: path,
        feed_count,
        imported_at: Utc::now().to_rfc3339(),
    });
    Ok(snapshot)
}

#[tauri::command]
fn run_digest(period: String) -> AppSnapshot {
    demo_snapshot(None, &period)
}

fn attr_value(fragment: &str, name: &str) -> Option<String> {
    let needle = format!("{name}=\"");
    let start = fragment.find(&needle)? + needle.len();
    let rest = &fragment[start..];
    let end = rest.find('"')?;
    Some(rest[..end].replace("&amp;", "&"))
}

fn parse_opml_sources(content: &str) -> Vec<FeedSource> {
    let mut folder = "Root".to_string();
    let mut sources = Vec::new();

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if !line.starts_with("<outline") {
            continue;
        }

        if !line.contains("xmlUrl=") {
            if let Some(title) = attr_value(line, "title").or_else(|| attr_value(line, "text")) {
                folder = title;
            }
            continue;
        }

        if let Some(url) = attr_value(line, "xmlUrl") {
            let title = attr_value(line, "title")
                .or_else(|| attr_value(line, "text"))
                .unwrap_or_else(|| url.clone());
            let id = title
                .to_lowercase()
                .chars()
                .map(|character| if character.is_ascii_alphanumeric() { character } else { '-' })
                .collect::<String>()
                .trim_matches('-')
                .to_string();
            sources.push(FeedSource {
                id: if id.is_empty() { format!("feed-{}", sources.len() + 1) } else { id },
                title,
                folder: folder.clone(),
                url,
                unread_count: 0,
            });
        }
    }

    sources
}

fn tag(label: &str, tone: &str) -> NewsTag {
    NewsTag {
        label: label.to_string(),
        tone: tone.to_string(),
    }
}

fn item(
    id: &str,
    title: &str,
    summary: &str,
    source: &str,
    source_folder: &str,
    url: &str,
    section: &str,
    tag_label: &str,
    tag_tone: &str,
    image_kind: &str,
    score: i32,
    action: Option<&str>,
) -> NewsItem {
    NewsItem {
        id: id.to_string(),
        title: title.to_string(),
        summary: summary.to_string(),
        source: source.to_string(),
        source_folder: source_folder.to_string(),
        url: url.to_string(),
        published_at: "2026-05-07T09:00:00+07:00".to_string(),
        section: section.to_string(),
        tags: vec![tag(tag_label, tag_tone)],
        image_kind: Some(image_kind.to_string()),
        score,
        is_read: false,
        is_saved: id == "openai-codex",
        action: action.map(str::to_string),
    }
}

fn demo_snapshot(sources_override: Option<Vec<FeedSource>>, selected_period: &str) -> AppSnapshot {
    let sources = sources_override.unwrap_or_else(|| {
        vec![
            FeedSource { id: "apple-official".into(), title: "Apple Official".into(), folder: "Apple Official".into(), url: "https://developer.apple.com/news/rss/news.rss".into(), unread_count: 4 },
            FeedSource { id: "swift".into(), title: "Swift / Apple Dev".into(), folder: "Swift".into(), url: "https://www.swift.org/atom.xml".into(), unread_count: 6 },
            FeedSource { id: "engineering".into(), title: "Engineering".into(), folder: "Engineering".into(), url: "https://simonwillison.net/atom/everything/".into(), unread_count: 8 },
            FeedSource { id: "tech-news".into(), title: "Tech News".into(), folder: "Tech news".into(), url: "https://www.blognone.com/node/feed".into(), unread_count: 10 },
            FeedSource { id: "github".into(), title: "GitHub".into(), folder: "Tech news".into(), url: "https://github.blog/feed/".into(), unread_count: 5 },
        ]
    });

    let morning_items = vec![
        item("anthropic-limits", "Anthropic เพิ่มโควต้า Claude Code 5 ชั่วโมง และยกเลิก Peak Hours Limit", "Pro, Max, Team และ Enterprise ได้รับโควต้ารันงานยาวขึ้น 2 เท่า พร้อมเพิ่ม API limits ของ Claude Opus", "Blognone", "Tech news", "https://www.blognone.com/node/150457", "must-know", "AI Coding", "purple", "product-art", 94, Some("เช็คว่ารอบใช้งานของ Claude Code ติด 5-hour หรือ weekly cap มากกว่ากัน")),
        item("apple-beta", "Apple ปล่อย macOS 15.5 Sequoia Beta 4 สำหรับนักพัฒนา", "มาพร้อมการปรับปรุง Mail, Settings และเสถียรภาพโดยรวม มีแนวโน้มปล่อยตัวเต็มช่วงปลายเดือนนี้", "9to5Mac", "Tech news", "https://9to5mac.com/", "must-know", "Apple / macOS Dev", "blue", "product-art", 88, Some("รอ release notes ก่อนอัปเดตเครื่อง dev หลัก")),
        item("nextjs-boilerplate", "nextjs-boilerplate", "โครงสร้างเริ่มต้น Next.js 15 ที่จัดเต็มสำหรับโปรเจกต์จริง ใช้งานได้ทันที", "GitHub Trending", "GitHub / Interesting Repos", "https://github.com/ixartz/Next-js-Boilerplate", "must-know", "GitHub Repos", "green", "repo-preview", 82, Some("เปิดดูโครง CI และ folder convention เอาไอเดีย")),
        item("openai-codex", "OpenAI เปิดตัว Codex in ChatGPT สำหรับผู้ใช้ Plus, Pro, Team", "เขียนโค้ด แก้บั๊ก และรันงานใน cloud environment ได้จากแชท โดยไม่ต้องตั้งค่าเครื่อง", "OpenAI", "AI Coding Tools", "https://openai.com/", "ai-coding", "AI Coding", "purple", "source-icon", 90, None),
    ];

    let evening_items = vec![
        item("github-advisory", "GitHub Advisory Database เพิ่ม automation สำหรับ dependency review", "GitHub ขยายข้อมูล advisory และ signal สำหรับ dependency graph เพื่อช่วยทีม dev triage ช่องโหว่เร็วขึ้น", "The GitHub Blog", "Tech news", "https://github.blog/", "dev-security", "General / Security", "red", "source-icon", 81, Some("เช็คว่า repo ส่วนตัวเปิด Dependabot alerts แล้วหรือยัง")),
        item("swift-forums", "Swift Forums เปิด proposal review ใหม่เกี่ยวกับ concurrency ergonomics", "ประเด็นยังเป็น proposal review แต่เกี่ยวกับ developer experience ใน Swift 6.x ควร bookmark ไว้ดูทิศทาง", "Swift Forums", "Swift", "https://forums.swift.org/", "apple-dev", "Apple / macOS Dev", "blue", "source-icon", 74, None),
    ];

    let runs = vec![
        DigestRun {
            id: "2026-05-07-morning".into(),
            date: "2026-05-07".into(),
            period: "morning".into(),
            generated_at: "2026-05-07T09:00:00+07:00".into(),
            headline: "Morning Update พร้อมแล้ว: 4 ข่าวใหม่ + Must Know 3 รายการ".into(),
            status: "ready".into(),
            items: morning_items.clone(),
            actions: vec![
                ActionItem { id: "a1".into(), title: "ลองอัปเดต Claude Code และทดสอบโควต้า 5 ชม. ใหม่".into(), tag: tag("AI Coding", "purple"), done: false, saved: true },
                ActionItem { id: "a2".into(), title: "อัปเดต macOS Sequoia 15.5 Beta บนเครื่องทดสอบ".into(), tag: tag("Apple / macOS Dev", "blue"), done: false, saved: true },
            ],
        },
        DigestRun {
            id: "2026-05-07-evening".into(),
            date: "2026-05-07".into(),
            period: "evening".into(),
            generated_at: "2026-05-07T20:00:00+07:00".into(),
            headline: "Evening Update พร้อมแล้ว: 2 ข่าวใหม่หลังรอบเช้า".into(),
            status: "ready".into(),
            items: evening_items.clone(),
            actions: vec![
                ActionItem { id: "e1".into(), title: "เปิด Dependabot alerts สำหรับ repo ที่ยังไม่ได้เปิด".into(), tag: tag("General / Security", "red"), done: false, saved: true },
                ActionItem { id: "e2".into(), title: "Bookmark Swift proposal review ไว้อ่านตอน deep read".into(), tag: tag("Apple / macOS Dev", "blue"), done: false, saved: false },
            ],
        },
    ];

    AppSnapshot {
        current_date: "2026-05-07".into(),
        selected_period: selected_period.into(),
        runs,
        sources,
        saved: vec![morning_items[3].clone(), evening_items[0].clone(), morning_items[1].clone()],
        last_import: Some(ImportInfo {
            opml_path: "/Users/peerapatj/Downloads/Subscriptions-OnMyMac.opml".into(),
            feed_count: 28,
            imported_at: Utc::now().to_rfc3339(),
        }),
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Show News Desk", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("News Desk")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![load_snapshot, import_opml, run_digest])
        .run(tauri::generate_context!())
        .expect("error while running News Desk");
}

fn main() {
    run();
}

