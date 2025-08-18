
# Client Transaction Manager (Civil Projects)

A lightweight React + Vite + Tailwind app to manage client deposits (credits), spending (debits), and category-level breakdowns. Data is stored locally in your browser (no server).

## Quick Start
```bash
# 1) Extract the zip
cd client-transaction-manager

# 2) Install deps
npm install

# 3) Run dev server
npm run dev
```

Open the shown URL in your browser.

## Features
- Add clients (name, contact, project, address, notes)
- Credits (received) & Debits (spent) with categories
- Attach receipt images
- Per-client balance, statements, expense pie chart
- Search & filter
- Export/Import backup (JSON)
- Print/Save as PDF statements

## Build
```bash
npm run build
npm run preview
```

## Tech
- React 18 + Vite
- TailwindCSS
- framer-motion
- lucide-react (icons)
- recharts (charts)

## Notes
- Data persists in LocalStorage (`ctm:v1:data`) on your device.
- To reset, clear your browser site data.
