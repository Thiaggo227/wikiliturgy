"use strict";

// =========================
// CONFIG
// =========================
const API_URL =
  "https://script.google.com/macros/s/AKfycbylee4h1vLqxyweXo_WLip2HGFEvc3l1JHVP8YRqydjQZyPvg1eXaPmCK-PQ6HaTBjJ/exec";

// =========================
// STATE
// =========================
let passoAtual = -1;
let timeout = null;
let cache = [];
let selectedIndex = -1;
let aberto = false;

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initTheme();
  initSearch();
  carregarLiturgia();
  initReload();
  initNotes(); 
});

// =========================
// MENU
// =========================
function initMenu() {
  const menuToggle = document.getElementById("menu-toggle");
  const menu = document.querySelector(".menu");
  const overlay = document.getElementById("overlay");
  const btnUp = document.querySelector(".btnUp");

  if (!menuToggle || !menu) return;

  menuToggle.addEventListener("click", () => {
    aberto = !aberto;
    const icon = menuToggle.querySelector("i");

    if (aberto) {
      icon?.classList.remove("bi-list");
      icon?.classList.add("bi-x");

      menu.classList.add("active");
      overlay?.classList.add("active");

      btnUp?.classList.add("hide-up");

    } else {
      fecharMenu();
    }
  });

  overlay?.addEventListener("click", fecharMenu);
}

function fecharMenu() {
  const menuToggle = document.getElementById("menu-toggle");
  const menu = document.querySelector(".menu");
  const overlay = document.getElementById("overlay");
  const btnUp = document.querySelector(".btnUp");

  aberto = false;

  const icon = menuToggle?.querySelector("i");
  icon?.classList.remove("bi-x");
  icon?.classList.add("bi-list");

  menu?.classList.remove("active");
  overlay?.classList.remove("active");

  btnUp?.classList.remove("hide-up");
}

// =========================
// THEME
// =========================
function initTheme() {
  const btnTheme = document.querySelector(".btnBlack");
  const iconTheme = btnTheme?.querySelector("i");
  const temaSalvo = localStorage.getItem("theme");

  if (temaSalvo === "dark") {
    document.body.classList.add("dark");
    trocarIcon(true, iconTheme);
  }

  btnTheme?.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    trocarIcon(isDark, iconTheme);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

function trocarIcon(isDark, iconTheme) {
  if (!iconTheme) return;
  iconTheme.classList.toggle("bi-moon-stars", !isDark);
  iconTheme.classList.toggle("bi-brightness-high-fill", isDark);
}

// =========================
// SEARCH
// =========================
function initSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  input.addEventListener("input", () => {
    clearTimeout(timeout);
    const value = input.value.trim();

    if (!value) {
      limparResultados();
      return;
    }

    timeout = setTimeout(() => search(value), 300);
  });
}

async function search(query) {
  const box = document.getElementById("resultsBox");
  if (!box) return;

  const q = normalize(query);
  selectedIndex = -1;

  if (q.length < 2) {
    limparResultados();
    return;
  }

  // Define o timeout para mostrar o loader
  let loaderTimeout = setTimeout(() => {
    showLoader(box);
  }, 200);

  try {
    if (cache.length === 0) {
      const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      cache = Array.isArray(data) ? data : [];
    }

    const results = cache
      .map(item => {
        const termo = normalize(item.termo);
        const desc = normalize(item.descricao);
        let score = 0;
        if (termo === q) score += 100;
        else if (termo.startsWith(q)) score += 70;
        else if (termo.includes(q)) score += 40;
        if (desc.includes(q)) score += 20;
        return { item, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(r => r.item);

    clearTimeout(loaderTimeout);
    
    // Limpa o loader antes de renderizar os resultados reais
    box.innerHTML = ""; 
    renderResults(results, query);

  } catch (error) {
    clearTimeout(loaderTimeout);
    box.innerHTML = `<div style="padding:10px;color:red;">Erro na busca</div>`;
    box.classList.remove("no-shadow");
    box.classList.add("show-shadow");
  }
}

function limparResultados() {
  const box = document.getElementById("resultsBox");
  if (box) {
    box.innerHTML = "";
    box.classList.remove("show-shadow");
  }
}

function renderResults(data, query) {
  const box = document.getElementById("resultsBox");
  if (!box) return;

  box.classList.remove("no-shadow");
  box.classList.add("show-shadow");

  if (data.length === 0) {
    box.innerHTML = `<div style="padding:10px; color:var(--text-soft);">Nenhum resultado encontrado.</div>`;
    return;
  }

  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <strong>${item.termo}</strong>
      <small>${item.descricao || ""}</small>
    `;
    div.onclick = () => {
      const input = document.getElementById("searchInput");
      if (input) input.value = item.termo;
      limparResultados();
    };
    box.appendChild(div);
  });
}

function showLoader(box) {
  box.classList.add("show-shadow");
  box.classList.add("no-shadow"); 

  box.innerHTML = `
    <div class="load">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
}

// =========================
// LITURGIA
// =========================
async function carregarLiturgia() {
  try {
    const res = await fetch("https://calapi.inadiutorium.cz/api/v0/en/calendars/default/today");
    const data = await res.json();
    atualizarTela(data);
  } catch {
    atualizarTela({
      date: new Date().toISOString().split("T")[0],
      season: "Ordinary Time",
      color: "green",
      celebrations: [{ title: "Tempo Comum" }]
    });
  }
}

function atualizarTela(data) {
  setText("liturgia-data", formatarData(data.date));
  setText("tempo", traduzirTempo(data.season));
  setText("cor", traduzirCor(data.color));
  setText("celebracao", data.celebrations?.[0]?.title || "N/A");
}

// =========================
// NOTAS / MODAL
// =========================
function initNotes() {
  const btnEdit = document.getElementById("btnEdit");
  const modalOverlay = document.getElementById("modalOverlay");
  const closeModal = document.getElementById("closeModal");
  const saveNotes = document.getElementById("saveNotes");
  const noteArea = document.getElementById("noteArea");

  const savedNote = localStorage.getItem("wiki_liturgy_note");
  if (savedNote && noteArea) {
    noteArea.value = savedNote;
  }

  btnEdit?.addEventListener("click", () => {
    modalOverlay?.classList.add("active");
    if (aberto) fecharMenu(); 
  });

  closeModal?.addEventListener("click", () => {
    modalOverlay?.classList.remove("active");
  });

  saveNotes?.addEventListener("click", () => {
    const text = noteArea.value;
    localStorage.setItem("wiki_liturgy_note", text);
    
    const originalText = saveNotes.innerText;
    saveNotes.innerText = "Salvo!";

    setTimeout(() => {
      saveNotes.innerText = originalText;
    }, 1200);
  });
}

// =========================
// HELPERS
// =========================
function normalize(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function formatarData(d) {
  if (!d) return "";
  const p = d.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function traduzirTempo(t) {
  return {
    "Easter Time": "Tempo Pascal",
    Lent: "Quaresma",
    Advent: "Advento",
    "Christmas Time": "Natal",
    "Ordinary Time": "Tempo Comum"
  }[t] || t;
}

function traduzirCor(c) {
  return {
    green: "🟢 Verde",
    purple: "🟣 Roxo",
    white: "⚪ Branco",
    red: "🔴 Vermelho"
  }[c] || c;
}

// =========================
// RELOAD
// =========================
function initReload() {
  document.querySelector(".btnUp")?.addEventListener("click", (e) => {
    e.preventDefault();
    location.reload();
  });
}