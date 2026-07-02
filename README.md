# Lexicon OS

Lexicon OS is a local-first personal knowledge atlas. The MVP uses a Tauri desktop shell, React, TypeScript, and SQLite. It keeps entries flexible: a concept can be a simple atlas page or a nested mini-book with its own pages.

No AI features are included in this MVP. There are no LLM calls, embeddings, semantic search, cloud sync, or remote services.

Current organization primitives:

- Flexible block-based content for entries and mini-book pages
- Custom typed relations between entries
- Automatic backlinks derived from relations
- Manual knowledge gaps with open/resolved status
- Trails for ordered learning, reading, or argument routes
- Timeline metadata and a Timeline view
- Atlas, Library, Map, Timeline, Trails, and Settings lenses from the left sidebar

## Install

Prerequisites:

- Node.js 18+
- Rust and Cargo
- System dependencies required by Tauri for your OS

Install JavaScript dependencies:

```bash
npm install
```

## Run In Development

```bash
npm run tauri:dev
```

This starts Vite and opens the Tauri desktop app. The SQLite database is created in the app data directory on first launch and is seeded with sample English literature research entries.

For frontend-only inspection, you can run:

```bash
npm run dev
```

When opened outside Tauri, the UI uses a small localStorage demo repository so the interface can still be reviewed in a browser. The desktop app uses SQLite.

## Build Desktop Executable

```bash
npm run tauri:build
```

Build artifacts are emitted by Tauri under `src-tauri/target/release/bundle`.

## Concept

Lexicon OS treats a personal knowledge base as an atlas book:

- The main atlas contains all entries.
- Simple entries open as pages inside the atlas.
- Complex entries can be marked as books and opened as nested mini-books.
- Alphabet tabs behave like page dividers.
- The left sidebar switches between Atlas, Library, Map, and Settings.
- The right panel stays contextual with manually curated related entries and knowledge gaps.

The data model is intentionally flexible. Entries support ordered content blocks, Markdown blocks, optional categories, tags, manual relations, trails, timeline metadata, and manual knowledge gaps without requiring a strict definition/example/source template.
