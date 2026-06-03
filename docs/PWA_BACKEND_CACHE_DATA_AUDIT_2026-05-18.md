# Audit PWA, Backend, Cache, Fetch, Data TOKOBERSAMA

Tanggal audit: 2026-05-18
Target: `D:\Ilham\TOKOBERSAMA`
Mode: analisis mendalam, no app code change

## Verdict

Backend sudah lebih sehat dari audit 2026-05-17: request logger default off, security headers ada, LAN bind default `0.0.0.0`, auth gate static/API lebih jelas, session cache sudah dibersihkan pada reset/user change.

Masalah besar sekarang bukan "backend berat karena dependency". Masalah utama: PWA mobile admin mengambil data terlalu gemuk dan terlalu sering, report endpoint menghitung banyak hal sekaligus, service worker masih punya risiko stale-shell, mock adapter masih bisa aktif diam-diam saat base URL kosong, dan smoke final gagal karena manifest admin tidak cocok dengan test.

## Referensi Context7

- Fastify v5: lifecycle hook murah, `onRequest` cocok untuk auth/header, schema penuh diperlukan jika memakai Fastify validation/serialization. Repo saat ini pakai Zod manual, jadi validasi tetap ada tetapi Fastify tidak bisa optimize serializer/contract.
- React 19: fetch di `useEffect` perlu cleanup/ignore untuk race. Dev StrictMode bisa memicu fetch ganda, jadi data layer harus idempotent dan bisa cancel/ignore stale response.
- Vite 6: production asset hashed di `assets/` layak cache immutable; public/static files seperti manifest dan service worker perlu cache pendek/no-cache karena tidak fingerprinted.

## Bukti Verifikasi

- `npm.cmd --workspace tokobersama-local-api run build`: pass.
- `npm.cmd --workspace pos-react-canvas run build`: pass.
- Output build besar: `vendor-charts` 385.68 kB raw, `xlsx` 429.53 kB raw, `PosView` 312.95 kB raw, `MobileAdminApp` 89.28 kB raw, CSS utama 151.80 kB raw.
- `npm.cmd run smoke:final`: fail. Error: `Manifest admin mobile harus memakai start_url /admin.`

## Temuan Prioritas

### P0: Smoke final gagal karena manifest admin

Evidence:
- `scripts/final-smoke.cjs:129` mencari string `"start_url": "/admin"`.
- `pos-react-canvas/public/admin/manifest.webmanifest:5` berisi `"start_url": "/admin/"`.
- Build menyalin nilai yang sama ke `pos-react-canvas/dist/admin/manifest.webmanifest`.

Dampak:
- Pipeline smoke merah walau build TypeScript/Vite hijau.
- Portable smoke punya assert sejenis, jadi package portable berisiko gagal di tahap validasi.

Fix:
- Pilih satu kontrak. Paling kecil: ubah manifest `start_url` ke `/admin` atau longgarkan smoke untuk menerima `/admin/`.
- Karena script eksplisit minta `/admin`, fix cepat: manifest admin `start_url: "/admin"`, scope tetap `"/admin/"`.

### P1: Mobile admin over-fetch

Evidence:
- `pos-react-canvas/src/mobile-admin/mobileAdminApi.ts:15-19` selalu paralel ambil `settings/public`, `reports`, `catalog`, dan `receivables`.
- Semua tab menerima satu objek `dashboard`; transaksi, inventory, piutang memfilter client-side dari payload yang sama.
- `pos-react-canvas/src/mobile-admin/hooks/useDashboard.ts:60-63` auto refresh tiap 30 detik plus focus plus workspace event.

Dampak:
- Buka overview saja tetap ambil katalog penuh dan piutang penuh.
- Pindah range report memicu fetch paket lengkap, bukan hanya report.
- Pada data besar, CPU backend dan render frontend naik bersamaan.

Fix:
- Pecah endpoint/admin loader:
  - `/admin/summary?from&to`
  - `/admin/transactions?from&to&limit&cursor`
  - `/admin/inventory?query&sort&limit&cursor`
  - `/admin/receivables?status&query&limit&cursor`
- Di frontend, fetch data per tab. Overview tidak perlu katalog penuh.
- Tambah cache in-memory pendek per key: `reportRange`, `activeSection`, `query`.

### P1: Fetch tidak bisa dibatalkan

Evidence:
- `localPosApi.requestJson` memanggil `fetch` di `pos-react-canvas/src/services/adapters/localPosApi.ts:205`.
- Tidak ada `AbortController` atau signal di API client.
- `useDashboard` memakai flag `active` di `pos-react-canvas/src/mobile-admin/hooks/useDashboard.ts:40-57`, cukup mencegah stale setState, tetapi request lama tetap jalan sampai selesai.

Dampak:
- Focus event, interval, pull-refresh, dan range change bisa overlap.
- Backend tetap menghitung report lama walau UI sudah pindah range/tab.

Fix:
- Tambah opsi `signal` ke `requestJson`.
- `useDashboard` simpan `AbortController`; abort request lama sebelum request baru.
- Pertahankan ignore/active guard untuk safety React.

### P1: `/reports` terlalu monolitik

Evidence:
- `local-api/src/routes/report.routes.ts:165` `buildResponse` membuat seluruh report.
- `report.routes.ts:175-184` ambil sales range, sale items, payments, debts, debt items, debt payments, `stockRepository.listRecent(1000)`, dan `catalogRepository.listActive()`.
- `report.routes.ts:501` mengembalikan `transactionLog` penuh untuk range aktif.
- `report.routes.ts:529-531` hanya satu route `/reports`.

Dampak:
- Satu request dashboard menghasilkan banyak query dan banyak transform JS.
- Mobile admin hanya butuh ringkasan dan beberapa list pendek, tetapi backend tetap membangun dataset penuh.
- Range 30 hari bisa besar. Tidak ada `limit` untuk transaction log report.

Fix:
- Pisahkan `summary` dari `dataset`.
- Tambah query `include=summary,charts,transactions,stockTrail` atau endpoint terpisah.
- Tambah `limit` default untuk `transactionLog`, `stockTrailRows`, `topProducts`.
- Pindahkan agregasi utama ke SQL yang sudah ada di repository, kurangi reduce JS untuk dataset besar.

### P1: Cache service worker admin perlu disiplin versi

Evidence:
- `pos-react-canvas/public/admin/sw.js:1` cache `tokobersama-admin-v4`.
- `sw.js:25-34` install/activate pakai `skipWaiting` dan `clients.claim`.
- `sw.js:45-46` API prefix bypass cache.
- `sw.js:58-72` static assets stale-while-revalidate.
- `MobileAdminApp.tsx:98` register dengan `updateViaCache: 'none'`.

Bagus:
- API response tidak dicache.
- SW update dipaksa cek ulang.
- Cache lama dibersihkan saat versi naik.

Risiko:
- `SHELL_URLS` hanya shell/manual assets, bukan hashed chunks. Navigasi offline bisa return `/admin/`, tetapi JS chunk belum tentu ada kalau belum pernah terbuka.
- Non-asset public file memakai stale-while-revalidate; manifest/icon bisa terlihat lama sampai request berikutnya.
- Cache version manual. Jika lupa bump, browser bisa tahan shell lama.

Fix:
- Build-time inject `CACHE_NAME` dari package/build timestamp atau git-less build id.
- Untuk `/admin/manifest.webmanifest` dan `/admin/sw.js`, selalu network-first/no-store.
- Untuk Vite hashed `/assets/*`, boleh immutable di server dan cache SW.
- Tambah smoke yang mengecek `CACHE_NAME` berubah saat manifest/SW berubah.

### P2: Static cache header cukup benar, tapi belum granular

Evidence:
- `local-api/src/http/staticFrontend.ts:56` memberi `public, max-age=31536000, immutable` untuk `assets/`.
- Selain assets diberi `no-cache` di `staticFrontend.ts:56` dan `index.html` fallback `staticFrontend.ts:65`.

Dampak:
- Vite hashed chunks aman untuk cache panjang.
- `index.html`, manifest, SW selalu revalidate. Ini benar untuk PWA.
- Tetapi `no-cache` bukan `no-store`; browser masih boleh simpan dan revalidate. Untuk SW biasanya masih oke, tetapi debug stale lebih sulit.

Fix:
- Tetap `immutable` untuk `/assets/*`.
- Pakai `no-cache, must-revalidate` untuk `index.html` dan manifest.
- Pakai `no-store` atau `no-cache, max-age=0` khusus `/admin/sw.js` dan `/sw.js`.

### P2: Mock adapter masih bisa aktif diam-diam

Evidence:
- `pos-react-canvas/src/services/posApi.ts:9-15` memakai local API jika base URL ada, selain itu fallback `mockPosApi`.
- `mockPosApi.ts` masih besar dan menyimpan state di localStorage.
- `PosView.tsx:4423` masih ada copy "Mockup alur fitur dari aplikasi POS lama."

Dampak:
- Dalam browser context yang base URL kosong, user bisa lihat data mock dan mengira itu data real.
- Dalam dev, masalah backend bisa tersembunyi karena UI tetap hidup di mock.

Fix:
- Untuk production build, jangan fallback silent ke mock. Tampilkan "local-api tidak ditemukan" dengan tombol retry.
- Mock tetap boleh untuk Story/demo jika env eksplisit `VITE_ENABLE_MOCK_POS=1`.
- Bersihkan label "mockup" yang muncul di UI produksi jika fitur sudah real.

### P2: Auth/cache state sudah lebih baik, tetap butuh boundary test

Evidence:
- `local-api/src/server.ts:33-51` security header hook jalan sebelum auth hook.
- `local-api/src/http/authHook.ts:33-56` public static path eksplisit untuk static shell.
- `authHook.ts:76-79` `/workspace` dan `/catalog` private sesuai resource.
- `userRepository.ts` punya `clearAuthCaches`, dipanggil pada change password, create/update/delete user, dan hard reset.

Dampak:
- Perbaikan audit lama sudah masuk.
- Risiko sekarang: route baru bisa lupa masuk resource map dan jadi default allowed karena `resolveRequiredResources` mengembalikan `[]`.

Fix:
- Tambah default deny untuk unknown API path, atau minimal test daftar route private.
- Smoke tanpa token untuk `/reports`, `/workspace`, `/catalog`, `/receivables`, `/users`, `/database`, `/cloudflare`.

### P2: Backend SQLite sync oke untuk portable, tapi heavy jobs perlu lock

Evidence:
- `better-sqlite3` sync dipakai. Ini cocok untuk app lokal single process.
- Report, backup, restore, vacuum/checkpoint jalan di request lifecycle.

Dampak:
- Request mahal bisa blok event loop selama proses.
- Pada PWA mobile admin, refresh 30 detik bisa bentrok dengan backup atau maintenance.

Fix:
- Tambah lock untuk job berat: backup, restore, cloud sync, vacuum.
- Untuk report, kurangi payload dulu sebelum worker/thread. ROI lebih tinggi.

## Rencana Eksekusi

### Quick Wins

1. Fix manifest admin vs smoke.
2. Tambah `AbortController` di client fetch dan `useDashboard`.
3. Stop silent mock pada production.
4. Tambah cache header khusus SW: `no-store` atau `no-cache, max-age=0`.
5. Tambah smoke auth boundary dan manifest/SW checks.

### Backend Data Efficiency

1. Tambah `/admin/summary` untuk KPI + chart pendek.
2. Tambah paginated endpoints untuk transaksi, inventory, piutang.
3. Report endpoint lama tetap ada sementara untuk desktop POS, tetapi mobile admin pindah ke endpoint kecil.
4. Tambah `limit` dan `cursor` pada list berat.

### PWA Cache

1. Generate cache version otomatis.
2. Network-first untuk manifest/SW.
3. Cache-first untuk hashed assets.
4. Jangan cache API.
5. Tampilkan UI "offline/stale" jika data terakhir lama.

## Prioritas Final

Urutan kerja paling waras:

1. P0 manifest smoke.
2. P1 fetch abort + over-fetch reduction.
3. P1 split admin data endpoint.
4. P2 service worker version automation.
5. P2 mock production guard.

## Status Saat Audit

Build hijau. Smoke merah. App tidak rusak total, tapi PWA mobile admin belum efisien untuk data besar. Backend cukup kuat untuk POS lokal, tetapi endpoint admin perlu diet payload sebelum dianggap scalable.
