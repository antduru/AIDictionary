use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub title: String,
    pub entry_type: String,
    pub content: String,
    pub category: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryInput {
    pub title: String,
    pub entry_type: String,
    pub content: String,
    pub category: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookPage {
    pub id: String,
    pub entry_id: String,
    pub title: String,
    pub content: String,
    pub page_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookPageInput {
    pub entry_id: String,
    pub title: String,
    pub content: String,
    pub page_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Relation {
    pub id: String,
    pub from_entry_id: String,
    pub to_entry_id: String,
    pub relation_type: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationInput {
    pub from_entry_id: String,
    pub to_entry_id: String,
    pub relation_type: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeGap {
    pub id: String,
    pub entry_id: String,
    pub title: String,
    pub note: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeGapInput {
    pub entry_id: String,
    pub title: String,
    pub note: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub entries: Vec<Entry>,
    pub book_pages: Vec<BookPage>,
    pub relations: Vec<Relation>,
    pub knowledge_gaps: Vec<KnowledgeGap>,
}
