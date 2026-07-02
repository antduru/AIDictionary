use crate::models::{
    AppData, BookPage, BookPageInput, ContentBlock, ContentBlockInput, Entry, EntryInput,
    KnowledgeGap, KnowledgeGapInput, Relation, RelationInput, Trail, TrailInput, TrailItem,
    TrailItemInput,
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

            CREATE TABLE IF NOT EXISTS schema_migrations (
                id TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('entry', 'book')),
                content TEXT DEFAULT '',
                category TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                timeline_date TEXT DEFAULT '',
                timeline_note TEXT DEFAULT '',
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

            CREATE TABLE IF NOT EXISTS content_blocks (
                id TEXT PRIMARY KEY,
                owner_type TEXT NOT NULL CHECK(owner_type IN ('entry', 'book_page')),
                owner_id TEXT NOT NULL,
                block_type TEXT NOT NULL,
                content TEXT DEFAULT '',
                metadata TEXT DEFAULT '{}',
                block_order INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS relations (
                id TEXT PRIMARY KEY,
                from_entry_id TEXT NOT NULL,
                to_entry_id TEXT NOT NULL,
                relation_type TEXT NOT NULL DEFAULT 'related to',
                note TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT '',
                FOREIGN KEY(from_entry_id) REFERENCES entries(id) ON DELETE CASCADE,
                FOREIGN KEY(to_entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS knowledge_gaps (
                id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL,
                title TEXT NOT NULL,
                note TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'resolved')),
                resolved_entry_id TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT '',
                FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS trails (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS trail_items (
                id TEXT PRIMARY KEY,
                trail_id TEXT NOT NULL,
                entry_id TEXT NOT NULL,
                item_order INTEGER NOT NULL,
                note TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(trail_id) REFERENCES trails(id) ON DELETE CASCADE,
                FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE
            );
            ",
        )
        .map_err(|err| err.to_string())?;

    apply_migrations(&connection)?;
    seed_if_empty(&connection)?;
    upgrade_legacy_demo_seed(&connection)?;
    migrate_legacy_content_to_blocks(&connection)?;
    Ok(connection)
}

pub fn load_app_data(connection: &Connection) -> Result<AppData, String> {
    Ok(AppData {
        entries: list_entries(connection)?,
        book_pages: list_book_pages(connection)?,
        content_blocks: list_content_blocks(connection)?,
        relations: list_relations(connection)?,
        knowledge_gaps: list_knowledge_gaps(connection)?,
        trails: list_trails(connection)?,
        trail_items: list_trail_items(connection)?,
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
            INSERT INTO entries (
                id, title, type, content, category, tags, timeline_date, timeline_note,
                created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ",
            params![
                id,
                input.title.trim(),
                input.entry_type,
                input.content,
                input.category,
                tags,
                input.timeline_date,
                input.timeline_note,
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
            SET title = ?1, type = ?2, content = ?3, category = ?4, tags = ?5,
                timeline_date = ?6, timeline_note = ?7, updated_at = ?8
            WHERE id = ?9
            ",
            params![
                input.title.trim(),
                input.entry_type,
                input.content,
                input.category,
                tags,
                input.timeline_date,
                input.timeline_note,
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
    let page_ids = list_page_ids_for_entry(connection, id)?;
    for page_id in page_ids {
        connection
            .execute(
                "DELETE FROM content_blocks WHERE owner_type = 'book_page' AND owner_id = ?1",
                params![page_id],
            )
            .map_err(|err| err.to_string())?;
    }
    connection
        .execute(
            "DELETE FROM content_blocks WHERE owner_type = 'entry' AND owner_id = ?1",
            params![id],
        )
        .map_err(|err| err.to_string())?;
    connection
        .execute(
            "UPDATE knowledge_gaps SET resolved_entry_id = '' WHERE resolved_entry_id = ?1",
            params![id],
        )
        .map_err(|err| err.to_string())?;
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
        .execute(
            "DELETE FROM content_blocks WHERE owner_type = 'book_page' AND owner_id = ?1",
            params![id],
        )
        .map_err(|err| err.to_string())?;
    connection
        .execute("DELETE FROM book_pages WHERE id = ?1", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

pub fn replace_content_blocks(
    connection: &Connection,
    owner_type: &str,
    owner_id: &str,
    blocks: Vec<ContentBlockInput>,
) -> Result<Vec<ContentBlock>, String> {
    validate_owner_type(owner_type)?;
    for block in &blocks {
        validate_block_type(&block.block_type)?;
        validate_json_metadata(&block.metadata)?;
    }

    connection
        .execute(
            "DELETE FROM content_blocks WHERE owner_type = ?1 AND owner_id = ?2",
            params![owner_type, owner_id],
        )
        .map_err(|err| err.to_string())?;

    let now = timestamp();
    for (index, block) in blocks.iter().enumerate() {
        connection
            .execute(
                "
                INSERT INTO content_blocks (
                    id, owner_type, owner_id, block_type, content, metadata, block_order,
                    created_at, updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    owner_type,
                    owner_id,
                    block.block_type,
                    block.content,
                    metadata_default(&block.metadata),
                    block.block_order.max((index + 1) as i64),
                    now,
                    now
                ],
            )
            .map_err(|err| err.to_string())?;
    }

    let projection = blocks_to_legacy_content(connection, owner_type, owner_id)?;
    if owner_type == "entry" {
        connection
            .execute(
                "UPDATE entries SET content = ?1, updated_at = ?2 WHERE id = ?3",
                params![projection, timestamp(), owner_id],
            )
            .map_err(|err| err.to_string())?;
    } else {
        connection
            .execute(
                "UPDATE book_pages SET content = ?1, updated_at = ?2 WHERE id = ?3",
                params![projection, timestamp(), owner_id],
            )
            .map_err(|err| err.to_string())?;
    }

    list_content_blocks_for_owner(connection, owner_type, owner_id)
}

pub fn create_relation(
    connection: &Connection,
    input: RelationInput,
) -> Result<Relation, String> {
    if input.from_entry_id == input.to_entry_id {
        return Err("An entry cannot be related to itself".to_string());
    }

    let relation_type = empty_default(&input.relation_type, "related to");
    let existing = connection
        .query_row(
            "
            SELECT id FROM relations
            WHERE from_entry_id = ?1 AND to_entry_id = ?2 AND relation_type = ?3
            ",
            params![input.from_entry_id, input.to_entry_id, relation_type],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|err| err.to_string())?;

    if let Some(id) = existing {
        return get_relation(connection, &id);
    }

    let id = Uuid::new_v4().to_string();
    let now = timestamp();
    connection
        .execute(
            "
            INSERT INTO relations (
                id, from_entry_id, to_entry_id, relation_type, note, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ",
            params![
                id,
                input.from_entry_id,
                input.to_entry_id,
                relation_type,
                input.note,
                now,
                now
            ],
        )
        .map_err(|err| err.to_string())?;

    get_relation(connection, &id)
}

pub fn update_relation(
    connection: &Connection,
    id: &str,
    input: RelationInput,
) -> Result<Relation, String> {
    if input.from_entry_id == input.to_entry_id {
        return Err("An entry cannot be related to itself".to_string());
    }
    let changed = connection
        .execute(
            "
            UPDATE relations
            SET from_entry_id = ?1, to_entry_id = ?2, relation_type = ?3, note = ?4, updated_at = ?5
            WHERE id = ?6
            ",
            params![
                input.from_entry_id,
                input.to_entry_id,
                empty_default(&input.relation_type, "related to"),
                input.note,
                timestamp(),
                id
            ],
        )
        .map_err(|err| err.to_string())?;

    if changed == 0 {
        return Err("Relation not found".to_string());
    }

    get_relation(connection, id)
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
    let now = timestamp();
    connection
        .execute(
            "
            INSERT INTO knowledge_gaps (
                id, entry_id, title, note, status, resolved_entry_id, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ",
            params![
                id,
                input.entry_id,
                input.title.trim(),
                input.note,
                empty_default(&input.status, "open"),
                input.resolved_entry_id,
                now,
                now
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
            SET entry_id = ?1, title = ?2, note = ?3, status = ?4,
                resolved_entry_id = ?5, updated_at = ?6
            WHERE id = ?7
            ",
            params![
                input.entry_id,
                input.title.trim(),
                input.note,
                empty_default(&input.status, "open"),
                input.resolved_entry_id,
                timestamp(),
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

pub fn create_trail(connection: &Connection, input: TrailInput) -> Result<Trail, String> {
    let id = Uuid::new_v4().to_string();
    let now = timestamp();
    connection
        .execute(
            "
            INSERT INTO trails (id, title, description, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ",
            params![id, input.title.trim(), input.description, now, now],
        )
        .map_err(|err| err.to_string())?;
    get_trail(connection, &id)
}

pub fn update_trail(connection: &Connection, id: &str, input: TrailInput) -> Result<Trail, String> {
    let changed = connection
        .execute(
            "
            UPDATE trails
            SET title = ?1, description = ?2, updated_at = ?3
            WHERE id = ?4
            ",
            params![input.title.trim(), input.description, timestamp(), id],
        )
        .map_err(|err| err.to_string())?;

    if changed == 0 {
        return Err("Trail not found".to_string());
    }

    get_trail(connection, id)
}

pub fn delete_trail(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM trails WHERE id = ?1", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

pub fn create_trail_item(
    connection: &Connection,
    input: TrailItemInput,
) -> Result<TrailItem, String> {
    let id = Uuid::new_v4().to_string();
    let now = timestamp();
    connection
        .execute(
            "
            INSERT INTO trail_items (
                id, trail_id, entry_id, item_order, note, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ",
            params![
                id,
                input.trail_id,
                input.entry_id,
                input.item_order,
                input.note,
                now,
                now
            ],
        )
        .map_err(|err| err.to_string())?;
    get_trail_item(connection, &id)
}

pub fn update_trail_item(
    connection: &Connection,
    id: &str,
    input: TrailItemInput,
) -> Result<TrailItem, String> {
    let changed = connection
        .execute(
            "
            UPDATE trail_items
            SET trail_id = ?1, entry_id = ?2, item_order = ?3, note = ?4, updated_at = ?5
            WHERE id = ?6
            ",
            params![
                input.trail_id,
                input.entry_id,
                input.item_order,
                input.note,
                timestamp(),
                id
            ],
        )
        .map_err(|err| err.to_string())?;

    if changed == 0 {
        return Err("Trail item not found".to_string());
    }

    get_trail_item(connection, id)
}

pub fn delete_trail_item(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM trail_items WHERE id = ?1", params![id])
        .map_err(|err| err.to_string())?;
    Ok(())
}

fn apply_migrations(connection: &Connection) -> Result<(), String> {
    let migrations = [
        "entries.timeline",
        "relations.timestamps",
        "knowledge_gaps.resolution",
        "content_blocks.table",
        "trails.table",
    ];

    if !column_exists(connection, "entries", "timeline_date")? {
        connection
            .execute("ALTER TABLE entries ADD COLUMN timeline_date TEXT DEFAULT ''", [])
            .map_err(|err| err.to_string())?;
    }
    if !column_exists(connection, "entries", "timeline_note")? {
        connection
            .execute("ALTER TABLE entries ADD COLUMN timeline_note TEXT DEFAULT ''", [])
            .map_err(|err| err.to_string())?;
    }
    if !column_exists(connection, "relations", "created_at")? {
        connection
            .execute("ALTER TABLE relations ADD COLUMN created_at TEXT DEFAULT ''", [])
            .map_err(|err| err.to_string())?;
    }
    if !column_exists(connection, "relations", "updated_at")? {
        connection
            .execute("ALTER TABLE relations ADD COLUMN updated_at TEXT DEFAULT ''", [])
            .map_err(|err| err.to_string())?;
    }
    if !column_exists(connection, "knowledge_gaps", "resolved_entry_id")? {
        connection
            .execute(
                "ALTER TABLE knowledge_gaps ADD COLUMN resolved_entry_id TEXT DEFAULT ''",
                [],
            )
            .map_err(|err| err.to_string())?;
    }
    if !column_exists(connection, "knowledge_gaps", "created_at")? {
        connection
            .execute("ALTER TABLE knowledge_gaps ADD COLUMN created_at TEXT DEFAULT ''", [])
            .map_err(|err| err.to_string())?;
    }
    if !column_exists(connection, "knowledge_gaps", "updated_at")? {
        connection
            .execute("ALTER TABLE knowledge_gaps ADD COLUMN updated_at TEXT DEFAULT ''", [])
            .map_err(|err| err.to_string())?;
    }

    connection
        .execute(
            "UPDATE relations SET relation_type = 'related to' WHERE relation_type = 'related'",
            [],
        )
        .map_err(|err| err.to_string())?;
    connection
        .execute(
            "UPDATE relations SET created_at = ?1 WHERE created_at = ''",
            params![timestamp()],
        )
        .map_err(|err| err.to_string())?;
    connection
        .execute(
            "UPDATE relations SET updated_at = created_at WHERE updated_at = ''",
            [],
        )
        .map_err(|err| err.to_string())?;
    connection
        .execute(
            "UPDATE knowledge_gaps SET created_at = ?1 WHERE created_at = ''",
            params![timestamp()],
        )
        .map_err(|err| err.to_string())?;
    connection
        .execute(
            "UPDATE knowledge_gaps SET updated_at = created_at WHERE updated_at = ''",
            [],
        )
        .map_err(|err| err.to_string())?;

    for migration in migrations {
        record_migration(connection, migration)?;
    }
    Ok(())
}

fn list_entries(connection: &Connection) -> Result<Vec<Entry>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, title, type, content, category, tags, timeline_date, timeline_note,
                   created_at, updated_at
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

fn list_content_blocks(connection: &Connection) -> Result<Vec<ContentBlock>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, owner_type, owner_id, block_type, content, metadata, block_order,
                   created_at, updated_at
            FROM content_blocks
            ORDER BY owner_type, owner_id, block_order
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map([], content_block_from_row)
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn list_content_blocks_for_owner(
    connection: &Connection,
    owner_type: &str,
    owner_id: &str,
) -> Result<Vec<ContentBlock>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, owner_type, owner_id, block_type, content, metadata, block_order,
                   created_at, updated_at
            FROM content_blocks
            WHERE owner_type = ?1 AND owner_id = ?2
            ORDER BY block_order
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map(params![owner_type, owner_id], content_block_from_row)
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn list_relations(connection: &Connection) -> Result<Vec<Relation>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, from_entry_id, to_entry_id, relation_type, note, created_at, updated_at
            FROM relations
            ORDER BY lower(relation_type)
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
            SELECT id, entry_id, title, note, status, resolved_entry_id, created_at, updated_at
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

fn list_trails(connection: &Connection) -> Result<Vec<Trail>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, title, description, created_at, updated_at
            FROM trails
            ORDER BY lower(title)
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map([], trail_from_row)
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn list_trail_items(connection: &Connection) -> Result<Vec<TrailItem>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, trail_id, entry_id, item_order, note, created_at, updated_at
            FROM trail_items
            ORDER BY trail_id, item_order
            ",
        )
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map([], trail_item_from_row)
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn get_entry(connection: &Connection, id: &str) -> Result<Entry, String> {
    connection
        .query_row(
            "
            SELECT id, title, type, content, category, tags, timeline_date, timeline_note,
                   created_at, updated_at
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
            SELECT id, from_entry_id, to_entry_id, relation_type, note, created_at, updated_at
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
            SELECT id, entry_id, title, note, status, resolved_entry_id, created_at, updated_at
            FROM knowledge_gaps WHERE id = ?1
            ",
            params![id],
            knowledge_gap_from_row,
        )
        .map_err(|err| err.to_string())
}

fn get_trail(connection: &Connection, id: &str) -> Result<Trail, String> {
    connection
        .query_row(
            "
            SELECT id, title, description, created_at, updated_at
            FROM trails WHERE id = ?1
            ",
            params![id],
            trail_from_row,
        )
        .map_err(|err| err.to_string())
}

fn get_trail_item(connection: &Connection, id: &str) -> Result<TrailItem, String> {
    connection
        .query_row(
            "
            SELECT id, trail_id, entry_id, item_order, note, created_at, updated_at
            FROM trail_items WHERE id = ?1
            ",
            params![id],
            trail_item_from_row,
        )
        .map_err(|err| err.to_string())
}

fn upgrade_legacy_demo_seed(connection: &Connection) -> Result<(), String> {
    let has_legacy_seed = connection
        .query_row(
            "SELECT 1 FROM entries WHERE id = 'seed_clip' LIMIT 1",
            [],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .is_some();
    let has_literature_seed = connection
        .query_row(
            "SELECT 1 FROM entries WHERE id = 'seed_waste_land' LIMIT 1",
            [],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .is_some();

    if !has_legacy_seed || has_literature_seed {
        return Ok(());
    }

    connection
        .execute_batch(
            "
            DELETE FROM content_blocks
            WHERE owner_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                'seed_clip_overview', 'seed_clip_core', 'seed_clip_confusions',
                'seed_clip_notes', 'seed_hamlet_overview', 'seed_hamlet_motifs'
            );

            DELETE FROM trail_items
            WHERE trail_id IN ('seed_trail_vlm', 'seed_trail_death_lit')
               OR entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif'
               );

            DELETE FROM trails
            WHERE id IN ('seed_trail_vlm', 'seed_trail_death_lit');

            DELETE FROM knowledge_gaps
            WHERE entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif'
            );

            DELETE FROM relations
            WHERE from_entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif'
            )
               OR to_entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif'
            );

            DELETE FROM book_pages
            WHERE entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif'
            )
               OR id IN (
                'seed_clip_overview', 'seed_clip_core', 'seed_clip_confusions',
                'seed_clip_notes', 'seed_hamlet_overview', 'seed_hamlet_motifs'
            );

            DELETE FROM entries
            WHERE id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif'
            );
            ",
        )
        .map_err(|err| err.to_string())?;

    insert_literature_seed(connection)
}

fn seed_if_empty(connection: &Connection) -> Result<(), String> {
    let count: i64 = connection
        .query_row("SELECT COUNT(*) FROM entries", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;

    if count > 0 {
        return Ok(());
    }

    insert_literature_seed(connection)
}

fn insert_literature_seed(connection: &Connection) -> Result<(), String> {
    let now = timestamp();
    let entries = [
        (
            "seed_hamlet",
            "Hamlet",
            "book",
            "A nested atlas for reading Hamlet through sovereignty, theatrical knowledge, mourning, succession, and forms of delay.",
            "Early Modern Drama",
            vec!["Shakespeare", "tragedy", "revenge tragedy", "epistemology"],
            "1600",
            "Approximate composition period; useful for locating the play near succession anxiety and late Elizabethan theatrical culture.",
        ),
        (
            "seed_paradise_lost",
            "Paradise Lost",
            "book",
            "A Miltonic mini-book for epic form, obedience, liberty, fallenness, republican memory, and the pressure of theology on poetic syntax.",
            "Restoration Epic",
            vec!["Milton", "epic", "blank verse", "theology", "republicanism"],
            "1667",
            "First published in ten books in 1667; revised into twelve books in 1674.",
        ),
        (
            "seed_waste_land",
            "The Waste Land",
            "book",
            "A modernist mini-book for allusion, fragmentation, ritual method, urban voices, and the problem of cultural inheritance after catastrophe.",
            "Modernist Poetry",
            vec!["Eliot", "modernism", "allusion", "fragment", "ritual"],
            "1922",
            "Published in the high modernist annus mirabilis alongside Ulysses and Jacob's Room.",
        ),
        (
            "seed_negative_capability",
            "Negative Capability",
            "entry",
            "Keats's name for the poet's capacity to remain with uncertainty, mystery, and unresolved contradiction without converting them too quickly into doctrine.\n\nIn PhD-level use, treat it less as a slogan for vagueness and more as a theory of suspended epistemic mastery.",
            "Romantic Poetics",
            vec!["Keats", "Romanticism", "poetics", "uncertainty"],
            "1817",
            "Formulated in Keats's December 1817 letter to George and Thomas Keats.",
        ),
        (
            "seed_elegy",
            "Elegy",
            "entry",
            "A mode of writing organized by loss, consolation, memorial address, and the instability of surviving speech.\n\nUseful axis: public commemoration versus private grief; ritual closure versus melancholic repetition.",
            "Genre and Form",
            vec!["genre", "mourning", "lyric", "death"],
            "classical to modern",
            "A durable form that shifts from classical lament to modern meditations on historical rupture.",
        ),
        (
            "seed_ekphrasis",
            "Ekphrasis",
            "entry",
            "The verbal representation of visual art or visual experience, often staging rivalry between media, spectatorship, and interpretation.\n\nTrack who controls the gaze, what the described object withholds, and whether description becomes possession.",
            "Rhetoric and Media",
            vec!["rhetoric", "visuality", "aesthetics", "media"],
            "ancient rhetoric",
            "A classical rhetorical term that becomes central to modern theories of word-image relations.",
        ),
        (
            "seed_pastoral",
            "Pastoral",
            "entry",
            "A mode that imagines rural retreat in order to think about labor, artifice, class, enclosure, ecology, and political disappointment.\n\nDo not reduce pastoral to scenery; its force often lies in the friction between idealized withdrawal and material history.",
            "Genre and Mode",
            vec!["genre", "ecology", "class", "landscape"],
            "classical to modern",
            "From Theocritus and Virgil through Renaissance eclogue, Romantic retreat, and modern anti-pastoral.",
        ),
        (
            "seed_free_indirect_discourse",
            "Free Indirect Discourse",
            "entry",
            "A narrative technique in which third-person narration absorbs a character's idiom, judgments, or perceptual field without direct quotation.\n\nIt is especially useful for tracking irony, social cognition, and the unstable boundary between narrator and character.",
            "Narratology",
            vec!["novel", "narration", "Austen", "irony"],
            "19th century",
            "Frequently associated with Austen and later realist or modernist fiction.",
        ),
        (
            "seed_metaphysical_conceit",
            "Metaphysical Conceit",
            "entry",
            "An intellectually strenuous figure that joins remote fields of experience into a single argumentative image.\n\nIn Donne and later criticism, the conceit is not ornamental excess but a pressure point where theology, erotic address, and logical wit meet.",
            "Early Modern Poetry",
            vec!["Donne", "metaphysical poetry", "rhetoric", "wit"],
            "17th century",
            "A retrospective critical category shaped by eighteenth-century and modern accounts of metaphysical poetry.",
        ),
        (
            "seed_allusion",
            "Allusion",
            "entry",
            "A compressed reference that activates another text, tradition, myth, event, or interpretive frame without fully absorbing it.\n\nAt doctoral level, ask what allusion authorizes, excludes, misremembers, or makes newly available under historical pressure.",
            "Intertextuality",
            vec!["method", "intertextuality", "modernism", "classics"],
            "",
            "",
        ),
    ];

    for (id, title, entry_type, content, category, tags, timeline_date, timeline_note) in entries {
        connection
            .execute(
                "
                INSERT INTO entries (
                    id, title, type, content, category, tags, timeline_date, timeline_note,
                    created_at, updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                ",
                params![
                    id,
                    title,
                    entry_type,
                    content,
                    category,
                    tags_to_string(&tags.iter().map(|tag| tag.to_string()).collect::<Vec<_>>())?,
                    timeline_date,
                    timeline_note,
                    now,
                    now
                ],
            )
            .map_err(|err| err.to_string())?;
    }

    let pages = [
        (
            "seed_hamlet_overview",
            "seed_hamlet",
            "Overview",
            "Hamlet is useful as a research atlas because nearly every local problem opens into a larger scholarly route:\n\n- Succession and sovereignty\n- Mourning and theatricality\n- Revenge tragedy and legal delay\n- Surveillance, inwardness, and uncertain knowledge",
            1,
        ),
        (
            "seed_hamlet_sovereignty",
            "seed_hamlet",
            "Sovereignty and Surveillance",
            "The court is not only a setting but an information system.\n\n- Claudius governs through watching, testing, and managed spectacle\n- Hamlet's delay is partly a crisis of evidence\n- Political legitimacy becomes inseparable from performance",
            2,
        ),
        (
            "seed_hamlet_theatre",
            "seed_hamlet",
            "Theatre and Epistemology",
            "The play repeatedly asks whether performance reveals truth or merely produces another surface.\n\n- The Mousetrap converts theatre into experiment\n- Feigned madness makes sincerity unreadable\n- Soliloquy becomes both disclosure and staged self-scrutiny",
            3,
        ),
        (
            "seed_hamlet_motifs",
            "seed_hamlet",
            "Motifs to Track",
            "- Rot, rankness, and bodily corruption\n- Ears, poison, and the vulnerability of reception\n- Books, tablets, and memory as inscription\n- Skulls and theatrical objects as condensed mortality",
            4,
        ),
        (
            "seed_paradise_overview",
            "seed_paradise_lost",
            "Overview",
            "Paradise Lost turns epic scale into a problem of interpretation: how can a fallen reader judge obedience, liberty, heroism, and eloquence after the Fall?",
            1,
        ),
        (
            "seed_paradise_argument",
            "seed_paradise_lost",
            "Epic Argument",
            "- Begins in medias res but frames cosmic history as moral argument\n- Reworks classical epic machinery through Christian theology\n- Makes heroic energy suspect when it appears as Satanic charisma",
            2,
        ),
        (
            "seed_paradise_satanic_rhetoric",
            "seed_paradise_lost",
            "Satanic Rhetoric",
            "Satan's speeches are powerful because they convert injury into political theatre.\n\nResearch note: track where republican vocabulary becomes demonic self-authorization rather than simple Miltonic endorsement.",
            3,
        ),
        (
            "seed_paradise_blank_verse",
            "seed_paradise_lost",
            "Blank Verse Notes",
            "Milton's syntax delays closure, stretches causality, and asks the reader to hold theological and grammatical suspense across long verse paragraphs.",
            4,
        ),
        (
            "seed_waste_overview",
            "seed_waste_land",
            "Overview",
            "The Waste Land can be mapped as a poem of broken mediation: fragments of ritual, quotation, urban speech, prophecy, song, and scholarly annotation compete for authority.",
            1,
        ),
        (
            "seed_waste_fragment",
            "seed_waste_land",
            "Fragment and Allusion",
            "- Allusion does not simply restore tradition; it exposes tradition as damaged, partial, and overdetermined\n- Fragmentation is both historical symptom and compositional method\n- The notes stage scholarship as part of the poem's unstable apparatus",
            2,
        ),
        (
            "seed_waste_ritual",
            "seed_waste_land",
            "Ritual and Anthropology",
            "The poem borrows ritual frameworks from comparative anthropology, but the result is not a stable key. Treat Frazer and Weston as part of the poem's method of anxious pattern-making.",
            3,
        ),
        (
            "seed_waste_voices",
            "seed_waste_land",
            "Urban Voices",
            "The city appears as a pressure chamber of overheard voices, exhausted desire, commodity culture, and broken forms of address.",
            4,
        ),
    ];

    for (id, entry_id, title, content, page_order) in pages {
        connection
            .execute(
                "
                INSERT INTO book_pages (id, entry_id, title, content, page_order, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ",
                params![id, entry_id, title, content, page_order, now, now],
            )
            .map_err(|err| err.to_string())?;
    }

    let relations = [
        (
            "seed_rel_hamlet_negative_capability",
            "seed_hamlet",
            "seed_negative_capability",
            "anticipates",
        ),
        (
            "seed_rel_hamlet_elegy",
            "seed_hamlet",
            "seed_elegy",
            "disturbs",
        ),
        (
            "seed_rel_paradise_pastoral",
            "seed_paradise_lost",
            "seed_pastoral",
            "reworks",
        ),
        (
            "seed_rel_paradise_elegy",
            "seed_paradise_lost",
            "seed_elegy",
            "contains",
        ),
        (
            "seed_rel_waste_allusion",
            "seed_waste_land",
            "seed_allusion",
            "depends on",
        ),
        (
            "seed_rel_waste_elegy",
            "seed_waste_land",
            "seed_elegy",
            "modernizes",
        ),
        (
            "seed_rel_waste_pastoral",
            "seed_waste_land",
            "seed_pastoral",
            "ironizes",
        ),
        (
            "seed_rel_ekphrasis_allusion",
            "seed_ekphrasis",
            "seed_allusion",
            "overlaps with",
        ),
        (
            "seed_rel_free_indirect_negative",
            "seed_free_indirect_discourse",
            "seed_negative_capability",
            "creates space for",
        ),
        (
            "seed_rel_metaphysical_ekphrasis",
            "seed_metaphysical_conceit",
            "seed_ekphrasis",
            "contrasts with",
        ),
    ];

    for (id, from_entry_id, to_entry_id, relation_type) in relations {
        connection
            .execute(
                "
                INSERT INTO relations (
                    id, from_entry_id, to_entry_id, relation_type, note, created_at, updated_at
                )
                VALUES (?1, ?2, ?3, ?4, '', ?5, ?6)
                ",
                params![id, from_entry_id, to_entry_id, relation_type, now, now],
            )
            .map_err(|err| err.to_string())?;
    }

    let gaps = [
        (
            "seed_gap_ophelia",
            "seed_hamlet",
            "Ophelia and lyric interruption",
            "Separate Ophelia's songs as dramatic symptom, courtly archive, and gendered counter-memory.",
        ),
        (
            "seed_gap_milton_matter",
            "seed_paradise_lost",
            "Miltonic matter and monism",
            "Clarify how debates about spirit, matter, and monism affect readings of embodiment in Paradise Lost.",
        ),
        (
            "seed_gap_waste_ritual",
            "seed_waste_land",
            "Frazer, Weston, and ritual method",
            "Track when ritual anthropology functions as explanatory key, parody, or scholarly noise.",
        ),
        (
            "seed_gap_austen_woolf",
            "seed_free_indirect_discourse",
            "Austen to Woolf transition",
            "Map how free indirect discourse shifts from social irony toward interior duration and modernist perception.",
        ),
        (
            "seed_gap_antipastoral",
            "seed_pastoral",
            "Anti-pastoral after enclosure",
            "Collect examples where rural retreat exposes labor, dispossession, or ecological damage rather than harmony.",
        ),
    ];

    for (id, entry_id, title, note) in gaps {
        connection
            .execute(
                "
                INSERT INTO knowledge_gaps (
                    id, entry_id, title, note, status, resolved_entry_id, created_at, updated_at
                )
                VALUES (?1, ?2, ?3, ?4, 'open', '', ?5, ?6)
                ",
                params![id, entry_id, title, note, now, now],
            )
            .map_err(|err| err.to_string())?;
    }

    seed_trails(connection, &now)?;
    Ok(())
}

fn seed_trails(connection: &Connection, now: &str) -> Result<(), String> {
    let trails = [
        (
            "seed_trail_tragedy_knowledge",
            "Early Modern Tragedy and Knowledge",
            "A route through uncertainty, theatrical evidence, and figures of unresolved thought.",
            vec![
                (
                    "seed_hamlet",
                    "Begin with drama as an engine of uncertain evidence.",
                ),
                (
                    "seed_metaphysical_conceit",
                    "Move to difficult figuration as argumentative pressure.",
                ),
                (
                    "seed_negative_capability",
                    "End with a poetics of remaining inside uncertainty.",
                ),
            ],
        ),
        (
            "seed_trail_form_history",
            "Form, Loss, and Historical Pressure",
            "A route from elegiac form into epic fallenness and modernist fragmentation.",
            vec![
                ("seed_elegy", "Start with loss as genre and ritual problem."),
                (
                    "seed_paradise_lost",
                    "Scale loss into epic fallenness and theological history.",
                ),
                (
                    "seed_waste_land",
                    "Watch modernism inherit epic and elegy as fragments.",
                ),
            ],
        ),
        (
            "seed_trail_mediation",
            "Modes of Mediation",
            "A compact path through image, reference, narration, and interpretive distance.",
            vec![
                ("seed_ekphrasis", "Start with word-image mediation."),
                (
                    "seed_allusion",
                    "Move to reference as compressed historical relation.",
                ),
                (
                    "seed_free_indirect_discourse",
                    "End with narration as mediated consciousness.",
                ),
            ],
        ),
    ];

    for (trail_id, title, description, items) in trails {
        connection
            .execute(
                "
                INSERT INTO trails (id, title, description, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5)
                ",
                params![trail_id, title, description, now, now],
            )
            .map_err(|err| err.to_string())?;

        for (index, (entry_id, note)) in items.iter().enumerate() {
            connection
                .execute(
                    "
                    INSERT INTO trail_items (
                        id, trail_id, entry_id, item_order, note, created_at, updated_at
                    )
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                    ",
                    params![
                        format!("{trail_id}_item_{index}"),
                        trail_id,
                        entry_id,
                        (index + 1) as i64,
                        note,
                        now,
                        now
                    ],
                )
                .map_err(|err| err.to_string())?;
        }
    }

    Ok(())
}

fn migrate_legacy_content_to_blocks(connection: &Connection) -> Result<(), String> {
    let entries = list_entries(connection)?;
    for entry in entries {
        if entry.content.trim().is_empty() || owner_has_blocks(connection, "entry", &entry.id)? {
            continue;
        }
        insert_seed_block(connection, "entry", &entry.id, "markdown", &entry.content, 1)?;
    }

    let pages = list_book_pages(connection)?;
    for page in pages {
        if page.content.trim().is_empty() || owner_has_blocks(connection, "book_page", &page.id)? {
            continue;
        }
        insert_seed_block(connection, "book_page", &page.id, "markdown", &page.content, 1)?;
    }

    Ok(())
}

fn insert_seed_block(
    connection: &Connection,
    owner_type: &str,
    owner_id: &str,
    block_type: &str,
    content: &str,
    block_order: i64,
) -> Result<(), String> {
    let now = timestamp();
    connection
        .execute(
            "
            INSERT INTO content_blocks (
                id, owner_type, owner_id, block_type, content, metadata, block_order,
                created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, '{}', ?6, ?7, ?8)
            ",
            params![
                Uuid::new_v4().to_string(),
                owner_type,
                owner_id,
                block_type,
                content,
                block_order,
                now,
                now
            ],
        )
        .map_err(|err| err.to_string())?;
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
        timeline_date: row.get(6)?,
        timeline_note: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
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

fn content_block_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ContentBlock> {
    Ok(ContentBlock {
        id: row.get(0)?,
        owner_type: row.get(1)?,
        owner_id: row.get(2)?,
        block_type: row.get(3)?,
        content: row.get(4)?,
        metadata: row.get(5)?,
        block_order: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn relation_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Relation> {
    Ok(Relation {
        id: row.get(0)?,
        from_entry_id: row.get(1)?,
        to_entry_id: row.get(2)?,
        relation_type: row.get(3)?,
        note: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn knowledge_gap_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<KnowledgeGap> {
    Ok(KnowledgeGap {
        id: row.get(0)?,
        entry_id: row.get(1)?,
        title: row.get(2)?,
        note: row.get(3)?,
        status: row.get(4)?,
        resolved_entry_id: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn trail_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Trail> {
    Ok(Trail {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn trail_item_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TrailItem> {
    Ok(TrailItem {
        id: row.get(0)?,
        trail_id: row.get(1)?,
        entry_id: row.get(2)?,
        item_order: row.get(3)?,
        note: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn owner_has_blocks(connection: &Connection, owner_type: &str, owner_id: &str) -> Result<bool, String> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM content_blocks WHERE owner_type = ?1 AND owner_id = ?2",
            params![owner_type, owner_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    Ok(count > 0)
}

fn list_page_ids_for_entry(connection: &Connection, entry_id: &str) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare("SELECT id FROM book_pages WHERE entry_id = ?1")
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map(params![entry_id], |row| row.get::<_, String>(0))
        .map_err(|err| err.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn blocks_to_legacy_content(
    connection: &Connection,
    owner_type: &str,
    owner_id: &str,
) -> Result<String, String> {
    let blocks = list_content_blocks_for_owner(connection, owner_type, owner_id)?;
    let text = blocks
        .iter()
        .filter(|block| block.block_type != "divider")
        .map(|block| block.content.trim())
        .filter(|content| !content.is_empty())
        .collect::<Vec<_>>()
        .join("\n\n");
    Ok(text)
}

fn column_exists(connection: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|err| err.to_string())?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|err| err.to_string())?;
    for row in rows {
        if row.map_err(|err| err.to_string())? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

fn record_migration(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute(
            "
            INSERT OR IGNORE INTO schema_migrations (id, applied_at)
            VALUES (?1, ?2)
            ",
            params![id, timestamp()],
        )
        .map_err(|err| err.to_string())?;
    Ok(())
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

fn metadata_default(value: &str) -> String {
    empty_default(value, "{}")
}

fn validate_entry_type(entry_type: &str) -> Result<(), String> {
    match entry_type {
        "entry" | "book" => Ok(()),
        _ => Err("Entry type must be entry or book".to_string()),
    }
}

fn validate_owner_type(owner_type: &str) -> Result<(), String> {
    match owner_type {
        "entry" | "book_page" => Ok(()),
        _ => Err("Owner type must be entry or book_page".to_string()),
    }
}

fn validate_block_type(block_type: &str) -> Result<(), String> {
    match block_type {
        "heading" | "text" | "markdown" | "callout" | "link" | "image" | "table" | "code"
        | "divider" | "checklist" => Ok(()),
        _ => Err("Unsupported block type".to_string()),
    }
}

fn validate_gap_status(status: &str) -> Result<(), String> {
    match status {
        "" | "open" | "resolved" => Ok(()),
        _ => Err("Knowledge gap status must be open or resolved".to_string()),
    }
}

fn validate_json_metadata(metadata: &str) -> Result<(), String> {
    if metadata.trim().is_empty() {
        return Ok(());
    }
    serde_json::from_str::<serde_json::Value>(metadata)
        .map(|_| ())
        .map_err(|err| format!("Block metadata must be valid JSON: {err}"))
}
