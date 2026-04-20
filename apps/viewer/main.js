import * as monaco from "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/+esm";

const editor = monaco.editor.create(document.querySelector("#editor"), {
  fontSize: "16px",
  readOnly: true,
  contextmenu: false,
  automaticLayout: true,
  minimap: { enabled: false },
});

document.querySelectorAll("textarea").forEach((textarea) => {
  textarea.setAttribute("readonly", "readonly");
});

// disable copy
document.addEventListener("copy", function (e) {
  e.clipboardData.setData("text/plain", "");
  e.clipboardData.setData("text/html", "");
  e.preventDefault();
});

const explorer = document.querySelector("#explorer");

explorer.addEventListener("click", (event) => {
  const target = event.target;

  if (target.classList.contains("folder")) {
    target.classList.toggle("open");
    target.querySelector("ul").classList.toggle("open");
  } else if (target.classList.contains("file")) {
    target.classList.add("open");
    Alpine.store("code").switchTab(target.getAttribute("id"));
    explorer.querySelectorAll(".file").forEach((file) => {
      if (file != target) {
        file.classList.remove("open");
      }
    });
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

    li.textContent = data[i].text;

    if (data[i].href) {
      li.href = data[i].href;
    }

    if (data[i].nodes) {
      if (data[i].text == "lib") {
        li.className = "folder";
        li.appendChild(generateExplorer(data[i].nodes, ""));
      } else {
        li.className = "folder open";
        li.appendChild(generateExplorer(data[i].nodes, "open"));
      }
    } else {
      li.className = "file";
      li.setAttribute("id", data[i].id);
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
  const explorer = document.getElementById("explorer");
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
  let result = paths.reduce((r, p) => {
    var names = p.split("/");
    names.reduce((q, text) => {
      var temp = q.find((o) => o.text === text);
      if (!temp) q.push((temp = { text, nodes: [], id: p }));
      return temp.nodes;
    }, r);
    return r;
  }, []);
  for (let i = 0; i < result.length; i++) {
    result[i] = simplify(result[i]);
  }
  sortTree(result);
  console.log(result);
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

    if (this.activeTab == "" || !(this.activeTab in newCode)) {
      for (let filename in newCode) {
        if (filename.endsWith(".java")) {
          this.activeTab = filename;
          break;
        }
      }
    }

    updateExplorer(getTree(newCode));
    console.log(newCode);
    this.switchTab(this.activeTab);
  },
  switchTab(filename) {
    this.activeTab = filename;
    const fileElem = document.getElementById(filename);
    if (!fileElem.classList.contains("open")) {
      fileElem.classList.add("open");
    }
    const language = detectLanguage(filename);
    monaco.editor.setModelLanguage(editor.getModel(), language);
    editor.getModel().setValue(this.codes[filename]);
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

let url = new URL(window.location.href);
let path = url.pathname.substr(1);
let qs = url.searchParams.get("p");
if (path == "" || path.endsWith(".html")) {
  if (qs != null) {
    path = qs;
  } else {
    path = "folder_project";
  }
}
Alpine.store("code").setPath(path);
let docId = "P2-2024-" + path;
const docRef = doc(db, "code", docId);
console.log(`Listening Firestore doc: code/${docId}`);

const unsub = onSnapshot(
  docRef,
  (docSnapshot) => {
    console.log("Current data: ", docSnapshot.data());
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