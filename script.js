(() => {
  "use strict";

  const STORAGE_KEY = "statsrpg.v1";
  const MAX_LEVEL = 200;
  const MAX_RECENT = 12;

  const SKILLS = [
    "Cardio",
    "Strength",
    "Weight",
    "Finance",
    "Korean Language",
    "Social",
    "Knowledge",
    "Discipline",
  ];

  const SKILL_COLORS = {
    Cardio: ["#ff6b6b", "#ffd88a"],
    Strength: ["#c9a857", "#ffbf69"],
    Weight: ["#6b8cff", "#55d6a6"],
    Finance: ["#55d6a6", "#c9a857"],
    "Korean Language": ["#ff86c8", "#ffd88a"],
    Social: ["#a78bfa", "#55d6a6"],
    Knowledge: ["#ffd88a", "#6b8cff"],
    Discipline: ["#9ca3af", "#ffd88a"],
  };

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, String(v));
    }
    for (const child of children) node.append(child);
    return node;
  };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function getTier(level) {
  if (level <= 25) return "White";
  if (level <= 50) return "Yellow";
  if (level <= 75) return "Orange";
  if (level <= 100) return "Blue";
  if (level <= 125) return "Purple";
  if (level <= 150) return "Brown";
  if (level <= 175) return "Black";
  return "Red";
}

// RuneScape-like XP curve (approximate RS/OSRS formula).
function xpForLevel(level) {

  // RuneScape-like XP curve (approximate RS/OSRS formula).
  function xpForLevel(level) {
    const L = clamp(Math.floor(level), 1, MAX_LEVEL + 1);
    if (L <= 1) return 0;
    let points = 0;
    for (let i = 1; i < L; i++) points += Math.floor(i + 300 * Math.pow(2, i / 7));
    return Math.floor(points / 4);
  }

  function levelFromXp(xp) {
    const X = Math.max(0, Math.floor(xp));
    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      if (X < xpForLevel(lvl + 1)) return lvl;
    }
    return MAX_LEVEL;
  }

  function progressToNext(xp) {
    const lvl = levelFromXp(xp);
    const cur = Math.max(0, Math.floor(xp));
    if (lvl >= MAX_LEVEL) {
      return { level: MAX_LEVEL, pct: 100, cur, nextXp: cur, toNext: 0 };
    }
    const curMin = xpForLevel(lvl);
    const nextMin = xpForLevel(lvl + 1);
    const pct = ((cur - curMin) / (nextMin - curMin)) * 100;
    return {
      level: lvl,
      pct: clamp(pct, 0, 100),
      cur,
      nextXp: nextMin,
      toNext: Math.max(0, nextMin - cur),
    };
  }

  function formatInt(n) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function formatWhen(iso) {
    try {
      const d = new Date(iso);
      const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return `${day} • ${time}`;
    } catch {
      return "";
    }
  }

  function defaultState() {
    const skills = {};
    for (const name of SKILLS) skills[name] = { xp: 0 };
    return { v: 1, skills, recentBySkill: {} };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaultState();

      const base = defaultState();
      const incomingSkills = parsed.skills && typeof parsed.skills === "object" ? parsed.skills : {};
      for (const name of SKILLS) {
        const xp = incomingSkills?.[name]?.xp;
        base.skills[name].xp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
      }

      const rbs = parsed.recentBySkill && typeof parsed.recentBySkill === "object" ? parsed.recentBySkill : {};
      base.recentBySkill = {};
      for (const name of SKILLS) {
        const list = Array.isArray(rbs[name]) ? rbs[name] : [];
        base.recentBySkill[name] = list
          .slice(0, MAX_RECENT)
          .filter((x) => x && typeof x === "object")
          .map((x) => ({
            when: typeof x.when === "string" ? x.when : nowIso(),
            xp: Number.isFinite(x.xp) ? Math.max(1, Math.floor(x.xp)) : 1,
            note: typeof x.note === "string" ? x.note.slice(0, 80) : "",
          }));
      }
      return base;
    } catch {
      return defaultState();
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const state = loadState();

  const skillsGrid = $("#skillsGrid");
  const totalLevelEl = $("#totalLevel");
  const totalXpEl = $("#totalXp");
  const logBtn = $("#logBtn");
  const resetBtn = $("#resetBtn");

  const logDialog = $("#logDialog");
  const logForm = $("#logForm");
  const cancelBtn = $("#cancelBtn");
  const skillSelect = $("#skillSelect");
  const xpInput = $("#xpInput");
  const noteInput = $("#noteInput");

  const detailEmpty = $("#detailEmpty");
  const detailCard = $("#detailCard");
  const detailName = $("#detailName");
  const detailLevel = $("#detailLevel");
  const detailXp = $("#detailXp");
  const detailPct = $("#detailPct");
  const detailBar = $("#detailBar");
  const detailToNext = $("#detailToNext");
  const recentList = $("#recentList");
  const clearRecentBtn = $("#clearRecentBtn");

  let selectedSkill = null;

  function setIconGradient(iconEl, skillName) {
    const [a, b] = SKILL_COLORS[skillName] || ["#ffd88a", "#c9a857"];
    iconEl.style.background = `linear-gradient(180deg, ${a}33, ${b}99)`;
    iconEl.style.borderColor = `${b}55`;
  }

  function computeTotals() {
    let totalXp = 0;
    let totalLevel = 0;
    for (const name of SKILLS) {
      const xp = state.skills[name].xp || 0;
      totalXp += xp;
      totalLevel += levelFromXp(xp);
    }
    return { totalXp, totalLevel };
  }

  function renderSkillRow(name) {
    const xp = state.skills[name].xp || 0;
    const prog = progressToNext(xp);

    const icon = el("div", { class: "skillIcon", "aria-hidden": "true" });
    setIconGradient(icon, name);

    const barFill = el("div", { class: "bar__fill" });
    barFill.style.width = `${prog.pct.toFixed(2)}%`;

    const row = el(
      "div",
      {
        class: "skillRow",
        role: "listitem",
        tabindex: "0",
        "aria-selected": String(selectedSkill === name),
      },
      [
        icon,
        el("div", { class: "skillMain" }, [
          el("div", { class: "skillName", text: name }),
          el("div", { class: "skillSub" }, [
            el("div", { class: "bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" }, [barFill]),
            el("div", { class: "skillSub__text", text: `${Math.floor(prog.pct)}%` }),
          ]),
        ]),
        el("div", { class: "skillRight" }, [
          el("div", { class: "levelBadge", text: String(prog.level) }),
          el("div", { class: "xpTiny", text: `${formatInt(prog.cur)} XP` }),
        ]),
      ]
    );

    const select = () => {
      selectedSkill = name;
      render();
    };

    row.addEventListener("click", select);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select();
      }
    });

    return row;
  }

  function renderSkills() {
    skillsGrid.replaceChildren(...SKILLS.map(renderSkillRow));
  }

  function renderTotals() {
    const { totalXp, totalLevel } = computeTotals();
    totalLevelEl.textContent = formatInt(totalLevel);
    totalXpEl.textContent = formatInt(totalXp);
  }

  function renderDetail() {
    if (!selectedSkill) {
      detailEmpty.hidden = false;
      detailCard.hidden = true;
      return;
    }

    detailEmpty.hidden = true;
    detailCard.hidden = false;

    const xp = state.skills[selectedSkill].xp || 0;
    const prog = progressToNext(xp);

    detailName.textContent = selectedSkill;
    detailLevel.textContent = String(prog.level);
    detailXp.textContent = formatInt(prog.cur);
    detailPct.textContent = `${Math.floor(prog.pct)}%`;
    detailBar.style.width = `${prog.pct.toFixed(2)}%`;
    detailToNext.textContent = formatInt(prog.toNext);

    const iconEl = detailCard.querySelector(".skillIcon");
    if (iconEl) setIconGradient(iconEl, selectedSkill);

    const recents = state.recentBySkill[selectedSkill] || [];
    if (recents.length === 0) {
      recentList.replaceChildren(el("div", { class: "detailEmpty", text: "No recent activity yet." }));
    } else {
      recentList.replaceChildren(
        ...recents.map((r) =>
          el("div", { class: "recentItem" }, [
            el("div", { class: "recentItem__top" }, [
              el("div", { text: selectedSkill }),
              el("div", { text: formatWhen(r.when) }),
            ]),
            el("div", { class: "recentItem__main" }, [
              el("div", { class: "recentItem__note", text: r.note || "Activity" }),
              el("div", { class: "recentItem__xp", text: `+${formatInt(r.xp)}` }),
            ]),
          ])
        )
      );
    }
  }

  function render() {
    renderTotals();
    renderSkills();
    renderDetail();
  }

  function ensureSelectedSkill() {
    if (!selectedSkill) selectedSkill = SKILLS[0];
  }

  function openLogDialog(defaultXp = null) {
    ensureSelectedSkill();
    skillSelect.value = selectedSkill;
    xpInput.value = defaultXp != null ? String(defaultXp) : "";
    noteInput.value = "";

    if (typeof logDialog.showModal === "function") {
      logDialog.showModal();
      setTimeout(() => xpInput.focus(), 0);
    } else {
      alert("Your browser does not support dialogs. Please update your browser.");
    }
  }

  function closeLogDialog() {
    if (logDialog.open) logDialog.close();
  }

  function addXp(skillName, xpAmount, note = "") {
    const amt = Math.max(1, Math.floor(Number(xpAmount)));
    state.skills[skillName].xp = (state.skills[skillName].xp || 0) + amt;

    if (!state.recentBySkill[skillName]) state.recentBySkill[skillName] = [];
    state.recentBySkill[skillName].unshift({
      when: nowIso(),
      xp: amt,
      note: (note || "").trim().slice(0, 80),
    });
    state.recentBySkill[skillName] = state.recentBySkill[skillName].slice(0, MAX_RECENT);

    saveState(state);
    selectedSkill = skillName;
    render();
  }

  function hydrateSkillSelect() {
    skillSelect.replaceChildren(...SKILLS.map((s) => el("option", { value: s, text: s })));
  }

  function bindEvents() {
    logBtn.addEventListener("click", () => openLogDialog());
    cancelBtn.addEventListener("click", closeLogDialog);

    resetBtn.addEventListener("click", () => {
      const ok = confirm("Reset all StatsRPG data? This cannot be undone.");
      if (!ok) return;
      localStorage.removeItem(STORAGE_KEY);
      const fresh = defaultState();
      state.v = fresh.v;
      state.skills = fresh.skills;
      state.recentBySkill = fresh.recentBySkill;
      selectedSkill = null;
      render();
    });

    logForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const skillName = skillSelect.value;
      const xpAmount = Number(xpInput.value);
      if (!Number.isFinite(xpAmount) || xpAmount < 1) {
        xpInput.focus();
        return;
      }
      addXp(skillName, xpAmount, noteInput.value);
      closeLogDialog();
    });

    // Keep selection in sync if user changes skill in dialog.
    skillSelect.addEventListener("change", () => {
      selectedSkill = skillSelect.value;
      render();
    });

    // Quick add chips on detail view.
    detailCard.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const chip = t.closest("[data-xp]");
      if (!chip) return;
      const amt = Number(chip.getAttribute("data-xp"));
      if (!selectedSkill) return;
      if (!Number.isFinite(amt)) return;
      addXp(selectedSkill, amt, "");
    });

    clearRecentBtn.addEventListener("click", () => {
      if (!selectedSkill) return;
      state.recentBySkill[selectedSkill] = [];
      saveState(state);
      render();
    });

    // Close dialog on outside click.
    logDialog.addEventListener("click", (e) => {
      const rect = logDialog.getBoundingClientRect();
      const inDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!inDialog) closeLogDialog();
    });
  }

  function init() {
    hydrateSkillSelect();
    bindEvents();
    render();
  }

  init();
})();

