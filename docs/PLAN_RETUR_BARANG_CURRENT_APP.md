# Plan Retur Barang - TOKOBERSAMA Current App

## Ringkasan

Plan lama dari `TOKO BERSAMA APP` masih valid secara prinsip, tetapi konteks teknis repo sekarang berbeda:

- UI: `pos-react-canvas` React/Vite, terutama `PosView.tsx` dan `LegacyPosViews.tsx`.
- API: `local-api` Fastify, bukan IPC Electron langsung.
- DB: SQLite lewat `better-sqlite3`.
- Tabel transaksi sekarang: `sales`, `sale_items`, `payments`, `stock_movements`, `products`.
- Tidak ada `transactions`, `transaction_items`, `payment_history`, atau `stock_trail`.

Keputusan desain tetap: retur dilakukan sebagai edit transaksi lama dengan audit revision, bukan membuat nota retur terpisah.

## Mapping Konteks Lama ke App Sekarang

| Plan lama | App sekarang |
| --- | --- |
| `transactions` | `sales` |
| `transaction_items` | `sale_items` |
| `payment_history` | `payments` dengan `target_type = 'sale'` |
| `products.stock` | `products.qty` |
| `stock_trail` | `stock_movements` |
| `voided` | `sales.status = 'void'` |
| `amount_paid` | `sales.paid_amount` |
| `remaining_balance` | `sales.remaining_amount` |
| IPC `transactions:updateWithRevision` | REST `PUT /sales/:id/revision` |

## Database

Tambah migration baru, additive only:

- `008_sale_revisions.sql`
- Buat tabel `sale_revisions`.
- Jangan update data lama saat migration.
- Jangan recalculate `sales`, `sale_items`, `payments`, `products`, atau `stock_movements`.

Kolom minimal `sale_revisions`:

- `id`
- `sale_id`
- `revision_no`
- `reason`
- `edited_by_user_id`
- `edited_at`
- `before_snapshot_json`
- `after_snapshot_json`
- `stock_delta_json`
- `total_before`
- `total_after`

Index:

- `idx_sale_revisions_sale_id`
- unique `(sale_id, revision_no)`

Tidak perlu tambah kolom di `sales` untuk V1. Status `pernah diedit` bisa dihitung dari `sale_revisions`.

## Backend

Tambah service domain di `local-api`, bukan langsung di route:

- `local-api/src/services/saleRevisionService.ts`
- Input utama: `saleId`, `items`, `discount`, `discountMode`, `reason`, `actorUserId`, `expectedRevisionNo`.
- Service mengambil snapshot terbaru dari `sales`, `sale_items`, dan `payments`.
- Service menghitung delta item dari data terbaru, bukan dari data UI lama.
- Semua update masuk satu `salesRepository.transaction()`.

Endpoint baru:

- `GET /sales/:id/revisions`
- `PUT /sales/:id/revision`

Auth:

- Resource tetap `Transaksi`.
- V1 batasi role efektif ke Admin/Supervisor di service atau route, karena `Kasir` saat ini punya akses `Transaksi`.

Aturan update:

- `sales.status = 'void'` tidak boleh diedit.
- `reason` wajib minimal 5 karakter.
- Item qty tidak boleh negatif.
- Item baru hanya boleh dari produk aktif.
- Qty naik validasi `products.qty` cukup.
- Payment tidak dihapus.
- `paid_amount` dihitung ulang dari `payments` untuk sale tersebut.
- `remaining_amount = max(0, total_amount - paid_amount)`.
- `status = paid` jika `remaining_amount = 0`, `installment` jika sudah ada pembayaran parsial, `dp` hanya dipertahankan bila sesuai status lama dan masih sisa.
- Jika `paid_amount > total_amount`, return `overpaidAmount` ke UI; jangan otomatis refund.

Stok:

- Qty turun atau item dihapus: tambah `products.qty`.
- Qty naik atau item baru: kurangi `products.qty`.
- Tulis `stock_movements` untuk setiap delta.
- Gunakan `type = 'Retur'` untuk stok masuk akibat retur.
- Gunakan `type = 'Penjualan'` untuk stok keluar tambahan.
- `source = 'Revisi transaksi'`.
- `reference_id = sale.id`.
- `reason = Invoice <invoice_no> revisi #<revision_no>: <reason>`.

Repository additions:

- `SalesRepository.findSaleById`
- `SalesRepository.listItemsForSales`
- `SalesRepository.listPaymentsForSales` sudah ada.
- Tambah `updateSaleHeader`, `replaceSaleItems`, `nextRevisionNo`, `createSaleRevision`, `listSaleRevisions`.
- `CatalogRepository.findByBarcode`, `updateByBarcode` sudah ada.
- `StockRepository.create` sudah ada.

## Frontend

Entry point:

- Halaman `Transaksi`, expanded row di `LegacyPosViews.tsx`.
- Tambah tombol `Edit / Retur Barang` di sebelah `Print ulang struk`.
- Tampilkan badge `Pernah diedit` jika revision count > 0.

State dan API:

- Tambah contract di `posApi.types.ts`.
- Tambah methods di `localPosApi.ts`:
  - `listSaleRevisions(saleIdOrInvoice)`
  - `updateSaleWithRevision(saleIdOrInvoice, input)`
- Mock adapter cukup simulasikan untuk dev UI.

Modal:

- Dialog besar, compact.
- Tabs: `Item`, `Pembayaran`, `Audit`.
- Desktop tabel padat; mobile row compact.
- Field utama: qty baru, alasan, preview dampak.
- Submit lewat konfirmasi final.

Preview dampak:

- Total lama
- Total baru
- Selisih
- Dibayar
- Sisa baru
- Kelebihan bayar
- Stok masuk
- Stok keluar

Stale guard:

- Saat modal buka, simpan `loadedRevisionNo`.
- Submit kirim `expectedRevisionNo`.
- Backend tolak jika revision terbaru berbeda.
- UI tampilkan: `Transaksi sudah berubah. Muat ulang sebelum menyimpan.`

## Laporan dan Struk

V1 laporan tetap memakai nilai terbaru dari `sales`.

Tambahan tampilan:

- Detail transaksi menampilkan `Pernah diedit`.
- Reprint struk setelah revisi diberi label `Revisi`.
- Riwayat revision bisa dibuka dari detail transaksi.

Export laporan revision bisa ditunda ke V2.

## Test Plan

Backend:

- Build: `npm run build:local-api`
- Smoke: `npm run smoke:final`
- Portable path: `npm run package:portable-exe`, lalu `npm run smoke:portable`

Skenario manual:

- Kurangi qty item, stok bertambah sesuai delta.
- Hapus item, stok kembali penuh.
- Naikkan qty item, stok berkurang dan tidak boleh negatif.
- Tambah item baru, stok berkurang.
- Edit transaksi cicilan, `remaining_amount` benar.
- Edit transaksi lunas yang totalnya turun, `overpaidAmount` tampil.
- Edit dua kali, delta stok tidak dobel.
- Dua window edit invoice sama, submit kedua ditolak stale.
- Transaksi `void` tidak bisa diedit.
- Migration ke DB lama tidak mengubah jumlah row operasional sebelum fitur dipakai.

## Batasan V1

- Fokus retur/edit item dan total.
- Refund uang tidak otomatis.
- Closing kas belum dikunci secara teknis.
- Export revision log ditunda.
- Role UI boleh sembunyikan tombol dari Kasir, tetapi backend tetap wajib menolak Kasir.
