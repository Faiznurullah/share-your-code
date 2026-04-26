# Firebase Workspace Quick Sync

Tool ini adalah watcher Node sederhana untuk sinkronisasi folder_project ke Firestore secara realtime.

## Cara kerja

- Memantau perubahan file di [folder_project](folder_project).
- Saat file berubah, semua isi [folder_project](folder_project) di-upload ulang ke Firestore.
- Tekan r di terminal untuk paksa upload ulang penuh kapan saja.
- Tekan q untuk keluar.

## Setup

1. Masuk folder ini:

   cd tools

2. Install dependensi:

   npm install

3. Setup Firebase (sekali saja):

   - Buka Firebase Console, buat project baru atau pakai project yang ada.
   - Aktifkan Firestore Database (mode Production atau Test sesuai kebutuhan demo).
   - Buka Project Settings > Service accounts > Generate new private key.
   - Download file JSON key.

4. Simpan file JSON key ke folder ini dengan nama:

   credentials/service-account.json

5. Jalankan watcher:

   npm run quick

Opsional: jika file key ada di lokasi lain, gunakan env variable.

PowerShell:

   $env:FIREBASE_SERVICE_ACCOUNT_PATH="C:\path\service-account.json"

Git Bash:

   export FIREBASE_SERVICE_ACCOUNT_PATH="/c/path/service-account.json"

## Lokasi dokumen default

- code/pweb-2026-folder_project
- metadata: code_meta/pweb-2026-folder_project

## Variabel opsional

- FIRESTORE_COLLECTION
- FIRESTORE_META_COLLECTION
- FIRESTORE_DOC_ID
- SOURCE_DIR (default: tools/folder_project)

## Catatan

- Simpan file yang ingin dibagikan di [folder_project](folder_project).
- Semua file dibaca sebagai UTF-8 text.
- Untuk demo kelas, service account jangan dibagikan ke publik.
