# Share Livecode

Web viewer untuk menampilkan source code secara realtime dari Firestore menggunakan Monaco Editor (mode read-only).

## Ringkasan

Proyek ini terdiri dari 2 bagian utama:

- Root project (viewer): aplikasi web statis yang menampilkan file dari Firestore.
- Sync tool: watcher Node.js di folder [firebase-workspace-sync-extension](firebase-workspace-sync-extension) untuk upload perubahan file lokal ke Firestore.

Alur kerja:

1. Simpan source code demo di folder yang dipantau sync tool (default: folder_project di dalam sync tool).
2. Jalankan sync tool agar perubahan file di-push ke Firestore.
3. Buka web viewer (root project) untuk melihat update secara realtime.

## Struktur Folder

- [index.html](index.html): layout utama viewer.
- [main.js](main.js): logika explorer file, Monaco Editor, dan listener Firestore.
- [style.css](style.css): styling UI viewer.
- [firebase-config.js](firebase-config.js): konfigurasi Firebase client (harus dibuat lokal, jangan di-commit).
- [firebase-workspace-sync-extension](firebase-workspace-sync-extension): tool sinkronisasi folder lokal ke Firestore.

## Prasyarat

- Browser modern (Chrome/Edge/Firefox terbaru).
- Project Firebase dengan Firestore aktif.
- Node.js (untuk menjalankan sync tool).

## Setup Viewer (Root)

1. Buat file [firebase-config.js](firebase-config.js) di root dengan format berikut:

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

2. Pastikan file [firebase-config.js](firebase-config.js) tetap di-ignore Git (sudah diatur di [.gitignore](.gitignore)).

## Jalankan Viewer

Karena viewer adalah web statis, jalankan dengan static server apa saja. Contoh:

```bash
# opsi 1 (npm package)
npx serve .

# opsi 2 (python)
python -m http.server 8080
```

Lalu buka URL server di browser.

Path default yang dipakai viewer adalah `folder_project`.

## Setup & Jalankan Realtime Sync Tool

Masuk ke folder [firebase-workspace-sync-extension](firebase-workspace-sync-extension) lalu:

```bash
npm install
npm run quick
```

Setup service account detail tersedia di:
- [firebase-workspace-sync-extension/README.md](firebase-workspace-sync-extension/README.md)

Dokumen Firestore default yang dipakai sync tool:
- `code/P2-2024-folder_project`
- `code_meta/P2-2024-folder_project`

## Konvensi Data Firestore

Viewer akan membaca dokumen dengan format:

- Collection: `code`
- Document ID: `P2-2024-{path}`

Contoh jika path `folder_project`, maka dokumen yang dibaca adalah:
- `code/P2-2024-folder_project`

## Catatan Keamanan

- Jangan commit credential sensitif seperti Firebase service account.
- Jangan publish nilai rahasia dari [firebase-config.js](firebase-config.js) di repositori publik.

## Troubleshooting

- Jika muncul error permission denied:
  - Cek Firestore Rules.
  - Pastikan projectId dan kredensial benar.
- Jika viewer kosong:
  - Pastikan sync tool berjalan.
  - Pastikan dokumen Firestore untuk path yang dibuka memang ada.
- Jika listener gagal inisialisasi:
  - Cek semua field wajib di [firebase-config.js](firebase-config.js).
