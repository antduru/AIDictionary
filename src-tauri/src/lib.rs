mod models;
mod repository;

use repository::{
    create_book_page as repo_create_book_page, create_entry as repo_create_entry,
    create_knowledge_gap as repo_create_knowledge_gap, create_relation as repo_create_relation,
    create_trail as repo_create_trail, create_trail_item as repo_create_trail_item,
    delete_book_page as repo_delete_book_page, delete_entry as repo_delete_entry,
    delete_knowledge_gap as repo_delete_knowledge_gap, delete_relation as repo_delete_relation,
    delete_trail as repo_delete_trail, delete_trail_item as repo_delete_trail_item, init_database,
    load_app_data as repo_load_app_data, replace_content_blocks as repo_replace_content_blocks,
    update_book_page as repo_update_book_page, update_entry as repo_update_entry,
    update_knowledge_gap as repo_update_knowledge_gap, update_relation as repo_update_relation,
    update_trail as repo_update_trail, update_trail_item as repo_update_trail_item,
};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{Manager, State};

pub use models::{
    AppData, BookPage, BookPageInput, ContentBlock, ContentBlockInput, Entry, EntryInput,
    KnowledgeGap, KnowledgeGapInput, Relation, RelationInput, Trail, TrailInput, TrailItem,
    TrailItemInput,
};

struct DbState {
    connection: Mutex<Connection>,
}

#[tauri::command]
fn load_app_data(state: State<'_, DbState>) -> Result<AppData, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_load_app_data(&connection)
}

#[tauri::command]
fn create_entry(state: State<'_, DbState>, input: EntryInput) -> Result<Entry, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_create_entry(&connection, input)
}

#[tauri::command]
fn update_entry(state: State<'_, DbState>, id: String, input: EntryInput) -> Result<Entry, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_update_entry(&connection, &id, input)
}

#[tauri::command]
fn delete_entry(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_delete_entry(&connection, &id)
}

#[tauri::command]
fn create_book_page(
    state: State<'_, DbState>,
    input: BookPageInput,
) -> Result<BookPage, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_create_book_page(&connection, input)
}

#[tauri::command]
fn update_book_page(
    state: State<'_, DbState>,
    id: String,
    input: BookPageInput,
) -> Result<BookPage, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_update_book_page(&connection, &id, input)
}

#[tauri::command]
fn delete_book_page(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_delete_book_page(&connection, &id)
}

#[tauri::command]
fn replace_content_blocks(
    state: State<'_, DbState>,
    owner_type: String,
    owner_id: String,
    blocks: Vec<ContentBlockInput>,
) -> Result<Vec<ContentBlock>, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_replace_content_blocks(&connection, &owner_type, &owner_id, blocks)
}

#[tauri::command]
fn create_relation(state: State<'_, DbState>, input: RelationInput) -> Result<Relation, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_create_relation(&connection, input)
}

#[tauri::command]
fn update_relation(
    state: State<'_, DbState>,
    id: String,
    input: RelationInput,
) -> Result<Relation, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_update_relation(&connection, &id, input)
}

#[tauri::command]
fn delete_relation(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_delete_relation(&connection, &id)
}

#[tauri::command]
fn create_knowledge_gap(
    state: State<'_, DbState>,
    input: KnowledgeGapInput,
) -> Result<KnowledgeGap, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_create_knowledge_gap(&connection, input)
}

#[tauri::command]
fn update_knowledge_gap(
    state: State<'_, DbState>,
    id: String,
    input: KnowledgeGapInput,
) -> Result<KnowledgeGap, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_update_knowledge_gap(&connection, &id, input)
}

#[tauri::command]
fn delete_knowledge_gap(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_delete_knowledge_gap(&connection, &id)
}

#[tauri::command]
fn create_trail(state: State<'_, DbState>, input: TrailInput) -> Result<Trail, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_create_trail(&connection, input)
}

#[tauri::command]
fn update_trail(
    state: State<'_, DbState>,
    id: String,
    input: TrailInput,
) -> Result<Trail, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_update_trail(&connection, &id, input)
}

#[tauri::command]
fn delete_trail(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_delete_trail(&connection, &id)
}

#[tauri::command]
fn create_trail_item(state: State<'_, DbState>, input: TrailItemInput) -> Result<TrailItem, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_create_trail_item(&connection, input)
}

#[tauri::command]
fn update_trail_item(
    state: State<'_, DbState>,
    id: String,
    input: TrailItemInput,
) -> Result<TrailItem, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_update_trail_item(&connection, &id, input)
}

#[tauri::command]
fn delete_trail_item(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_delete_trail_item(&connection, &id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|err| format!("Could not resolve app data directory: {err}"))?;
            std::fs::create_dir_all(&app_data_dir)
                .map_err(|err| format!("Could not create app data directory: {err}"))?;
            let db_path = app_data_dir.join("lexicon_os.sqlite3");
            let connection = init_database(db_path)
                .map_err(|err| format!("Could not initialize database: {err}"))?;
            app.manage(DbState {
                connection: Mutex::new(connection),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_app_data,
            create_entry,
            update_entry,
            delete_entry,
            create_book_page,
            update_book_page,
            delete_book_page,
            replace_content_blocks,
            create_relation,
            update_relation,
            delete_relation,
            create_knowledge_gap,
            update_knowledge_gap,
            delete_knowledge_gap,
            create_trail,
            update_trail,
            delete_trail,
            create_trail_item,
            update_trail_item,
            delete_trail_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lexicon OS");
}
