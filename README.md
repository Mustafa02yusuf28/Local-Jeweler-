Small Jewelry Billing (Open Source)
===================================

This is a local-first billing and customer management app for small jewelry shops — now with an AI copilot. Powered by an LLM (Google Gemini), it supports natural-language actions ("generate an invoice", "compare months", "find purchases"), tool-calling over your local database (no raw data leaves your device), and fast, privacy‑first insights. Build invoices by prompt, summarize sales with AI, and keep everything on your machine.

What you get
------------
- Billing: new items, exchanges, misc charges, GST (CGST/SGST), live totals
- Customers: search by mobile or name, view purchase history
- Rates: set 24K and auto-derived karat rates; save to database
- Dashboard: quick stats and a monthly report
- Local storage: SQLite file and an Excel backup for your records
- AI Assistant (Gemini): ask for rates, summaries, generate invoices from text, find purchases, update rates by command. Fully integrated with local DB.

Quick start
-----------
From the `web` folder:

```bash
# 1) Install dependencies
npm ci

# 2) Start the dev server
npm run dev

# 3) Open the app
# Visit http://localhost:3000
```

Build and run
-------------
```bash
npm run build
npm start
```

Data & backups
--------------
- Database: `data/app.db` (created automatically)
- Excel backup: `data/backup.xlsx` (updated after each invoice)

Environment
-----------
To enable Gemini (optional), create a `.env.local` in `web/` with:

```bash
GEMINI_API_KEY=your_key_here
# Optional (defaults to gemini-2.0-flash):
GEMINI_MODEL=gemini-2.0-flash
```

AI assistant (what it can do)
-----------------------------
- Rates: “What’s 18K rate today?” (uses your local `rates` table)
- Online phrasing: “what’s 24K gold rate online” (lets Gemini answer without local injection)
- Monthly summary: “Summarise this month in 3 bullets” (computes KPIs locally; Gemini formats)
- Compare months: “Compare this month to last month and suggest trends” (local compare)
- Generate bill: “Generate a bill: customer: Raj 9876543210, 2 rings each 2g 18K @today, MC 15%, HM 100” (prefills Billing)
- Update rate: “Set 22K to 6100” (applies immediately to DB)
- Find purchases by name: “Find all Rashid purchases above 50000 this year”
- Find purchases by mobile: “find all purchases by number 9876543210”

New/updated endpoints
---------------------
- `POST /api/ai/chat` → AI chat with local tools and Gemini fallback
- `GET /api/invoices/[id]` → fetch invoice snapshot by id (for compact invoice links)
- `GET /invoice?id=...` → printable invoice via stored snapshot (also supports `?data=`)

Invoice links (short)
---------------------
- The app now returns compact links like `/invoice?id=INVOICE_ID` (instead of long base64 URLs)

Printing
--------
- Use the “Print Invoice” button on the Billing page
- Printable view opens in a new tab; use browser print

Notes for shop owners
---------------------
- Fill customer mobile number before printing; it links the invoice to the customer
- Replace placeholders (shop name, GSTIN, address) in `src/app/invoice/page.tsx`
- Replace the banner image (optional) at `public/globe.svg` or your own asset

Tech
----
- Next.js App Router, React, TypeScript, Tailwind
- SQLite via `better-sqlite3`
- Excel backup via `exceljs`
- Gemini (Google Generative AI) optional; same-origin checks and short timeouts

API (local-only)
----------------
- `GET /api/stats`
- `GET /api/rates`, `PUT /api/rates`
- `POST /api/invoices`
- `GET /api/invoices/[id]`
- `GET /api/customers/:mobile`
- `GET /api/customers/search?name=...`
- `GET /api/customers/list?limit=300`
- `GET /api/reports/monthly?year=YYYY&month=MM`
- `POST /api/ai/chat`

License
-------
This project is open source under the MIT License. See `LICENSE` for details.
