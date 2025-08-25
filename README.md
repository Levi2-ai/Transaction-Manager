
# Client Transaction Manager (Civil Projects)

A lightweight React + Vite + Tailwind app to manage client deposits (credits), spending (debits), and category-level breakdowns. Data is stored locally in your browser (no server).

## Quick Start
```bash
# 1) Install dependencies
npm install

# 2) Run the client, server, and Electron app concurrently in development mode
npm run dev:all

# Alternatively, to run Electron in development mode:
npm run electron:start
```

Open the shown URL in your browser for the web client, or launch the Electron app.

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
# Build the web client
npm run build

# Preview the web client build
npm run preview

# Build the Electron executable
npm run build:electron
```

The Electron executable will be found in the `release/` directory.

## Tech
- React 18 + Vite
- TailwindCSS
- Electron (for desktop app)
- SQLite (for server-side data storage)
- framer-motion
- lucide-react (icons)
- recharts (charts)

## Notes
- Data persists in LocalStorage (`ctm:v1:data`) on your device for the web client.
- The Electron app uses SQLite for data storage.
