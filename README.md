Small Jewelry Billing (Open Source)
===================================

This is a simple, local-first billing and customer management app for small jewelry shops. It runs on your computer, stores data in a local SQLite database, and prints neat invoices. Rates and invoices stay on your machine.

What you get
------------
- Billing: new items, exchanges, misc charges, GST (CGST/SGST), live totals
- Customers: search by mobile or name, view purchase history
- Rates: set 24K and auto-derived karat rates; save to database
- Dashboard: quick stats and a monthly report
- Local storage: SQLite file and an Excel backup for your records

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

API (local-only)
----------------
- `GET /api/stats`
- `GET /api/rates`, `PUT /api/rates`
- `POST /api/invoices`
- `GET /api/customers/:mobile`
- `GET /api/customers/search?name=...`
- `GET /api/customers/list?limit=300`
- `GET /api/reports/monthly?year=YYYY&month=MM`

License
-------
This project is open source under the MIT License. See `LICENSE` for details.
