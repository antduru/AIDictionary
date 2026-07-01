use crate::models::{
    AppData, BookPage, BookPageInput, Entry, EntryInput, KnowledgeGap, KnowledgeGapInput,
    Relation, RelationInput,
};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;
use uuid::Uuid;

pub fn init_database(path: PathBuf) -> Result<Connection, String> {
    let connection = Connection::open(path).map_err(|err| err.to_string())?;
    connection
        .execute_batch(
            "
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('entry', 'book')),
                content TEXT DEFAULT '',
                category TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS book_pages (
                id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT DEFAULT '',
                page_order INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS relations (
                id TEXT PRIMARY KEY,
                from_entry_id TEXT NOT NULL,
                to_entry_id TEXT NOT NULL,
                relation_type TEXT DEFAULT 'related',
                note TEXT DEFAULT '',
                FOREIGN KEY(from_entry_id) REFERENCES entries(id) ON DELETE CASCADE,
                FOREIGN KEY(to_entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS knowledge_gaps (
                id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL,
                title TEXT NOT NULL,
                note TEXT DEFAULT '',
                status TEXT DEFAULT 'open' CHECK(status IN ('open', 'resolved')),
                FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );
            ",
        )
        .map_err(|err| err.to_string())?;

    seed_if_empty(&connection)?;
    Ok(connection)
}

pub fn load_app_data(connection: &Connection) -> Result<AppData, String> {
    Ok(AppData {
        entries: list_entries(connection)?,
        book_pages: list_book_pages(connection)?,
        relations: list_relations(connection)?,
        knowledge_gaps: list_knowledge_gaps(connection)?,
    })
}

pub fn create_entry(connection: &Connection, input: EntryInput) -> Result<Entry, String> {
    validate_entry_type(&input.entry_type)?;
    let now = timestamp();
    let id = Uuid::new_v4().to_string();
    let tags = tags_to_string(&input.tags)?;

    connection
        .execute(
            "
            INSERT INTO entries (id, title, type, content, category, tags, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ",
            params![
                id,
                input.title.trim(),
                input.entry_type,
                input.content,
                input.category,
                tags,
                now,
                now
            ],
        )
        .map_err(|err| err.to_string())?;

    get_entry(connection, &id)
}

pub fn update_entry(connection: &Connection, id: &str, input: EntryInput) -> Result<Entry, String> {
    validate_entry_type(&input.entry_type)?;
    let tags = tags_to_string(&input.tags)?;
    let now = timestamp();

    let changed = connection
        .execute(
            "
            UPDATE entries
            SET title = ?1, type = ?2, content = ?3, category = ?4, tags = ?5, updated_at = ?6
            WHERE id = ?7
            ",
            params![
                input.title.trim(),
                input.entry_type,
                input.content,
                input.category,
                tags,
                now,
                id
            ],
        )
        .map_err(|err| err.to_string())?;

    if changed == 0 {
        return Err("Entry not found".to_string());
    }

    get_entry(connection, id)
}

pub fn delete_entry(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM entries WHERE id = ?1", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

pub fn create_book_page(
    connection: &Connection,
    input: BookPageInput,
) -> Result<BookPage, String> {
    let now = timestamp();
    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "
            INSERT INTO book_pages (id, entry_id, title, content, page_order, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ",
            params![
                id,
                input.entry_id,
                input.title.trim(),
                input.content,
                input.page_order,
                now,
                now
            ],
        )
        .map_err(|err| err.to_string())?;

    get_book_page(connection, &id)
}

pub fn update_book_page(
    connection: &Connection,
    id: &str,
    input: BookPageInput,
) -> Result<BookPage, String> {
    let now = timestamp();
    let changed = connection
        .execute(
            "
            UPDATE book_pages
            SET entry_id = ?1, title = ?2, content = ?3, page_order = ?4, updated_at = ?5
            WHERE id = ?6
            ",
            params![
                input.entry_id,
                input.title.trim(),
                input.content,
                input.page_order,
                now,
                id
            ],
        )
        .map_err(|err| err.to_string())?;

    if changed == 0 {
        return Err("Book page not found".to_string());
    }

    get_book_page(connection, id)
}

pub fn delete_book_page(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM book_pages WHERE id = ?1", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

pub fn create_relation(
    connection: &Connection,
    input: RelationInput,
) -> Result<Relation, String> {
    if input.from_entry_id == input.to_entry_id {
        return Err("An entry cannot be related to itself".to_string());
    }

    let existing = connection
        .query_row(
            "
            SELECT id FROM relations
            WHERE from_entry_id = ?1 AND to_entry_id = ?2 AND relation_type = ?3
            ",
            params![input.from_entry_id, input.to_entry_id, input.relation_type],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| err.to_string())?;

    if let Some(id) = existing {
        return get_relation(connection, &id);
    }

    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "
            INSERT INTO relations (id, from_entry_id, to_entry_id, relation_type, note)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ",
            params![
                id,
                input.from_entry_id,
                input.to_entry_id,
                empty_default(&input.relation_type, "related"),
                input.note
            ],
        )
        .map_err(|err| err.to_string())?;

    get_relation(connection, &id)
}

pub fn delete_relation(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM relations WHERE id = ?1", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

pub fn create_knowledge_gap(
    connection: &Connection,
    input: KnowledgeGapInput,
) -> Result<KnowledgeGap, String> {
    validate_gap_status(&input.status)?;
    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "
            INSERT INTO knowledge_gaps (id, entry_id, title, note, status)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ",
            params![
                id,
                input.entry_id,
                input.title.trim(),
                input.note,
                empty_default(&input.status, "open")
            ],
        )
        .map_err(|err| err.to_string())?;

    get_knowledge_gap(connection, &id)
}

pub fn update_knowledge_gap(
    connection: &Connection,
    id: &str,
    input: KnowledgeGapInput,
) -> Result<KnowledgeGap, String> {
    validate_gap_status(&input.status)?;
    let changed = connection
        .execute(
            "
            UPDATE knowledge_gaps
            SET entry_id = ?1, title = ?2, note = ?3, status = ?4
            WHERE id = ?5
            ",
            params![
                input.entry_id,
                input.title.trim(),
                input.note,
                empty_default(&input.status, "open"),
                id
            ],
        )
        .map_err(|err| err.to_string())?;

    if changed == 0 {
        return Err("Knowledge gap not found".to_string());
    }

    get_knowledge_gap(connection, id)
}

pub fn delete_knowledge_gap(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM knowledge_gaps WHERE id = ?1", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

fn list_entries(connection: &Connection) -> Result<Vec<Entry>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, title, type, content, category, tags, created_at, updated_at
            FROM entries
            ORDER BY lower(title)
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map([], entry_from_row)
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn list_book_pages(connection: &Connection) -> Result<Vec<BookPage>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, entry_id, title, content, page_order, created_at, updated_at
            FROM book_pages
            ORDER BY entry_id, page_order, lower(title)
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map([], book_page_from_row)
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn list_relations(connection: &Connection) -> Result<Vec<Relation>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, from_entry_id, to_entry_id, relation_type, note
            FROM relations
            ORDER BY relation_type
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map([], relation_from_row)
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn list_knowledge_gaps(connection: &Connection) -> Result<Vec<KnowledgeGap>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, entry_id, title, note, status
            FROM knowledge_gaps
            ORDER BY status, lower(title)
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map([], knowledge_gap_from_row)
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn get_entry(connection: &Connection, id: &str) -> Result<Entry, String> {
    connection
        .query_row(
            "
            SELECT id, title, type, content, category, tags, created_at, updated_at
            FROM entries WHERE id = ?1
            ",
            params![id],
            entry_from_row,
        )
        .map_err(|err| err.to_string())
}

fn get_book_page(connection: &Connection, id: &str) -> Result<BookPage, String> {
    connection
        .query_row(
            "
            SELECT id, entry_id, title, content, page_order, created_at, updated_at
            FROM book_pages WHERE id = ?1
            ",
            params![id],
            book_page_from_row,
        )
        .map_err(|err| err.to_string())
}

fn get_relation(connection: &Connection, id: &str) -> Result<Relation, String> {
    connection
        .query_row(
            "
            SELECT id, from_entry_id, to_entry_id, relation_type, note
            FROM relations WHERE id = ?1
            ",
            params![id],
            relation_from_row,
        )
        .map_err(|err| err.to_string())
}

fn get_knowledge_gap(connection: &Connection, id: &str) -> Result<KnowledgeGap, String> {
    connection
        .query_row(
            "
            SELECT id, entry_id, title, note, status
            FROM knowledge_gaps WHERE id = ?1
            ",
            params![id],
            knowledge_gap_from_row,
        )
        .map_err(|err| err.to_string())
}

fn seed_if_empty(connection: &Connection) -> Result<(), String> {
    let count: i64 = connection
        .query_row("SELECT COUNT(*) FROM entries", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;

    if count > 0 {
        return Ok(());
    }

    let now = timestamp();
    let entries = [
        (
            "seed_clip",
            "CLIP",
            "book",
            "A personal mini-book for understanding Contrastive Language-Image Pre-training and its place in representation learning.",
            "Machine Learning",
            vec!["vision-language", "representation-learning"],
        ),
        (
            "seed_downstream_task",
            "Downstream Task",
            "entry",
            "A task that uses representations, checkpoints, or learned features from a prior training process.\n\nExamples include classification, retrieval, detection, ranking, or evaluation tasks built on top of a pretrained model.",
            "Machine Learning",
            vec!["evaluation", "transfer-learning"],
        ),
        (
            "seed_contrastive_learning",
            "Contrastive Learning",
            "entry",
            "A learning setup that pulls related examples closer in representation space while pushing unrelated examples apart.\n\nUseful mental handle: it teaches a model to organize similarity rather than memorize labels.",
            "Machine Learning",
            vec!["representation-learning"],
        ),
        (
            "seed_zero_shot",
            "Zero-Shot Classification",
            "entry",
            "Classification without task-specific labeled examples for the target labels.\n\nIn CLIP-style workflows, labels can be expressed as text prompts and compared with image representations.",
            "Machine Learning",
            vec!["evaluation", "classification"],
        ),
    ];

    for (id, title, entry_type, content, category, tags) in entries {
        connection
            .execute(
                "
                INSERT INTO entries (id, title, type, content, category, tags, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ",
                params![
                    id,
                    title,
                    entry_type,
                    content,
                    category,
                    tags_to_string(&tags.iter().map(|tag| tag.to_string()).collect::<Vec<_>>())?,
                    now,
                    now
                ],
            )
            .map_err(|err| err.to_string())?;
    }

    let pages = [
        (
            "seed_clip_overview",
            "Overview",
            "CLIP learns a shared image-text space.\n\n- Images and captions are embedded near each other\n- Similarity supports retrieval and classification\n- The model is often used without training a task-specific classifier",
            1,
        ),
        (
            "seed_clip_core",
            "Core Idea",
            "Instead of predicting a fixed class label, CLIP compares image representations with text representations.\n\n- Positive pairs are matched image-caption examples\n- Negative pairs are other examples in the batch\n- The objective rewards correct alignment across modalities",
            2,
        ),
        (
            "seed_clip_confusions",
            "Common Confusions",
            "- CLIP is not only an image classifier\n- Zero-shot performance depends heavily on prompts and label wording\n- Contrastive training is the training setup, not the final use case",
            3,
        ),
        (
            "seed_clip_notes",
            "My Notes",
            "Questions to revisit:\n\n- How temperature changes embedding separation\n- How prompt templates shift class scores\n- Where CLIP fails on fine-grained categories",
            4,
        ),
    ];

    for (id, title, content, page_order) in pages {
        connection
            .execute(
                "
                INSERT INTO book_pages (id, entry_id, title, content, page_order, created_at, updated_at)
                VALUES (?1, 'seed_clip', ?2, ?3, ?4, ?5, ?6)
                ",
                params![id, title, content, page_order, now, now],
            )
            .map_err(|err| err.to_string())?;
    }

    let relations = [
        ("seed_rel_clip_contrastive", "seed_contrastive_learning"),
        ("seed_rel_clip_zero_shot", "seed_zero_shot"),
        ("seed_rel_clip_downstream", "seed_downstream_task"),
    ];

    for (id, to_entry_id) in relations {
        connection
            .execute(
                "
                INSERT INTO relations (id, from_entry_id, to_entry_id, relation_type, note)
                VALUES (?1, 'seed_clip', ?2, 'related', '')
                ",
                params![id, to_entry_id],
            )
            .map_err(|err| err.to_string())?;
    }

    let gaps = [
        (
            "seed_gap_temperature",
            "Temperature scaling in CLIP",
            "Clarify how the learned temperature parameter affects contrastive logits and retrieval confidence.",
        ),
        (
            "seed_gap_prompting",
            "Prompt engineering for CLIP",
            "Collect examples of prompt templates that materially change zero-shot classification performance.",
        ),
    ];

    for (id, title, note) in gaps {
        connection
            .execute(
                "
                INSERT INTO knowledge_gaps (id, entry_id, title, note, status)
                VALUES (?1, 'seed_clip', ?2, ?3, 'open')
                ",
                params![id, title, note],
            )
            .map_err(|err| err.to_string())?;
    }

    Ok(())
}

fn entry_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Entry> {
    let tags: String = row.get(5)?;
    Ok(Entry {
        id: row.get(0)?,
        title: row.get(1)?,
        entry_type: row.get(2)?,
        content: row.get(3)?,
        category: row.get(4)?,
        tags: parse_tags(&tags),
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn book_page_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<BookPage> {
    Ok(BookPage {
        id: row.get(0)?,
        entry_id: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        page_order: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn relation_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Relation> {
    Ok(Relation {
        id: row.get(0)?,
        from_entry_id: row.get(1)?,
        to_entry_id: row.get(2)?,
        relation_type: row.get(3)?,
        note: row.get(4)?,
    })
}

fn knowledge_gap_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<KnowledgeGap> {
    Ok(KnowledgeGap {
        id: row.get(0)?,
        entry_id: row.get(1)?,
        title: row.get(2)?,
        note: row.get(3)?,
        status: row.get(4)?,
    })
}

fn tags_to_string(tags: &[String]) -> Result<String, String> {
    let cleaned = tags
        .iter()
        .map(|tag| tag.trim())
        .filter(|tag| !tag.is_empty())
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    serde_json::to_string(&cleaned).map_err(|err| err.to_string())
}

fn parse_tags(value: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(value).unwrap_or_else(|_| {
        value
            .split(',')
            .map(str::trim)
            .filter(|tag| !tag.is_empty())
            .map(ToString::to_string)
            .collect()
    })
}

fn timestamp() -> String {
    Utc::now().to_rfc3339()
}

fn empty_default(value: &str, fallback: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed.to_string()
    }
}

fn validate_entry_type(entry_type: &str) -> Result<(), String> {
    match entry_type {
        "entry" | "book" => Ok(()),
        _ => Err("Entry type must be entry or book".to_string()),
    }
}

fn validate_gap_status(status: &str) -> Result<(), String> {
    match status {
        "" | "open" | "resolved" => Ok(()),
        _ => Err("Knowledge gap status must be open or resolved".to_string()),
    }
}
