import * as monaco from "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/+esm";

const editorElement = document.querySelector("#editor");
const filenameElement = document.querySelector("#filename");
const explorer = document.querySelector("#explorer");

const editor = monaco.editor.create(editorElement, {
  fontSize: "16px",
  readOnly: true,
  contextmenu: false,
  automaticLayout: true,
  minimap: { enabled: false },
});
monaco.editor.setTheme("vs-dark");

document.querySelectorAll("textarea").forEach((textarea) => {
  textarea.setAttribute("readonly", "readonly");
});

// disable copy
document.addEventListener("copy", function (e) {
  e.clipboardData.setData("text/plain", "");
  e.clipboardData.setData("text/html", "");
  e.preventDefault();
});

function markActiveFile(filename) {
  explorer.querySelectorAll("li.file.open").forEach((file) => {
    file.classList.remove("open");
  });

  const fileElem = document.getElementById(filename);
  if (fileElem) {
    fileElem.classList.add("open");
  }
}

explorer.addEventListener("click", (event) => {
  const target = event.target.closest("li.folder, li.file");
  if (!target || !explorer.contains(target)) {
    return;
  }

  if (target.classList.contains("folder")) {
    target.classList.toggle("open");
    const nestedList = target.querySelector("ul");
    if (nestedList) {
      nestedList.classList.toggle("open");
    }
  } else if (target.classList.contains("file")) {
    Alpine.store("code").switchTab(target.getAttribute("id"));
  }
});

const monacoLanguages = Object.fromEntries(
  monaco.languages.getLanguages().flatMap((l) => {
    let res = [];
    const extensions = l.extensions || [];
    extensions.forEach((e) => {
      res.push([e, l.id]);
    });
    return res;
  })
);

function detectLanguage(filename) {
  const extension = "." + filename.split(".").pop();
  if (extension in monacoLanguages) {
    return monacoLanguages[extension];
  }
  return "plaintext";
}

function generateExplorer(data, className) {
  className = typeof className === "undefined" ? "open" : className;

  const ul = document.createElement("ul");
  ul.className = className;

  for (let i = 0; i < data.length; i++) {
    const li = document.createElement("li");
    const node = data[i];

    li.textContent = node.text;
    li.title = node.text;

    if (node.nodes) {
      if (node.text === "lib") {
        li.className = "folder";
        li.appendChild(generateExplorer(node.nodes, ""));
      } else {
        li.className = "folder open";
        li.appendChild(generateExplorer(node.nodes, "open"));
      }
    } else {
      li.className = "file";
      li.setAttribute("id", node.id);
      li.setAttribute("data-bs-dismiss", "offcanvas");
      li.setAttribute("data-bs-target", "#sidebar");
      if (li.textContent.endsWith(".java")) {
        li.classList.add("code");
      }
    }

    ul.appendChild(li);
  }

  return ul;
}

function updateExplorer(data) {
  explorer.innerHTML = "";
  explorer.appendChild(generateExplorer(data));
}

// sort files
function sortCodes(codes) {
  const entries = Object.entries(codes);
  const sorted = entries.sort((a, b) => {
    const aFolder = a[0].includes("/");
    const bFolder = b[0].includes("/");

    if (aFolder && !bFolder) {
      return -1;
    }

    if (!aFolder && bFolder) {
      return 1;
    }

    return a[0].localeCompare(b[0]);
  });
  return Object.fromEntries(sorted);
}

function getTree(codes) {
  const paths = Object.keys(codes);
  const result = paths.reduce((r, p) => {
    const names = p.split("/");
    names.reduce((q, text) => {
      let temp = q.find((o) => o.text === text);
      if (!temp) q.push((temp = { text, nodes: [], id: p }));
      return temp.nodes;
    }, r);
    return r;
  }, []);
  for (let i = 0; i < result.length; i++) {
    result[i] = simplify(result[i]);
  }
  sortTree(result);
  return result;
}

function simplify(node) {
  if (node.nodes.length == 0) {
    const { nodes, ...newNode } = node;
    return newNode;
  }
  delete node["id"];
  if (node.nodes.length == 1) {
    const { nodes, ...newNode } = node;
    const n = nodes[0];
    if (n.nodes.length == 0) {
      node.nodes[0] = simplify(node.nodes[0]);
      return node;
    }
    newNode.text = newNode.text + "/" + n.text;
    newNode.nodes = n.nodes;
    return simplify(newNode);
  }
  for (let i = 0; i < node.nodes.length; i++) {
    node.nodes[i] = simplify(node.nodes[i]);
  }
  return node;
}

function sortTree(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length - 1; j++) {
      const a = nodes[j];
      const b = nodes[j + 1];

      const aFolder = "nodes" in a;
      const bFolder = "nodes" in b;

      const textCompare = a.text.localeCompare(b.text);

      if ((!aFolder && bFolder) || (aFolder == bFolder && textCompare > 0)) {
        let temp = nodes[j];
        nodes[j] = nodes[j + 1];
        nodes[j + 1] = temp;
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if ("nodes" in node) {
      sortTree(node.nodes);
    }
  }
}

import Alpine from "https://unpkg.com/alpinejs@3.12.0/dist/module.esm.js";
Alpine.store("code", {
  codes: {},
  activeTab: "",
  path: "",
  setPath(path) {
    this.path = path;
  },
  update(newCode) {
    newCode = sortCodes(newCode);
    this.codes = newCode;

    if (Object.keys(newCode).length === 0) {
      this.activeTab = "";
      updateExplorer([]);
      editor.getModel().setValue("");
      if (filenameElement) {
        filenameElement.textContent = "Belum ada file pada dokumen Firestore ini.";
      }
      return;
    }

    if (this.activeTab === "" || !(this.activeTab in newCode)) {
      for (let filename in newCode) {
        if (filename.endsWith(".java")) {
          this.activeTab = filename;
          break;
        }
      }

      if (this.activeTab === "") {
        this.activeTab = Object.keys(newCode)[0];
      }
    }

    updateExplorer(getTree(newCode));
    this.switchTab(this.activeTab);
  },
  switchTab(filename) {
    if (!filename || !(filename in this.codes)) {
      return;
    }

    this.activeTab = filename;

    markActiveFile(filename);

    const model = editor.getModel();
    const language = detectLanguage(filename);
    monaco.editor.setModelLanguage(model, language);
    model.setValue(this.codes[filename]);
  },
  save() {
    this.codes[this.activeTab] = editor.getValue();
  },
});
Alpine.start();

// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const requiredFirebaseKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];
const missingFirebaseConfig = requiredFirebaseKeys.filter(
  (key) => !firebaseConfig[key]
);

if (missingFirebaseConfig.length > 0) {
  throw new Error(
    `Firebase config belum lengkap di firebase-config.js: ${missingFirebaseConfig.join(
      ", "
    )}`
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Init Firestore
const db = getFirestore(app);

const url = new URL(window.location.href);
const rawPath = (url.searchParams.get("p") || "").trim();

// Firestore doc id segment tidak boleh mengandung '/'.
const isValidPath = rawPath !== "" && !rawPath.includes("/");
const path = isValidPath ? rawPath : "folder_project";

Alpine.store("code").setPath(path);
const docId = "pweb-2026-" + path;
const docRef = doc(db, "code", docId);
console.log(`Listening Firestore doc: code/${docId}`);

onSnapshot(
  docRef,
  (docSnapshot) => {
    let latestCode = docSnapshot.data();
    if (!latestCode) {
      latestCode = {};
    }

    Alpine.store("code").update(latestCode);
  },
  (error) => {
    console.error(
      `Firestore listener error on code/${docId}: ${error.code} - ${error.message}`
    );

    const filenameEl = document.getElementById("filename");
    if (filenameEl) {
      filenameEl.textContent =
        "Gagal membaca Firestore (permission-denied). Cek Firestore Rules.";
    }
  }
);