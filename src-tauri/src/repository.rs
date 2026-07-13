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
                type TEXT NOT NULL CHECK(type IN (
                    'entry', 'book', 'model', 'paper', 'metric',
                    'dataset', 'task', 'method', 'concept', 'benchmark'
                )),
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
        "entries.flexible_types",
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
    ensure_entry_type_constraint(connection)?;
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
    let has_previous_seed = connection
        .query_row(
            "
            SELECT 1 FROM entries
            WHERE id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                'seed_paradise_lost', 'seed_waste_land', 'seed_negative_capability',
                'seed_elegy', 'seed_ekphrasis', 'seed_pastoral',
                'seed_free_indirect_discourse', 'seed_metaphysical_conceit',
                'seed_allusion'
            )
            LIMIT 1
            ",
            [],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .is_some();
    let has_cv_seed = connection
        .query_row(
            "SELECT 1 FROM entries WHERE id = 'seed_cv_foundations' LIMIT 1",
            [],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .is_some();

    if !has_previous_seed || has_cv_seed {
        return Ok(());
    }

    connection
        .execute_batch(
            "
            DELETE FROM content_blocks
            WHERE (owner_type = 'entry' AND owner_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                'seed_paradise_lost', 'seed_waste_land', 'seed_negative_capability',
                'seed_elegy', 'seed_ekphrasis', 'seed_pastoral',
                'seed_free_indirect_discourse', 'seed_metaphysical_conceit',
                'seed_allusion'
            ))
               OR (owner_type = 'book_page' AND owner_id IN (
                SELECT id FROM book_pages WHERE entry_id IN (
                    'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                    'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                    'seed_paradise_lost', 'seed_waste_land', 'seed_negative_capability',
                    'seed_elegy', 'seed_ekphrasis', 'seed_pastoral',
                    'seed_free_indirect_discourse', 'seed_metaphysical_conceit',
                    'seed_allusion'
                )
               ));

            DELETE FROM trail_items
            WHERE trail_id IN (
                'seed_trail_vlm', 'seed_trail_death_lit',
                'seed_trail_tragedy_knowledge', 'seed_trail_form_history',
                'seed_trail_mediation'
            )
               OR entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                'seed_paradise_lost', 'seed_waste_land', 'seed_negative_capability',
                'seed_elegy', 'seed_ekphrasis', 'seed_pastoral',
                'seed_free_indirect_discourse', 'seed_metaphysical_conceit',
                'seed_allusion'
               );

            DELETE FROM trails
            WHERE id IN (
                'seed_trail_vlm', 'seed_trail_death_lit',
                'seed_trail_tragedy_knowledge', 'seed_trail_form_history',
                'seed_trail_mediation'
            );

            DELETE FROM knowledge_gaps
            WHERE entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                'seed_paradise_lost', 'seed_waste_land', 'seed_negative_capability',
                'seed_elegy', 'seed_ekphrasis', 'seed_pastoral',
                'seed_free_indirect_discourse', 'seed_metaphysical_conceit',
                'seed_allusion'
            );

            DELETE FROM relations
            WHERE from_entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                'seed_paradise_lost', 'seed_waste_land', 'seed_negative_capability',
                'seed_elegy', 'seed_ekphrasis', 'seed_pastoral',
                'seed_free_indirect_discourse', 'seed_metaphysical_conceit',
                'seed_allusion'
            )
               OR to_entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                'seed_paradise_lost', 'seed_waste_land', 'seed_negative_capability',
                'seed_elegy', 'seed_ekphrasis', 'seed_pastoral',
                'seed_free_indirect_discourse', 'seed_metaphysical_conceit',
                'seed_allusion'
            );

            DELETE FROM book_pages
            WHERE entry_id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                'seed_paradise_lost', 'seed_waste_land', 'seed_negative_capability',
                'seed_elegy', 'seed_ekphrasis', 'seed_pastoral',
                'seed_free_indirect_discourse', 'seed_metaphysical_conceit',
                'seed_allusion'
            );

            DELETE FROM entries
            WHERE id IN (
                'seed_clip', 'seed_downstream_task', 'seed_contrastive_learning',
                'seed_zero_shot', 'seed_hamlet', 'seed_death', 'seed_motif',
                'seed_paradise_lost', 'seed_waste_land', 'seed_negative_capability',
                'seed_elegy', 'seed_ekphrasis', 'seed_pastoral',
                'seed_free_indirect_discourse', 'seed_metaphysical_conceit',
                'seed_allusion'
            );
            ",
        )
        .map_err(|err| err.to_string())?;

    insert_cv_seed(connection)
}

fn seed_if_empty(connection: &Connection) -> Result<(), String> {
    let count: i64 = connection
        .query_row("SELECT COUNT(*) FROM entries", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;

    if count > 0 {
        return Ok(());
    }

    insert_cv_seed(connection)
}

fn insert_cv_seed(connection: &Connection) -> Result<(), String> {
    let now = timestamp();
    let entries = [
        (
            "seed_cv_foundations",
            "Computer Vision Foundations",
            "book",
            "A broad atlas hub for the field: image formation, features, recognition, detection, segmentation, tracking, 3D perception, and multimodal vision.",
            "Computer Vision",
            vec!["overview", "geometry", "learning"],
            "1960s-present",
            "From early image understanding and projective geometry to deep visual representation learning.",
        ),
        (
            "seed_object_detection",
            "Object Detection",
            "book",
            "A mini-book for locating and classifying objects in images, including proposal-based, one-stage, anchor-free, and transformer-based detectors.",
            "Detection",
            vec!["task", "localization", "recognition"],
            "2001-present",
            "Modern detection moves from sliding windows to proposal networks, one-stage detectors, transformers, and open-vocabulary detection.",
        ),
        (
            "seed_segmentation",
            "Image Segmentation",
            "book",
            "A mini-book for semantic, instance, panoptic, and promptable segmentation.",
            "Segmentation",
            vec!["semantic segmentation", "instance segmentation", "masks"],
            "1980s-present",
            "Segmentation connects classical grouping, dense prediction, medical imaging, and promptable foundation models.",
        ),
        (
            "seed_vision_transformers",
            "Vision Transformers",
            "book",
            "A mini-book for ViT, Swin, DeiT, MAE, and transformer-based perception architectures.",
            "Architectures",
            vec!["transformer", "attention", "backbone"],
            "2020-present",
            "The ViT line reframed image recognition around patch tokens and scalable attention-based backbones.",
        ),
        (
            "seed_generative_vision",
            "Generative Vision",
            "book",
            "A mini-book for image generation, restoration, editing, and representation learning through generative objectives.",
            "Generative Models",
            vec!["diffusion", "GAN", "image synthesis"],
            "2014-present",
            "From GANs to diffusion models, generative vision became core to image distributions and controllable synthesis.",
        ),
        (
            "seed_image_classification",
            "Image Classification",
            "task",
            "Assigns one or more labels to an image. It is often the simplest benchmark for representation quality, but it hides localization, robustness, and context failures.",
            "Recognition",
            vec!["classification", "supervised learning"],
            "2012",
            "Deep CNNs became dominant after AlexNet on ImageNet.",
        ),
        (
            "seed_object_localization",
            "Object Localization",
            "task",
            "Predicts where an object appears, usually with a bounding box or region, without necessarily handling multiple instances well.",
            "Detection",
            vec!["bounding boxes", "localization"],
            "2000s",
            "Localization bridges classification and detection by requiring spatial evidence.",
        ),
        (
            "seed_semantic_segmentation",
            "Semantic Segmentation",
            "task",
            "Assigns a class label to every pixel, merging all instances of the same class into one semantic field.",
            "Segmentation",
            vec!["dense prediction", "pixel labels"],
            "2015",
            "Fully convolutional networks made end-to-end dense prediction a standard deep learning task.",
        ),
        (
            "seed_instance_segmentation",
            "Instance Segmentation",
            "task",
            "Separates individual object instances and predicts a mask for each one.",
            "Segmentation",
            vec!["masks", "instances"],
            "2017",
            "Mask R-CNN made instance masks a mainstream detection extension.",
        ),
        (
            "seed_panoptic_segmentation",
            "Panoptic Segmentation",
            "task",
            "Combines semantic segmentation for amorphous regions with instance segmentation for countable objects.",
            "Segmentation",
            vec!["stuff", "things", "panoptic"],
            "2018",
            "Panoptic segmentation unified semantic stuff regions and countable thing instances.",
        ),
        (
            "seed_depth_estimation",
            "Monocular Depth Estimation",
            "task",
            "Predicts scene depth from one image, requiring learned priors because absolute scale is under-constrained.",
            "3D Vision",
            vec!["depth", "geometry"],
            "2014-present",
            "Deep monocular depth moved from supervised NYU/KITTI training to foundation-model approaches.",
        ),
        (
            "seed_optical_flow",
            "Optical Flow",
            "task",
            "Estimates per-pixel motion between frames. Failure modes include occlusion, textureless surfaces, reflective regions, and large displacement.",
            "Motion",
            vec!["motion", "correspondence"],
            "1981-present",
            "A classical variational problem that later became a deep correspondence benchmark.",
        ),
        (
            "seed_pose_estimation",
            "Human Pose Estimation",
            "task",
            "Detects body joints or keypoints, often with top-down person crops or bottom-up grouping.",
            "Human-Centric Vision",
            vec!["keypoints", "skeletons"],
            "2016-present",
            "Deep keypoint detection is central to human activity analysis and embodied interfaces.",
        ),
        (
            "seed_visual_question_answering",
            "Visual Question Answering",
            "task",
            "Answers natural-language questions about images, mixing perception, grounding, commonsense, and dataset bias.",
            "Vision-Language",
            vec!["VQA", "multimodal"],
            "2015",
            "VQA exposed the need for joint visual grounding and language reasoning.",
        ),
        (
            "seed_image_retrieval",
            "Image Retrieval",
            "task",
            "Finds visually or semantically similar images from a collection using descriptors or learned embeddings.",
            "Retrieval",
            vec!["embedding", "search"],
            "",
            "",
        ),
        ("seed_imagenet", "ImageNet", "dataset", "A large image classification dataset organized around WordNet synsets; historically central to CNN pretraining and model comparison.", "Datasets", vec!["classification", "large-scale"], "2009", "ImageNet catalyzed large-scale supervised visual recognition and the ILSVRC benchmark."),
        ("seed_coco", "MS COCO", "dataset", "A dataset emphasizing everyday scenes with multiple objects, instance masks, captions, and contextual relationships.", "Datasets", vec!["detection", "segmentation", "captions"], "2014", "COCO became a standard benchmark for detection, segmentation, keypoints, and captions."),
        ("seed_pascal_voc", "PASCAL VOC", "dataset", "A compact benchmark suite for classification, detection, and segmentation with 20 object categories.", "Datasets", vec!["detection", "segmentation"], "2005-2012", "VOC shaped early detection and segmentation evaluation before COCO became dominant."),
        ("seed_cityscapes", "Cityscapes", "dataset", "High-quality street-scene dataset with fine semantic annotations for road, vehicles, pedestrians, signs, and urban layout.", "Datasets", vec!["driving", "segmentation"], "2016", "Cityscapes is a key urban scene understanding benchmark for autonomous driving."),
        ("seed_ade20k", "ADE20K", "dataset", "Scene parsing dataset with many object and stuff categories, often used for semantic segmentation and scene understanding.", "Datasets", vec!["scene parsing", "segmentation"], "2017", "ADE20K pushed dense scene parsing beyond object-centric datasets."),
        ("seed_kitti", "KITTI", "dataset", "Driving dataset with stereo, LiDAR, optical flow, depth, odometry, tracking, and 3D detection tasks.", "Datasets", vec!["driving", "3D detection", "depth"], "2012", "KITTI became a foundational autonomous driving benchmark."),
        ("seed_laion", "LAION-5B", "dataset", "A web-scale image-text dataset used for contrastive and generative vision-language training.", "Datasets", vec!["web-scale", "vision-language"], "2022", "LAION made large-scale image-text pretraining datasets broadly accessible."),
        ("seed_alexnet", "AlexNet", "model", "A deep CNN with ReLU activations, dropout, data augmentation, and GPU training that dramatically improved ImageNet classification.", "CNN Models", vec!["CNN", "ImageNet"], "2012", "AlexNet triggered the modern deep learning shift in computer vision."),
        ("seed_vgg", "VGGNet", "model", "A plain deep CNN family valued for its simplicity and transfer-learning utility, despite high compute cost.", "CNN Models", vec!["CNN", "backbone"], "2014", "VGG showed the value of depth and simple repeated 3x3 convolutions."),
        ("seed_inception", "Inception / GoogLeNet", "model", "A CNN architecture using parallel filters and dimensionality reduction to balance accuracy and compute.", "CNN Models", vec!["multi-scale", "CNN"], "2014", "Inception popularized multi-branch modules for efficient multi-scale processing."),
        ("seed_resnet", "ResNet", "model", "A backbone family built around identity skip connections, central to recognition, detection, segmentation, and transfer learning.", "CNN Models", vec!["residual learning", "backbone"], "2015", "Residual connections made very deep networks trainable."),
        ("seed_densenet", "DenseNet", "model", "A CNN architecture where each layer receives outputs from all earlier layers, improving gradient flow and parameter efficiency.", "CNN Models", vec!["dense connections", "feature reuse"], "2016", "DenseNet emphasized feature reuse through dense connectivity."),
        ("seed_mobilenetv2", "MobileNetV2", "model", "Uses inverted residuals and depthwise separable convolutions for mobile-friendly visual recognition.", "Efficient Models", vec!["mobile", "depthwise convolution"], "2018", "MobileNetV2 became a common efficient backbone for edge vision."),
        ("seed_efficientnet", "EfficientNet", "model", "A family of CNNs balancing accuracy and efficiency through neural architecture search and scaling rules.", "Efficient Models", vec!["compound scaling", "backbone"], "2019", "EfficientNet systematized compound scaling of depth, width, and resolution."),
        ("seed_faster_rcnn", "Faster R-CNN", "model", "A two-stage detector using a Region Proposal Network followed by ROI classification and box regression.", "Detection Models", vec!["two-stage detector", "RPN"], "2015", "Faster R-CNN integrated region proposal learning into the detector."),
        ("seed_yolo", "YOLO", "model", "A family of detectors that directly predicts object boxes and classes in one pass, emphasizing deployment speed.", "Detection Models", vec!["one-stage detector", "real-time"], "2016-present", "YOLO popularized real-time one-stage detection."),
        ("seed_ssd", "SSD", "model", "Single Shot MultiBox Detector predicts boxes from multiple feature maps at different resolutions.", "Detection Models", vec!["one-stage detector", "anchors"], "2016", "SSD made multi-scale one-stage detection practical."),
        ("seed_mask_rcnn", "Mask R-CNN", "model", "Adds a mask prediction branch and ROIAlign to two-stage detection for instance segmentation.", "Segmentation Models", vec!["instance segmentation", "ROIAlign"], "2017", "Mask R-CNN extended Faster R-CNN with high-quality instance masks."),
        ("seed_unet", "U-Net", "model", "An encoder-decoder network with skip connections that preserve localization detail for dense masks.", "Segmentation Models", vec!["medical imaging", "encoder-decoder"], "2015", "U-Net became a default architecture for biomedical segmentation."),
        ("seed_deeplab", "DeepLabv3+", "model", "A semantic segmentation model designed for multi-scale context and sharper object boundaries.", "Segmentation Models", vec!["atrous convolution", "ASPP"], "2018", "DeepLabv3+ combines atrous spatial pyramid pooling with encoder-decoder refinement."),
        ("seed_vit", "Vision Transformer", "model", "Splits an image into patches, embeds them as tokens, and applies transformer encoder layers.", "Transformer Models", vec!["ViT", "patch tokens"], "2020", "ViT showed that pure transformers can scale effectively for image recognition."),
        ("seed_swin", "Swin Transformer", "model", "Uses shifted local windows to control attention cost while producing multi-scale feature maps.", "Transformer Models", vec!["hierarchical transformer", "window attention"], "2021", "Swin adapted transformers to hierarchical dense vision tasks."),
        ("seed_detr", "DETR", "model", "Uses a transformer decoder and bipartite matching to remove anchors and non-maximum suppression from the core detector.", "Detection Models", vec!["transformer", "set prediction"], "2020", "DETR reframed detection as direct set prediction."),
        ("seed_sam", "Segment Anything Model", "model", "A segmentation foundation model that accepts points, boxes, or masks as prompts and returns object masks.", "Foundation Models", vec!["promptable segmentation", "foundation model"], "2023", "SAM made promptable segmentation a general-purpose interaction pattern."),
        ("seed_dinov2", "DINOv2", "model", "A self-supervised vision model family used as a general-purpose backbone for downstream dense and global tasks.", "Foundation Models", vec!["self-supervised", "representation"], "2023", "DINOv2 provided strong self-supervised visual features without labels."),
        ("seed_clip", "CLIP", "model", "A vision-language model trained to align images and text, enabling zero-shot classification and retrieval.", "Vision-Language Models", vec!["contrastive learning", "zero-shot"], "2021", "CLIP connected image representations to natural-language supervision at web scale."),
        ("seed_stable_diffusion", "Stable Diffusion", "model", "A latent diffusion model for text-conditioned image generation, editing, inpainting, and visual concept exploration.", "Generative Models", vec!["diffusion", "latent diffusion"], "2022", "Latent diffusion made text-to-image generation practical on commodity GPUs."),
        ("seed_alexnet_paper", "ImageNet Classification with Deep Convolutional Neural Networks", "paper", "Krizhevsky, Sutskever, and Hinton demonstrated a large CNN trained on GPUs with major ImageNet gains.", "Papers", vec!["AlexNet", "ImageNet"], "2012", "The canonical AlexNet paper."),
        ("seed_resnet_paper", "Deep Residual Learning for Image Recognition", "paper", "He et al. showed that skip connections allow networks with over 100 layers to optimize effectively.", "Papers", vec!["ResNet", "residual learning"], "2015", "The ResNet paper introduced residual blocks for very deep networks."),
        ("seed_vit_paper", "An Image is Worth 16x16 Words", "paper", "Dosovitskiy et al. treated image patches as tokens and demonstrated strong scaling with large pretraining.", "Papers", vec!["ViT", "transformer"], "2020", "The original Vision Transformer paper."),
        ("seed_detr_paper", "End-to-End Object Detection with Transformers", "paper", "Carion et al. removed many hand-designed detector components by using transformers and Hungarian matching.", "Papers", vec!["DETR", "set prediction"], "2020", "The DETR paper."),
        ("seed_mask_rcnn_paper", "Mask R-CNN Paper", "paper", "He et al. added a parallel mask branch and ROIAlign to Faster R-CNN for instance segmentation.", "Papers", vec!["Mask R-CNN", "instance segmentation"], "2017", "The Mask R-CNN paper."),
        ("seed_unet_paper", "U-Net Paper", "paper", "Ronneberger et al. proposed an encoder-decoder architecture with skip connections for biomedical segmentation.", "Papers", vec!["U-Net", "medical imaging"], "2015", "The U-Net paper."),
        ("seed_sam_paper", "Segment Anything Paper", "paper", "Kirillov et al. combined a promptable model, a data engine, and the SA-1B mask dataset.", "Papers", vec!["SAM", "promptable segmentation"], "2023", "The Segment Anything paper."),
        ("seed_clip_paper", "Learning Transferable Visual Models From Natural Language Supervision", "paper", "Radford et al. trained image-text contrastive models on internet-scale pairs for transferable zero-shot recognition.", "Papers", vec!["CLIP", "vision-language"], "2021", "The CLIP paper."),
        ("seed_mean_average_precision", "Mean Average Precision", "metric", "Detection metric averaging precision over recall levels, classes, and often IoU thresholds.", "Metrics", vec!["mAP", "detection"], "", ""),
        ("seed_iou", "Intersection over Union", "metric", "Overlap metric computed as intersection area divided by union area for boxes or masks.", "Metrics", vec!["IoU", "overlap"], "", ""),
        ("seed_dice", "Dice Coefficient", "metric", "Segmentation overlap metric emphasizing twice the intersection over summed prediction and target sizes.", "Metrics", vec!["segmentation", "medical imaging"], "", ""),
        ("seed_fid", "Frechet Inception Distance", "metric", "Compares generated and real image distributions using Gaussian statistics in Inception feature space.", "Metrics", vec!["generative models", "FID"], "2017", "Common metric for image generation quality."),
        ("seed_psnr", "PSNR", "metric", "Peak signal-to-noise ratio, common in super-resolution and restoration but often weakly aligned with perceptual quality.", "Metrics", vec!["image restoration", "signal quality"], "", ""),
        ("seed_ssim", "SSIM", "metric", "Image quality metric comparing luminance, contrast, and structure rather than raw pixel error alone.", "Metrics", vec!["image quality", "structure"], "2004", "Structural Similarity Index."),
        ("seed_top1_accuracy", "Top-1 Accuracy", "metric", "Classification metric counting examples where the highest-scoring predicted class matches the label.", "Metrics", vec!["classification", "accuracy"], "", ""),
        ("seed_panoptic_quality", "Panoptic Quality", "metric", "Combines recognition quality and segmentation quality for thing and stuff regions.", "Metrics", vec!["panoptic segmentation", "PQ"], "2018", "Metric introduced for panoptic segmentation."),
        ("seed_convolution", "Convolution", "concept", "Local weighted operation that gives CNNs useful inductive bias for images through weight sharing and locality.", "Core Concepts", vec!["filters", "translation equivariance"], "", ""),
        ("seed_feature_pyramid_network", "Feature Pyramid Network", "method", "Builds semantically strong features at multiple resolutions for objects of different sizes.", "Detection Methods", vec!["FPN", "multi-scale"], "2017", "FPN made multi-scale feature hierarchies standard in detection."),
        ("seed_non_maximum_suppression", "Non-Maximum Suppression", "method", "Post-processing method that removes duplicate detections by suppressing lower-scoring boxes with high overlap.", "Detection Methods", vec!["NMS", "post-processing"], "", ""),
        ("seed_anchor_boxes", "Anchor Boxes", "concept", "Predefined box priors used to predict object location offsets and classes at many positions and scales.", "Detection Methods", vec!["anchors", "priors"], "2015-present", "Anchor boxes shaped most pre-transformer detectors."),
        ("seed_data_augmentation", "Data Augmentation", "method", "Applies transformations such as crop, flip, color jitter, mixup, mosaic, and cutout to improve generalization.", "Training Methods", vec!["regularization", "robustness"], "", ""),
        ("seed_transfer_learning", "Transfer Learning", "method", "Uses representations learned on one dataset or task as initialization for another task.", "Training Methods", vec!["pretraining", "fine-tuning"], "", ""),
        ("seed_self_supervised_learning", "Self-Supervised Visual Pretraining", "method", "Learns useful image representations from pretext, contrastive, masked, clustering, or teacher-student objectives.", "Training Methods", vec!["SSL", "pretraining"], "2018-present", "Self-supervised learning reduced reliance on manual labels."),
        ("seed_contrastive_learning", "Contrastive Learning", "method", "Pulls related views or image-text pairs together while pushing unrelated examples apart in representation space.", "Training Methods", vec!["contrastive", "representation"], "2018-present", "Contrastive visual learning became central to self-supervised and vision-language models."),
        ("seed_diffusion_process", "Diffusion Process", "concept", "Learns to reverse a gradual noising process, often by predicting noise or denoised latents at each timestep.", "Generative Models", vec!["denoising", "score matching"], "2020-present", "Diffusion became the dominant image generation paradigm."),
        ("seed_promptable_segmentation", "Promptable Segmentation", "concept", "Segmentation conditioned on user or model prompts such as points, boxes, masks, or text-like interaction.", "Segmentation", vec!["SAM", "interactive vision"], "2023", "Promptable segmentation changed masks from fixed class predictions to interactive object selection."),
        ("seed_open_vocabulary_detection", "Open-Vocabulary Detection", "task", "Detects objects described by arbitrary text labels rather than a fixed closed category set.", "Detection", vec!["open vocabulary", "vision-language"], "2021-present", "Vision-language models enabled detectors beyond closed training categories."),
        ("seed_coco_benchmark", "COCO Detection Benchmark", "benchmark", "Benchmark protocol using AP averaged across classes and IoU thresholds from 0.50 to 0.95.", "Benchmarks", vec!["COCO", "mAP"], "2015-present", "COCO AP became the default detector comparison metric."),
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
            "seed_cv_foundations_overview",
            "seed_cv_foundations",
            "Overview",
            "Computer vision is the study of making images computationally useful.\n\n- Image formation and geometry\n- Recognition and dense prediction\n- Motion and 3D perception\n- Vision-language and generative models",
            1,
        ),
        (
            "seed_cv_foundations_axes",
            "seed_cv_foundations",
            "Core Axes",
            "- What is in the image?\n- Where is it?\n- What changed over time?\n- What 3D structure caused this 2D projection?\n- Which language concepts can ground the visual evidence?",
            2,
        ),
        (
            "seed_cv_foundations_failures",
            "seed_cv_foundations",
            "Failure Modes",
            "- Dataset bias and shortcut learning\n- Small objects and occlusion\n- Domain shift\n- Long-tail categories\n- Calibration and robustness under distribution shift",
            3,
        ),
        (
            "seed_object_detection_overview",
            "seed_object_detection",
            "Overview",
            "Detection predicts object categories and spatial boxes.\n\nThe central design tradeoff is often accuracy versus latency, with additional pressure from long-tail labels and crowded scenes.",
            1,
        ),
        (
            "seed_object_detection_families",
            "seed_object_detection",
            "Detector Families",
            "- Two-stage: R-CNN, Faster R-CNN, Mask R-CNN\n- One-stage: SSD, YOLO, RetinaNet\n- Anchor-free: FCOS, CenterNet\n- Transformer: DETR and variants\n- Open-vocabulary: CLIP-conditioned detectors",
            2,
        ),
        (
            "seed_object_detection_eval",
            "seed_object_detection",
            "Evaluation Notes",
            "COCO AP averages over IoU thresholds, so box quality matters more than in older AP@0.5 reporting.\n\nTrack small, medium, and large object AP separately.",
            3,
        ),
        (
            "seed_segmentation_overview",
            "seed_segmentation",
            "Overview",
            "Segmentation turns recognition into spatial delineation. It can mean class-level regions, individual masks, panoptic scene decomposition, or promptable masks.",
            1,
        ),
        (
            "seed_segmentation_types",
            "seed_segmentation",
            "Segmentation Types",
            "- Semantic: every pixel gets a class\n- Instance: each object instance gets a mask\n- Panoptic: things plus stuff\n- Promptable: user/model prompts condition the mask",
            2,
        ),
        (
            "seed_vision_transformers_overview",
            "seed_vision_transformers",
            "Overview",
            "Vision transformers replace fixed convolutional locality with token mixing through attention. The key questions are scale, data, inductive bias, and dense prediction adaptation.",
            1,
        ),
        (
            "seed_vision_transformers_variants",
            "seed_vision_transformers",
            "Variants",
            "- ViT: global patch tokens\n- DeiT: data-efficient training\n- Swin: shifted local windows and hierarchy\n- MAE: masked image modeling\n- DETR: transformer set prediction for detection",
            2,
        ),
        (
            "seed_generative_vision_overview",
            "seed_generative_vision",
            "Overview",
            "Generative vision models learn image distributions for synthesis, editing, restoration, representation learning, and controlled generation.",
            1,
        ),
        (
            "seed_generative_vision_diffusion",
            "seed_generative_vision",
            "Diffusion Notes",
            "Diffusion models learn denoising trajectories. Latent diffusion reduces compute by operating in compressed latent space while retaining perceptual structure.",
            2,
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
        ("seed_rel_cv_classification", "seed_cv_foundations", "seed_image_classification", "contains"),
        ("seed_rel_cv_detection", "seed_cv_foundations", "seed_object_detection", "contains"),
        ("seed_rel_cv_segmentation", "seed_cv_foundations", "seed_segmentation", "contains"),
        ("seed_rel_detection_map", "seed_object_detection", "seed_mean_average_precision", "evaluated by"),
        ("seed_rel_detection_iou", "seed_object_detection", "seed_iou", "depends on"),
        ("seed_rel_seg_iou", "seed_segmentation", "seed_iou", "evaluated by"),
        ("seed_rel_seg_dice", "seed_segmentation", "seed_dice", "evaluated by"),
        ("seed_rel_panoptic_pq", "seed_panoptic_segmentation", "seed_panoptic_quality", "evaluated by"),
        ("seed_rel_alexnet_imagenet", "seed_alexnet", "seed_imagenet", "trained on"),
        ("seed_rel_alexnet_paper", "seed_alexnet_paper", "seed_alexnet", "introduces"),
        ("seed_rel_resnet_paper", "seed_resnet_paper", "seed_resnet", "introduces"),
        ("seed_rel_vit_paper", "seed_vit_paper", "seed_vit", "introduces"),
        ("seed_rel_detr_paper", "seed_detr_paper", "seed_detr", "introduces"),
        ("seed_rel_mask_paper", "seed_mask_rcnn_paper", "seed_mask_rcnn", "introduces"),
        ("seed_rel_unet_paper", "seed_unet_paper", "seed_unet", "introduces"),
        ("seed_rel_sam_paper", "seed_sam_paper", "seed_sam", "introduces"),
        ("seed_rel_clip_paper", "seed_clip_paper", "seed_clip", "introduces"),
        ("seed_rel_faster_coco", "seed_faster_rcnn", "seed_coco", "evaluated on"),
        ("seed_rel_yolo_coco", "seed_yolo", "seed_coco", "evaluated on"),
        ("seed_rel_mask_coco", "seed_mask_rcnn", "seed_coco", "evaluated on"),
        ("seed_rel_deeplab_city", "seed_deeplab", "seed_cityscapes", "evaluated on"),
        ("seed_rel_unet_seg", "seed_unet", "seed_segmentation", "used for"),
        ("seed_rel_sam_prompt", "seed_sam", "seed_promptable_segmentation", "enables"),
        ("seed_rel_clip_open_vocab", "seed_clip", "seed_open_vocabulary_detection", "supports"),
        ("seed_rel_detr_detection", "seed_detr", "seed_object_detection", "solves"),
        ("seed_rel_fpn_detection", "seed_feature_pyramid_network", "seed_object_detection", "used in"),
        ("seed_rel_nms_detection", "seed_non_maximum_suppression", "seed_object_detection", "post-processes"),
        ("seed_rel_anchor_detection", "seed_anchor_boxes", "seed_object_detection", "parameterizes"),
        ("seed_rel_diffusion_stable", "seed_diffusion_process", "seed_stable_diffusion", "underlies"),
        ("seed_rel_stable_fid", "seed_stable_diffusion", "seed_fid", "evaluated by"),
        ("seed_rel_ssl_dino", "seed_self_supervised_learning", "seed_dinov2", "underlies"),
        ("seed_rel_contrastive_clip", "seed_contrastive_learning", "seed_clip", "underlies"),
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
            "seed_gap_detector_calibration",
            "seed_object_detection",
            "Detector calibration under domain shift",
            "Track whether confidence scores remain meaningful when detectors move from COCO-like images to production footage.",
        ),
        (
            "seed_gap_small_objects",
            "seed_object_detection",
            "Small object AP failure cases",
            "Collect examples where FPNs, anchors, or input resolution dominate detection quality.",
        ),
        (
            "seed_gap_seg_boundaries",
            "seed_segmentation",
            "Boundary quality versus region IoU",
            "Separate metrics and visual checks for boundary precision from coarse mask overlap.",
        ),
        (
            "seed_gap_vit_data_scale",
            "seed_vision_transformers",
            "ViT data scale requirements",
            "Compare when transformers need large pretraining versus when convolutional inductive bias still helps.",
        ),
        (
            "seed_gap_diffusion_eval",
            "seed_generative_vision",
            "Diffusion evaluation beyond FID",
            "Collect metrics and human-evaluation protocols for prompt alignment, diversity, artifacts, and safety.",
        ),
        (
            "seed_gap_open_vocab_long_tail",
            "seed_open_vocabulary_detection",
            "Open-vocabulary long-tail behavior",
            "Track how text prompts, base classes, and unseen categories affect detector reliability.",
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
            "seed_trail_detection_stack",
            "Object Detection Stack",
            "A route from task definition through detector families, datasets, and metrics.",
            vec![
                ("seed_object_detection", "Start with the task and problem shape."),
                ("seed_faster_rcnn", "Study two-stage proposal-based detection."),
                ("seed_yolo", "Compare one-stage real-time detection."),
                ("seed_detr", "Move to transformer set prediction."),
                ("seed_mean_average_precision", "End with the evaluation metric."),
            ],
        ),
        (
            "seed_trail_segmentation_stack",
            "Segmentation Stack",
            "A route through dense prediction, masks, promptable segmentation, and evaluation.",
            vec![
                ("seed_segmentation", "Start with segmentation variants."),
                ("seed_unet", "Study encoder-decoder masks."),
                ("seed_mask_rcnn", "Connect detection to instance masks."),
                ("seed_sam", "Move to promptable segmentation."),
            ],
        ),
        (
            "seed_trail_foundation_models",
            "Vision Foundation Models",
            "A route through scalable pretraining, vision-language alignment, and promptable vision.",
            vec![
                ("seed_self_supervised_learning", "Start with label-free visual pretraining."),
                ("seed_vit", "Study scalable transformer backbones."),
                ("seed_clip", "Add language supervision."),
                ("seed_dinov2", "Compare self-supervised foundation features."),
                ("seed_sam", "End with promptable foundation segmentation."),
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

fn ensure_entry_type_constraint(connection: &Connection) -> Result<(), String> {
    let table_sql: String = connection
        .query_row(
            "
            SELECT sql FROM sqlite_master
            WHERE type = 'table' AND name = 'entries'
            ",
            [],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if table_sql.contains("'model'") && table_sql.contains("'benchmark'") {
        return Ok(());
    }

    connection
        .execute_batch(
            "
            PRAGMA foreign_keys = OFF;
            DROP TABLE IF EXISTS entries_new;

            CREATE TABLE entries_new (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN (
                    'entry', 'book', 'model', 'paper', 'metric',
                    'dataset', 'task', 'method', 'concept', 'benchmark'
                )),
                content TEXT DEFAULT '',
                category TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                timeline_date TEXT DEFAULT '',
                timeline_note TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            INSERT INTO entries_new (
                id, title, type, content, category, tags, timeline_date, timeline_note,
                created_at, updated_at
            )
            SELECT
                id, title, type, content, category, tags, timeline_date, timeline_note,
                created_at, updated_at
            FROM entries;

            DROP TABLE entries;
            ALTER TABLE entries_new RENAME TO entries;

            PRAGMA foreign_keys = ON;
            ",
        )
        .map_err(|err| err.to_string())?;

    Ok(())
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
        "entry" | "book" | "model" | "paper" | "metric" | "dataset" | "task" | "method"
        | "concept" | "benchmark" => Ok(()),
        _ => Err(
            "Entry type must be one of entry, book, model, paper, metric, dataset, task, method, concept, or benchmark"
                .to_string(),
        ),
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
