# TOKOBERSAMA Local API

Embedded local API foundation for the portable local-first POS.

Status: vertical slice awal sudah aktif.

Implemented:

- Health check: `GET /health`
- Workspace snapshot: `GET /workspace`
- Catalog CRUD: `GET /catalog`, `POST /catalog`, `PUT /catalog/:barcode`, `DELETE /catalog/:barcode`
- Barcode generator: `GET /catalog/barcode`
- Import catalog: `POST /catalog/import`
- Rename category: `PATCH /catalog/categories/rename`
- Restock: `POST /catalog/:barcode/restock`
- Supplier debt stock intake: `POST /supplier-debts/receive-stock`
- Checkout: `POST /sales/checkout`
- Sales list: `GET /sales`

The React UI can use this API by setting `VITE_POS_API_BASE_URL=http://127.0.0.1:8731`.
Without that env value, the UI intentionally stays on the mock adapter for safe UI iteration.

Target responsibilities:

- Own all `better-sqlite3` access.
- Validate every mutation with Zod.
- Use transaction boundaries for checkout, stock movement, supplier debt intake, and payments.
- Serve POS desktop data, admin LAN, and price-checker LAN from the same host.
- Keep React components away from SQLite and direct IPC.

Run:

```bash
npm install
npm run migrate
npm run dev
```

Production-like check:

```bash
npm run build
node dist/db/migrate.js
node dist/server.js
```
