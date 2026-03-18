# LexiNote bundle

This zip contains the latest code bundle we built in chat for LexiNote.

Included:
- browser extension capture files
- database schema and seed
- manual word entry flow
- notebook filters/edit/delete
- flashcard SRS study mode
- dashboard API and UI
- AI enrichment backend
- Supabase auth structure
- full React preview shell

Important setup notes:
- This is a generated project bundle from chat, not a tested production repo.
- You need a Next.js app with Tailwind/shadcn-style UI support.
- You need Supabase configured.
- You need OpenAI configured for AI enrichment.
- Several pages use client/server patterns that may need small integration fixes in a real repo.

Start points:
- /dashboard
- /words
- /study
- /auth

Extension files are in `extension/`.
Database SQL is in `db/`.
