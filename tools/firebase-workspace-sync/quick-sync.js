const path = require('node:path');
const fs = require('node:fs/promises');
const chokidar = require('chokidar');
const fg = require('fast-glob');
const admin = require('firebase-admin');

const sourceDir = path.resolve(
  process.env.SOURCE_DIR || path.join(__dirname, 'folder_project')
);
const defaultServiceAccountPath = path.join(
  __dirname,
  'credentials',
  'service-account.json'
);
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || defaultServiceAccountPath;
const codeCollection = process.env.FIRESTORE_COLLECTION || 'code';
const metaCollection = process.env.FIRESTORE_META_COLLECTION || 'code_meta';
const docId = process.env.FIRESTORE_DOC_ID || 'pweb-2026-folder_project';

const ignore = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.DS_Store',
  '**/Thumbs.db',
];

let writeTimer = null;
let syncing = false;
let syncAgain = false;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function ensureSourceDir() {
  await fs.mkdir(sourceDir, { recursive: true });
}

async function initFirebase() {
  const resolvedServicePath = path.resolve(serviceAccountPath);
  let raw;
  try {
    raw = await fs.readFile(resolvedServicePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Service account not found at ${resolvedServicePath}. Place file at credentials/service-account.json or set FIREBASE_SERVICE_ACCOUNT_PATH.`
    );
  }

  const serviceAccount = JSON.parse(raw);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.firestore();
}

async function buildSnapshot() {
  const relFiles = await fg('**/*', {
    cwd: sourceDir,
    dot: true,
    onlyFiles: true,
    ignore,
  });

  const snapshot = {};

  await Promise.all(
    relFiles.map(async (relPath) => {
      const fullPath = path.join(sourceDir, relPath);
      const content = await fs.readFile(fullPath, 'utf8');
      snapshot[toPosix(relPath)] = content;
    })
  );

  return snapshot;
}

async function syncAll(db, trigger) {
  if (syncing) {
    syncAgain = true;
    return;
  }

  syncing = true;
  try {
    const snapshot = await buildSnapshot();

    await Promise.all([
      db.collection(codeCollection).doc(docId).set(snapshot),
      db
        .collection(metaCollection)
        .doc(docId)
        .set(
          {
            sourceDir,
            fileCount: Object.keys(snapshot).length,
            trigger,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        ),
    ]);

    console.log(
      `[SYNC] ${Object.keys(snapshot).length} file(s) uploaded to ${codeCollection}/${docId} (${trigger})`
    );
  } catch (error) {
    console.error('[SYNC ERROR]', error.message);
  } finally {
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      await syncAll(db, 'queued-change');
    }
  }
}

function scheduleSync(db, trigger) {
  if (writeTimer) {
    clearTimeout(writeTimer);
  }

  writeTimer = setTimeout(() => {
    writeTimer = null;
    syncAll(db, trigger);
  }, 300);
}

function attachKeyboardShortcut(db) {
  if (!process.stdin.isTTY) {
    return;
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  console.log('Hotkey: press r to re-upload all files, q to quit.');

  process.stdin.on('data', (key) => {
    if (key === 'r' || key === 'R') {
      console.log('[HOTKEY] Full re-upload requested.');
      syncAll(db, 'manual-hotkey-r');
      return;
    }

    if (key === 'q' || key === 'Q' || key === '\u0003') {
      process.exit(0);
    }
  });
}

async function main() {
  await ensureSourceDir();
  const db = await initFirebase();

  console.log(`Watching: ${sourceDir}`);
  console.log(`Target: ${codeCollection}/${docId}`);

  await syncAll(db, 'startup');

  const watcher = chokidar.watch(sourceDir, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
    ignored: ignore,
  });

  watcher
    .on('add', () => scheduleSync(db, 'add'))
    .on('change', () => scheduleSync(db, 'change'))
    .on('unlink', () => scheduleSync(db, 'unlink'))
    .on('addDir', () => scheduleSync(db, 'addDir'))
    .on('unlinkDir', () => scheduleSync(db, 'unlinkDir'))
    .on('error', (error) => console.error('[WATCH ERROR]', error.message));

  attachKeyboardShortcut(db);

  process.on('SIGINT', async () => {
    await watcher.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});