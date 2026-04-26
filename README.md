# Share Livecode

Web viewer untuk menampilkan source code secara realtime dari Firestore menggunakan Monaco Editor (mode read-only).

## Ringkasan

Proyek ini terdiri dari 2 bagian utama:

- Root project (viewer): aplikasi web statis yang menampilkan file dari Firestore.
- Sync tool: watcher Node.js di folder [tools](tools) untuk upload perubahan file lokal ke Firestore.

Alur kerja:

1. Simpan source code demo di folder yang dipantau sync tool (default: [tools/folder_project](tools/folder_project)).
2. Jalankan sync tool agar perubahan file di-push ke Firestore.
3. Buka web viewer (root project) untuk melihat update secara realtime.

## Struktur Folder

- [apps/index.html](apps/index.html): layout utama viewer.
- [apps/main.js](apps/main.js): logika explorer file, Monaco Editor, dan listener Firestore.
- [apps/style.css](apps/style.css): styling UI viewer.
- [apps/firebase-config.js](apps/firebase-config.js): konfigurasi Firebase client.
- [tools/quick-sync.js](tools/quick-sync.js): script watcher sinkronisasi folder lokal ke Firestore.
- [tools/folder_project](tools/folder_project): folder sumber default yang dibaca sync tool.

## Prasyarat

- Browser modern (Chrome/Edge/Firefox terbaru).
- Project Firebase dengan Firestore aktif.
- Node.js (untuk menjalankan sync tool).

## Setup Viewer (Root)

1. Buat/isi file [apps/firebase-config.js](apps/firebase-config.js) dengan format berikut:

```js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

2. Pastikan file [apps/firebase-config.js](apps/firebase-config.js) tetap di-ignore Git jika berisi credential sensitif.

## Jalankan Viewer

Download Live Server Ekstensi di VSC.

Lalu buka URL server di browser.

Path default yang dipakai viewer adalah `folder_project`.

Opsional: gunakan query string `?p=nama_path` untuk membuka dokumen lain.
Contoh: `http://localhost:5500/apps/?p=folder_project`

## Setup & Jalankan Realtime Sync Tool

Masuk ke folder [tools](tools) lalu:

```bash
npm install
npm run quick
```

Setup service account detail tersedia di:
- [tools/README.md](tools/README.md)

## Setup Deploy ke Surge

Surge dipakai untuk deploy cepat web statis (viewer) ke URL publik.

1. Install Surge CLI (global):

```bash
npm install --global surge
```

2. Login atau daftar akun:

```bash
surge
```

3. Deploy dari root project ke folder viewer:

```bash
surge apps nama-domainmu.surge.sh
```

Contoh:

```bash
surge apps uisi-pweb-2026.surge.sh
```

4. Update deployment:

```bash
surge apps uisi-pweb-2026.surge.sh
```

5. Hapus deployment jika sudah tidak dipakai:

```bash
surge teardown uisi-pweb-2026.surge.sh
```

Catatan penting:

- Pastikan [apps/firebase-config.js](apps/firebase-config.js) sudah terisi valid sebelum deploy.
- Jika deploy dari folder lain, gunakan path folder yang berisi [apps/index.html](apps/index.html).
- Untuk custom domain, ikuti prompt Surge setelah proses publish.

Dokumen Firestore default yang dipakai sync tool:
- `code/pweb-2026-folder_project`
- `code_meta/pweb-2026-folder_project`

## Konvensi Data Firestore

Viewer akan membaca dokumen dengan format:

- Collection: `code`
- Document ID: `pweb-2026-{path}`

Contoh jika path `folder_project`, maka dokumen yang dibaca adalah:
- `code/pweb-2026-folder_project`

## Catatan Keamanan

- Jangan commit credential sensitif seperti Firebase service account.
- Jangan publish nilai rahasia dari [apps/firebase-config.js](apps/firebase-config.js) di repositori publik.

## Troubleshooting

- Jika muncul error permission denied:
  - Cek Firestore Rules.
  - Pastikan projectId dan kredensial benar.
- Jika viewer kosong:
  - Pastikan sync tool berjalan.
  - Pastikan dokumen Firestore untuk path yang dibuka memang ada.
- Jika listener gagal inisialisasi:
  - Cek semua field wajib di [apps/firebase-config.js](apps/firebase-config.js).
