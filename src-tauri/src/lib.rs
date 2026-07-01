mod models;
mod repository;

use repository::{
    create_book_page as repo_create_book_page, create_entry as repo_create_entry,
    create_knowledge_gap as repo_create_knowledge_gap, create_relation as repo_create_relation,
    delete_book_page as repo_delete_book_page, delete_entry as repo_delete_entry,
    delete_knowledge_gap as repo_delete_knowledge_gap, delete_relation as repo_delete_relation,
    init_database, load_app_data as repo_load_app_data, update_book_page as repo_update_book_page,
    update_entry as repo_update_entry, update_knowledge_gap as repo_update_knowledge_gap,
};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{Manager, State};

pub use models::{
    AppData, BookPage, BookPageInput, Entry, EntryInput, KnowledgeGap, KnowledgeGapInput,
    Relation, RelationInput,
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
fn create_relation(state: State<'_, DbState>, input: RelationInput) -> Result<Relation, String> {
    let connection = state.connection.lock().map_err(|err| err.to_string())?;
    repo_create_relation(&connection, input)
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
            create_relation,
            delete_relation,
            create_knowledge_gap,
            update_knowledge_gap,
            delete_knowledge_gap
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lexicon OS");
}
