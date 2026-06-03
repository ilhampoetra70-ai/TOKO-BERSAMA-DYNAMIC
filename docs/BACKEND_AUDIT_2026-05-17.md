# Backend Audit TOKOBERSAMA

Tanggal audit: 2026-05-17
Target: `D:\Ilham\TOKOBERSAMA\local-api`
Mode: static audit, no runtime code changes

## Ringkasan Eksekutif

Backend saat ini cukup ramping secara dependency dan portable staging. `local-api` hanya memakai `fastify`, `zod`, dan `better-sqlite3` sebagai dependency runtime di manifest, sementara portable backend staged size saat audit sekitar `3,979,892` bytes. Jadi masalah size utama bukan backend bundle, melainkan Electron/Chromium, resource UI, dan binary tambahan.

Risiko utama ada di hardening HTTP, batas public route, operasi database maintenance/restore yang blocking, dan beberapa alur file/cloud yang membaca seluruh file ke memory. Tidak ada indikasi SQL injection umum di repository CRUD utama karena query memakai prepared statements. Area restore database tetap perlu diperlakukan high-risk karena memakai dynamic `ATTACH DATABASE` dan dynamic table/column copy walaupun sudah ada validasi nama.

Second opinion setelah re-check konteks aplikasi:
- Audit ini sesuai arah besar aplikasi: POS lokal portable, backend Fastify, SQLite lokal, dan Cloudflare connector sebagai opsi publik.
- Revisi prioritas diperlukan sebelum implementasi: hardening harus low-dependency dan tidak merusak portable packaging; public static shell `/admin`, `/connector`, dan `/price-checker` memang sengaja public untuk memuat UI, tetapi API private di bawah `/cloudflare`, `/database`, `/settings`, dan `/users` tetap wajib auth.
- Legacy password fallback harus dinaikkan prioritas karena migration saat ini benar-benar men-seed `portable-local-placeholder`, bukan hanya risiko dari backup lama.

Referensi Context7:
- Fastify docs menekankan route schema validation, hook/preHandler untuk auth, error handler terpusat, dan graceful shutdown.
- `@fastify/helmet` docs merekomendasikan security headers seperti `x-frame-options`, `x-content-type-options`, CSP, referrer policy, dan header hardening lain.

Catatan: resource/skill MCP bernama `senior-backend` tidak terekspos pada daftar MCP resources/templates di sesi audit. Audit ini memakai Context7 MCP dan skill lokal `nodejs-backend`.

## Temuan Prioritas

### High: CORS terlalu terbuka dan security headers belum standar

Evidence:
- `local-api/src/server.ts:28` membuat Fastify dengan `logger: true`.
- `local-api/src/server.ts:31-40` menulis CORS manual dengan `Access-Control-Allow-Origin: *`.
- Tidak ada registrasi `@fastify/helmet` atau header hardening setara.

Risiko:
- Jika backend pernah dibuka melalui Cloudflare/public URL, origin mana pun bisa membuat request browser ke API. Bearer token memang tetap dibutuhkan untuk route private, tetapi wildcard CORS memperbesar exposure untuk token leakage, plugin browser jahat, dan public endpoint abuse.
- Static admin/connector/price-checker shell juga tidak mendapat header `nosniff`, frameguard, CSP/referrer policy, atau hardening sejenis.

Rekomendasi:
- Ganti manual CORS hook dengan policy origin allowlist berbasis config. Default aman: `127.0.0.1`, `localhost`, dan optional configured public origin.
- Implementasi awal sebaiknya tanpa dependency baru: tambahkan helper security headers internal untuk `nosniff`, frameguard, referrer policy, permissions policy, dan cache policy yang sesuai route. `@fastify/helmet` boleh dipertimbangkan setelah size impact diukur.
- Untuk route OAuth callback yang butuh inline script, hilangkan inline script atau beri header khusus yang aman untuk callback saja.

Validasi:
- `cmd /c npm run build:local-api`
- Smoke `OPTIONS` preflight dari allowed origin dan disallowed origin.
- Cek response `/health`, `/admin`, dan `/price-checker` memiliki header yang diharapkan.

### High: Public auth allowlist memakai prefix luas

Evidence:
- `local-api/src/http/authHook.ts:5` mendefinisikan public prefixes termasuk `/auth/`, `/health`, `/settings/public`, `/public/price-checker`, `/price-checker`, `/admin`, `/connector`, dan `/assets/`.
- `local-api/src/http/authHook.ts:45-46` membypass auth jika `request.url.startsWith(prefix)`.

Risiko:
- Prefix seperti `/admin`, `/connector`, dan `/health` akan membuka semua path yang diawali string tersebut, bukan hanya route static yang dimaksud.
- Saat route baru ditambah, developer bisa tanpa sadar membuat endpoint API sensitive dengan prefix yang ikut public.

Rekomendasi:
- Ubah public allowlist menjadi matcher eksplisit berbasis method + normalized pathname.
- Bedakan route static shell (`GET /admin`, `GET /admin/*`) dari route API (`/cloudflare/*`, `/database/*`, `/settings/*`).
- Tambahkan smoke test auth gate untuk path mirip seperti `/admin-api`, `/connector/private`, dan route API private tanpa token.

Validasi:
- Request tanpa token ke `/cloudflare/connector`, `/database/backups`, `/settings`, `/users` harus `401`.
- Request tanpa token ke static shell yang memang public tetap berhasil.

### High: OAuth callback HTML menyisipkan query/header-derived value tanpa escaping

Evidence:
- `local-api/src/routes/database.routes.ts:280-287` membangun origin dari `Host` dan `x-forwarded-proto`.
- `local-api/src/routes/database.routes.ts:447-454` memasukkan `query.error` dan `origin` langsung ke HTML.
- `local-api/src/routes/database.routes.ts:461-467` memasukkan `origin` langsung ke script dan anchor HTML.

Risiko:
- Pada deployment yang menerima Host header dari luar, HTML callback bisa menjadi XSS/open redirect surface.
- Ini route public karena masuk allowlist callback, sehingga perlu lebih ketat daripada route internal.

Rekomendasi:
- Escape semua text HTML (`query.error`) dan attribute/script value (`origin`).
- Validasi origin hanya boleh `127.0.0.1`, `localhost`, atau public origin yang dikonfigurasi.
- Hindari inline script dengan `meta refresh` atau response sederhana yang meminta operator kembali ke app.

Validasi:
- Unit/helper test untuk escaping `<script>`, quote, dan malformed Host.
- Manual callback dengan `?error=<script>alert(1)</script>` harus menampilkan teks aman, bukan executable HTML.

### Medium: Restore database memakai dynamic attach/copy dan belum memvalidasi schema contract penuh

Evidence:
- `local-api/src/routes/database.routes.ts:203-207` melakukan `ATTACH DATABASE` dari path backup.
- `local-api/src/routes/database.routes.ts:209-230` mengambil table dari `restore_db.sqlite_master`, lalu dynamic delete/insert per table.
- `local-api/src/routes/database.routes.ts:218-230` sudah memvalidasi nama tabel dan quote identifier, tetapi belum memverifikasi daftar tabel/kolom sesuai schema aplikasi.

Risiko:
- Backup SQLite valid belum tentu kompatibel dengan schema aplikasi saat ini.
- Restore dengan kolom/tabel berbeda bisa gagal di tengah transaction atau menghasilkan state yang sulit dipahami operator.

Rekomendasi:
- Sebelum restore, validasi `schema_migrations` minimal sama dengan expected migration set aplikasi.
- Validasi tabel wajib dan kolom wajib sebelum copy.
- Tolak tabel asing kecuali masuk allowlist yang aman.
- Jadikan restore result mencantumkan schema version backup dan schema version current.

Validasi:
- Restore backup valid harus pass.
- Restore DB valid tetapi schema lama harus ditolak dengan pesan eksplisit.
- Restore DB dengan extra table/invalid columns harus gagal sebelum mutation.

### High: Legacy default password fallback masih aktif di seed database

Evidence:
- `local-api/src/db/migrations/002_products_note_and_system_user.sql:3-14` men-seed user `admin` dengan `portable-local-placeholder`.
- `local-api/src/db/migrations/003_user_access_totp.sql:11-16` men-seed `kasir01`, `spv-gudang`, dan `kasir02` dengan `portable-local-placeholder`.
- `local-api/src/repositories/userRepository.ts:144-148` mendefinisikan fallback password `admin123`, `kasir123`, `supervisor123`, dan `password123`.
- `local-api/src/repositories/userRepository.ts:151-153` menganggap hash `portable-local-placeholder` valid dengan password legacy.
- `local-api/src/repositories/userRepository.ts:313` menerima password legacy sebelum verify hash normal.

Risiko:
- Install baru memiliki akun default yang bisa ditebak sampai operator mengganti password.
- Risiko membesar saat Cloudflare connector diaktifkan atau admin UI dapat diakses dari jaringan lain.

Rekomendasi:
- Ubah fallback legacy menjadi one-time bootstrap: login default hanya boleh menghasilkan sesi dengan `forcePasswordChange: true`, audit khusus, dan tidak boleh dianggap kondisi normal.
- Seed baru sebaiknya memakai generated temporary password atau bootstrap setup flow, bukan password statis permanen.
- Tambahkan health/security check internal yang melaporkan jumlah user dengan `portable-local-placeholder`.

Validasi:
- DB seeded baru tidak boleh membiarkan akun default aktif tanpa `force_password_change`.
- Login default harus langsung memaksa ganti password.
- Setelah password diganti, `portable-local-placeholder` tidak boleh tersisa untuk user tersebut.

### Medium: Operasi maintenance dan backup dapat memblok event loop

Evidence:
- `local-api/src/routes/database.routes.ts:313-328` menjalankan `PRAGMA integrity_check` dan `VACUUM` sinkron lewat better-sqlite3.
- `local-api/src/routes/database.routes.ts:536-545` expose VACUUM sebagai request handler.
- `local-api/src/services/cloudflareConnector.ts:148-156` menjalankan `spawnSync` untuk baca versi binary saat status dibaca.

Risiko:
- Database besar atau proses sinkron bisa membuat API tidak responsif saat maintenance, backup, restore, atau status polling.
- POS lokal mungkin toleran, tetapi public/admin mobile akan terasa freeze saat operasi berjalan.

Rekomendasi:
- Beri mutex/job state untuk maintenance, backup, dan restore agar tidak overlap.
- Cache hasil `cloudflared --version` atau hanya baca saat install/preflight, bukan setiap status request.

Validasi:
- Simulasikan DB besar dan jalankan `/health` saat backup/sync berlangsung.
- Pastikan request kedua ke maintenance job mendapat `409 already_running`, bukan menjalankan operasi paralel.

### Medium: Config belum divalidasi dan graceful shutdown belum lengkap

Evidence:
- `local-api/src/config/index.ts` menggunakan raw env conversion; port memakai `Number(...)` tanpa validasi range.
- `local-api/src/server.ts:42-45` hanya menutup resource pada `onClose`.
- `local-api/src/server.ts:71-74` `main()` listen lalu auto-start connector, tetapi tidak memasang SIGINT/SIGTERM handler.

Risiko:
- Env invalid dapat menghasilkan startup aneh, misalnya port `NaN`.
- Saat proses dihentikan di luar Electron path, connector/database close bergantung pada Fastify close dipanggil oleh caller.

Rekomendasi:
- Tambahkan config validation dengan `zod` atau helper kecil tanpa dependency baru.
- Pasang graceful shutdown di `main()` untuk SIGINT/SIGTERM: `await app.close()`, log, lalu exit code sesuai hasil.
- Batasi `host` default tetap `127.0.0.1`; public binding harus opt-in eksplisit.

Validasi:
- `TOKOBERSAMA_API_PORT=abc cmd /c npm run start:local-api` harus gagal cepat dengan pesan config jelas.
- SIGTERM/SIGINT test memastikan `stopCloudflareConnector()` dan `db.close()` terpanggil.

### Low: Dependency runtime sudah ramping, tetapi manifest drift perlu dikunci

Evidence:
- `local-api/package.json:12-16` mendeklarasikan `better-sqlite3`, `fastify`, dan `zod`.
- `npm ls --workspace tokobersama-local-api --depth=0` menunjukkan runtime aktual saat audit: `better-sqlite3@11.10.0`, `fastify@5.8.5`, `zod@4.4.1`.
- `local-api/package.json` masih memakai ranges `^11.8.1`, `^5.2.1`, dan `^4.3.6`.

Risiko:
- Install bersih di masa depan bisa mengambil minor baru yang mengubah behavior atau size.
- Audit dan troubleshooting bisa salah jika hanya membaca manifest tanpa lockfile.

Rekomendasi:
- Untuk portable app, pertimbangkan pin exact runtime dependency di `local-api/package.json` atau set policy bahwa `package-lock.json` adalah source of truth.
- Tambahkan `npm ci` sebagai default build reproducibility command sebelum package portable.

Validasi:
- `cmd /c npm ci`
- `cmd /c npm ls --workspace tokobersama-local-api --depth=0`

### Low: Portable backend staging sudah benar arahnya

Evidence:
- `scripts/prepare-local-api-portable.cjs:21-33` membundle backend dengan esbuild untuk Node target.
- `scripts/prepare-local-api-portable.cjs:29` mengeksklusikan `better-sqlite3` native module.
- `scripts/prepare-local-api-portable.cjs:91-100` staged package hanya menyertakan `better-sqlite3` sebagai dependency.
- `scripts/prepare-local-api-portable.cjs:108-120` hanya copy runtime entries `better-sqlite3`, `bindings`, dan `file-uri-to-path`.
- `apps/pos-desktop/package.json:29-58` menyertakan UI dist, staged local-api, native sqlite deps, dan `cloudflared.exe`.

Kesimpulan:
- Backend portable staging bukan sumber bloat besar. Pada audit ini `release/portable-local-api` hanya sekitar `3.98 MB`.
- Size portable final tetap harus diukur dari `release/portable-exe/TOKOBERSAMA-POS-Portable.exe`, karena Electron portable extraction dan Chromium adalah faktor utama.

Rekomendasi:
- Jangan menghapus `node.exe`, `better_sqlite3.node`, atau staged native deps tanpa mengganti arsitektur runtime.
- Debloat aman berikutnya: ukur UI dist, locale Electron, sourcemap/static asset, dan binary cloudflared. Jangan tebak.

## Urutan Fix yang Disarankan

1. Fix auth/public boundary: explicit public matcher, low-dependency security headers, CORS allowlist.
2. Fix OAuth callback escaping/origin validation.
3. Fix legacy seeded password behavior: forced first password change and audit.
4. Tambahkan config validation dan graceful shutdown.
5. Tambahkan restore schema compatibility checks.
6. Tambahkan job lock/timeout untuk backup, restore, maintenance, cloud sync, dan Cloudflare preflight/status.
7. Ukur portable final size setelah build, lalu debloat resource yang terbukti besar.

## Implementation Readiness

Audit ini bisa diimplementasikan setelah revisi ini, dengan batasan berikut:
- Implementasi fase pertama harus fokus pada item 1 sampai 3. Ini paling sesuai dengan konteks aplikasi yang akan dipakai lokal tetapi punya jalur publik lewat Cloudflare.
- Jangan mulai dari debloat besar atau rewrite backend. Data audit menunjukkan `release/portable-local-api` kecil; optimasi size harus berbasis pengukuran portable final.
- Jangan tambahkan Google SDK atau library besar baru. Untuk security headers, mulai dari helper internal; baru gunakan plugin jika ada alasan kuat dan size sudah diukur.
- Static route `/admin`, `/connector`, `/price-checker`, dan `/assets/*` tetap public untuk memuat shell UI. Yang harus dikunci adalah API private dan path mirip yang tidak seharusnya ikut public karena prefix.

## Implemented Phase 1

Status: implemented and verified on 2026-05-17.

Changes completed:
- Replaced wildcard CORS behavior with low-dependency security/CORS header handling in `local-api/src/http/securityHeaders.ts`.
- Replaced prefix-based public auth bypass with explicit method/path matching in `local-api/src/http/authHook.ts`.
- Kept static shells public: `/admin`, `/connector`, `/price-checker`, and `/assets/*`.
- Protected API paths that previously could be affected by broad prefixes, including `/cloudflare/*`, `/database/*`, `/settings`, `/users`, `/workspace`, and `/catalog`.
- Hardened Google OAuth callback origin validation and HTML escaping in `local-api/src/routes/database.routes.ts`.
- Removed inline script redirect from the OAuth callback success page.
- Forced seeded `portable-local-placeholder` users into password-reset flow and made legacy default login return `forcePasswordChange: true`.
- Updated seed migration `003_user_access_totp.sql` so fresh DBs no longer treat default placeholder users as normal-password users.
- Fixed portable blank screen after rebuild by changing Vite `base` to `./`, so Electron `loadFile(...)` can load bundled JS/CSS assets from `file://` instead of looking for `/assets` at the drive root.

Verification completed:
- `cmd /c npm run build:local-api`
- Targeted Fastify inject smoke for `/health`, `/health/integrity`, `/admin-api`, CORS preflight, OAuth escaping, and legacy default login forced reset.
- `cmd /c npm run smoke:final`
- `cmd /c npm run build:electron`
- `cmd /c npm run prepare:local-api-portable`
- `cmd /c npm run package:portable-exe`
- `cmd /c npm run smoke:portable`
- Verified packaged `release/portable-exe/win-unpacked/resources/pos-react-canvas/dist/index.html` now references `./assets/...`.

## Acceptance Criteria untuk Fase Fix

- `cmd /c npm run build:local-api` pass.
- `cmd /c npm run smoke:final` pass setelah perubahan API/auth/database.
- `cmd /c npm run package:portable-exe` dan `cmd /c npm run smoke:portable` pass jika packaging atau dependency berubah.
- Route private tanpa token tetap `401`, route private dengan role salah `403`, route static public tetap bisa dimuat.
- OAuth callback aman terhadap input HTML/script di `error` dan Host/origin tidak dikenal.
- Restore backup schema lama ditolak sebelum mutasi database.
- `/health` tetap ringan dan tidak menjalankan integrity check penuh.

## Catatan Implementasi

- Hindari refactor besar dulu. Perubahan paling bernilai adalah boundary hardening dan callback escaping.
- Bila menambah package baru seperti `@fastify/helmet` atau `@fastify/cors`, ukur dampak `release/portable-local-api` dan portable final setelah build.
