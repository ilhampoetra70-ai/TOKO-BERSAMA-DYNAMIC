# Tokobersama POS

Local-first, offline-capable Point of Sale system for Indonesian retail shops.
Built with React, Vite, Fastify, SQLite, and Electron. It runs as a portable
desktop app with no cloud dependency.

## Overview

Tokobersama POS is a self-hosted retail POS for Indonesian shop workflows. The
app keeps operational data in a local SQLite database, supports a desktop
cashier workflow, includes a mobile admin PWA, and can optionally expose admin
access through Cloudflare Tunnel.

## Features

- Cashier POS with product search, barcode workflow, cart editing, discounts,
  multiple payment methods, receipt printing, and shift tracking.
- Catalog and inventory management with product CRUD, categories, stock
  movement tracking, low-stock alerts, and restock flows.
- Customer receivables and supplier debt workflows for DP, installment, and
  payment tracking.
- Admin dashboards for transactions, inventory, reports, users, settings, and
  database maintenance.
- Role-based access control with admin, supervisor, and cashier roles.
- TOTP support, recovery flow, forced first password change, and audit logs.
- Public price checker page for barcode or product lookup.
- Portable Windows packaging through Electron.
- Optional Cloudflare Tunnel connector for remote mobile admin access.

## Workspace Layout

```text
tokobersama/
|-- pos-react-canvas/      React + Vite desktop UI, mobile admin, price checker
|-- local-api/             Fastify backend, SQLite migrations, repositories
|-- apps/pos-desktop/      Electron shell and portable packaging config
|-- packages/contracts/    Shared TypeScript contracts
|-- packages/sdk/          Shared utilities
|-- scripts/               Build, package, migration, and smoke tools
`-- vendor/cloudflared/    Bundled Cloudflare connector binary
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, TypeScript, CSS Modules |
| Backend | Fastify, TypeScript, better-sqlite3 |
| Database | SQLite with versioned migrations |
| Desktop | Electron, electron-builder |
| Auth | JWT sessions, bcrypt/scrypt utilities, TOTP |
| Build | npm workspaces, Vite, esbuild |

## Getting Started

Prerequisites:

- Node.js 20 or newer
- npm 10 or newer
- Windows 10/11 for Electron packaging

Install dependencies:

```bash
npm install
```

Run database migrations:

```bash
npm run migrate:local-api
```

Start the backend:

```bash
npm run dev:local-api
```

Start the desktop UI:

```bash
npm run dev:desktop
```

Open `http://127.0.0.1:5173`.

## Build And Package

Build frontend and backend:

```bash
npm run build:electron
```

Create the portable Windows executable:

```bash
npm run package:portable-exe
```

Run smoke checks:

```bash
npm run smoke:final
npm run smoke:portable
```

## Repository Hygiene

Generated output, dependencies, runtime databases, local Cloudflare connector
state, logs, and archived non-essential files are ignored by Git. Keep runtime
data out of commits and regenerate it locally through migrations or setup
scripts.

## Topics

`pos`, `point-of-sale`, `indonesia`, `retail`, `electron`, `react`, `vite`,
`fastify`, `sqlite`, `local-first`, `offline-first`, `desktop-app`,
`inventory-management`, `barcode-scanner`

## License

MIT. See [LICENSE](LICENSE).
