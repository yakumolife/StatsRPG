(() => {
  "use strict";

  const STORAGE_KEY = "statsrpg.v1";
  const MAX_LEVEL = 200;
  const MAX_RECENT = 12;

  const SKILL_CATEGORIES = {

    Strength: [
      "Back Squat",
      "Deadlift",
      "Bench Press",
      "Shoulder Press",
      "Clean",
      "Snatch",
      "Pull-ups",
      "Kettlebell Swings"
    ],
  
    Conditioning: [
      "Run",
      "Row",
      "Neuro/Core"
    ],
  
    Mind: [
      "Knowledge",
      "Korean Language",
      "Finance",
      "Stretching"
    ],
  
    Character: [
      "Discipline"
    ],
  
    Social: [
      "Twitter",
      "LinkedIn"
    ],
  
    Music: [
      "Violin",
      "Piano",
      "Guitar"
    ]
  };
  let boss = {
    name: "Procrastination Dragon",
    maxHp: 1000,
    hp: 1000,
    defeated: false
  };
  // Flatten categories into the SKILLS list your app already uses
  const SKILLS = Object.values(SKILL_CATEGORIES).flat();

  const SKILL_COLORS = {
    "Back Squat": ["#c9a857", "#ffbf69"],
    "Deadlift": ["#ff6b6b", "#ffd88a"],
    "Bench Press": ["#6b8cff", "#55d6a6"],
    "Shoulder Press": ["#ff86c8", "#ffd88a"],
    "Clean": ["#55d6a6", "#c9a857"],
    "Snatch": ["#a78bfa", "#55d6a6"],
    "Pull-ups": ["#ffd88a", "#6b8cff"],
    "Kettlebell Swings": ["#ff6b6b", "#ffd88a"],
    Stretching: ["#55d6a6", "#a78bfa"],
    Twitter: ["#6b8cff", "#55d6a6"],
    LinkedIn: ["#55d6a6", "#c9a857"],
    Violin: ["#ff86c8", "#ffd88a"],
    Piano: ["#a78bfa", "#55d6a6"],
    Guitar: ["#ffd88a", "#ff6b6b"],
    "Run": ["#6b8cff", "#55d6a6"],
    "Row": ["#a78bfa", "#55d6a6"],
    "Neuro/Core": ["#9ca3af", "#ffd88a"],
    Finance: ["#55d6a6", "#c9a857"],
    "Korean Language": ["#ff86c8", "#ffd88a"],
    Social: ["#a78bfa", "#55d6a6"],
    Knowledge: ["#ffd88a", "#6b8cff"],
    Discipline: ["#9ca3af", "#ffd88a"],
  };

  const DEFAULT_SYMBOLS = {
    "Back Squat": "🏋️",
    Deadlift: "🏋️‍♂️",
    "Bench Press": "🏋️‍♀️",
    "Shoulder Press": "💪",
    Clean: "⚡",
    Snatch: "🔥",
    Pullups: "🧗",
    Run: "🏃",
    Row: "🚣",
    "Neuro & Core": "🧠",
    Finance: "🪙",
    "Korean Language": "한",
    Knowledge: "📚",
    Discipline: "🛡️",
    "Kettlebell Swings": "🏋️",
    Stretching: "🧘",
    Twitter: "🐦",
    LinkedIn: "💼",
    Violin: "🎻",
    Piano: "🎹",
    Guitar: "🎸",
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

  // CrossFit Level Method-style leveling (1–200) with RuneScape-like feel:
  // early levels are quick; later levels require much more XP.
  // XP values here are "XP required to reach level L" (minimum XP for level).
  const XP_TABLE = (() => {
    const t = Array(MAX_LEVEL + 2).fill(0);
    let points = 0;
    t[1] = 0;
    for (let lvl = 2; lvl <= MAX_LEVEL + 1; lvl++) {
      const i = lvl - 1;
      points += Math.floor(i + 20 * Math.pow(2, i / 14));
      t[lvl] = points;
    }
    return t;
  })();

  function xpForLevel(level) {
    const L = clamp(Math.floor(level), 1, MAX_LEVEL + 1);
    return XP_TABLE[L] ?? 0;
  }

  function levelForXp(xp) {
    const X = Math.max(0, Math.floor(xp));
    if (X >= xpForLevel(MAX_LEVEL + 1)) return MAX_LEVEL;

    let lo = 1;
    let hi = MAX_LEVEL;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (X < xpForLevel(mid + 1)) hi = mid - 1;
      else lo = mid + 1;
    }
    return clamp(hi, 1, MAX_LEVEL);
  }

  function progressToNext(xp) {
    const lvl = levelForXp(xp);
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
  function updateBossUI() {

    const hpPercent = (boss.hp / boss.maxHp) * 100;
  
    document.getElementById("bossHpBar").style.width = hpPercent + "%";
  
    document.getElementById("bossHpText").textContent =
      "HP: " + boss.hp + " / " + boss.maxHp;
  }
  function resetBossIfNewWeek() {
    const now = new Date();
    const week = now.getFullYear() + "-" + getWeekNumber(now);
  
    if (state.bossWeek !== week) {
      boss.hp = boss.maxHp;
      boss.defeated = false;
          
      state.bossWeek = week;
      state.bossHp = boss.hp;
      state.bossDefeated = boss.defeated;
      saveState(state);
      updateBossUI();
    }
  }
  
  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date - yearStart) / 86400000) + 1)/7);
  }

  function formatInt(n) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  }
  function renderWeeklyReport() {
    const reportEl = document.getElementById("weeklyReportContent");
  
    const now = new Date();
    const week = now.getFullYear() + "-" + getWeekNumber(now);
  
    let totalXp = 0;
    let totalLogs = 0;
    let skillTotals = {};
  
    for (const skill in state.recentBySkill) {
      for (const entry of state.recentBySkill[skill]) {
  
        const entryDate = new Date(entry.when);
        const entryWeek = entryDate.getFullYear() + "-" + getWeekNumber(entryDate);
  
        if (entryWeek === week) {
          totalXp += entry.xp;
          totalLogs++;
  
          skillTotals[skill] = (skillTotals[skill] || 0) + entry.xp;
        }
      }
    }
  
    let topSkill = "None";
    let topXp = 0;
  
    for (const skill in skillTotals) {
      if (skillTotals[skill] > topXp) {
        topXp = skillTotals[skill];
        topSkill = skill;
      }
    }
  
    reportEl.replaceChildren(
      el("div", { class: "weeklyItem", text: "XP gained this week: " + formatInt(totalXp) }),
      el("div", { class: "weeklyItem", text: "Boss damage this week: " + formatInt(totalXp) }),
      el("div", { class: "weeklyItem", text: "Activities logged: " + totalLogs }),
      el("div", { class: "weeklyItem", text: "Top Skill: " + topSkill + " (+" + formatInt(topXp) + " XP)" })
    );
  }
  function getDailyActivity() {

    const counts = {};
  
    for (const skill in state.recentBySkill) {
  
      const records = state.recentBySkill[skill];
  
      for (const r of records) {
  
        const date = new Date(r.when).toISOString().slice(0,10);
  
        counts[date] = (counts[date] || 0) + 1;
  
      }
  
    }
  
    return counts;
  }
  function milestoneData(level) {
    if (level >= 200) return { title: "Legend", color: "#ffcc00" };
    if (level >= 150) return { title: "Grandmaster", color: "#ff5555" };
    if (level >= 100) return { title: "Master", color: "#aa66ff" };
    if (level >= 75) return { title: "Expert", color: "#4da6ff" };
    if (level >= 50) return { title: "Adept", color: "#33cc99" };
    if (level >= 25) return { title: "Apprentice", color: "#66cc66" };
  
    return { title: "Novice", color: "#aaaaaa" };
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

  function defaultSymbolForSkill(name) {
    return DEFAULT_SYMBOLS[name] || "◆";
  }

  function skillSymbol(name) {
    const raw = state?.skills?.[name]?.symbol;
    if (typeof raw !== "string") return defaultSymbolForSkill(name);
    const trimmed = raw.trim();
    return trimmed ? trimmed : defaultSymbolForSkill(name);
  }

  function defaultState() {
    const skills = {};
    for (const name of SKILLS) skills[name] = { xp: 0, symbol: defaultSymbolForSkill(name) };
  
    const now = new Date();
    const week = now.getFullYear() + "-" + getWeekNumber(now);
  
    return {
      v: 2,
      skills,
      recentBySkill: {},
      bossHp: 1000,
      bossDefeated: false,
      bossWeek: week
    };
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

        const sym = incomingSkills?.[name]?.symbol;
        if (typeof sym === "string" && sym.trim()) base.skills[name].symbol = sym.trim();
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
      base.bossHp = Number.isFinite(parsed.bossHp) ? parsed.bossHp : 1000;
      base.bossDefeated = parsed.bossDefeated === true;
      base.bossWeek = typeof parsed.bossWeek === "string" ? parsed.bossWeek : null;
      
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
  const symbolsBtn = $("#symbolsBtn");

  const logDialog = $("#logDialog");
  const logForm = $("#logForm");
  const cancelBtn = $("#cancelBtn");
  const skillSelect = $("#skillSelect");
  const xpInput = $("#xpInput");
  const noteInput = $("#noteInput");

  const symbolsDialog = $("#symbolsDialog");
  const symbolsForm = $("#symbolsForm");
  const symbolsCancelBtn = $("#symbolsCancelBtn");
  const symbolsList = $("#symbolsList");

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
  let openCategories = {};

  function setIconGradient(iconEl, skillName) {
    const [a, b] = SKILL_COLORS[skillName] || ["#ffd88a", "#c9a857"];
    iconEl.style.background = `linear-gradient(180deg, ${a}33, ${b}99)`;
    iconEl.style.borderColor = `${b}55`;
  }
  function getCharacterLevel(totalXp) {
    return Math.floor(totalXp / 1000) + 1;
  }
  function computeTotals() {
    let totalXp = 0;
    let totalLevel = 0;
    for (const name of SKILLS) {
      const xp = state.skills[name].xp || 0;
      totalXp += xp;
      totalLevel += levelForXp(xp);
    }
    return { totalXp, totalLevel };
  }

  function renderSkillRow(name) {
    const xp = state.skills[name].xp || 0;
    const prog = progressToNext(xp);
    const milestone = milestoneData(prog.level);

    const icon = el("div", { class: "skillIcon", "aria-hidden": "true" });
    setIconGradient(icon, name);
    icon.textContent = skillSymbol(name);

    const barFill = el("div", { class: "bar__fill" });
    barFill.style.width = `${prog.pct.toFixed(2)}%`;

    const symbol = skillSymbol(name);
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
          el("div", { class: "skillName" }, [
            el("span", { class: "skillSymbol", text: symbol, "aria-hidden": "true" }),
            el("span", { text: name }),
          ]),
          el("div", { class: "skillSub" }, [
            el("div", { class: "bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" }, [barFill]),
            el("div", { class: "skillSub__text", text: `${Math.floor(prog.pct)}% • ${formatInt(prog.toNext)} XP` }),
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
    const elements = [];
  
    for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
      let totalLevel = 0;

      for (const skill of skills) {
        const xp = state.skills[skill]?.xp || 0;
        const prog = progressToNext(xp);
        totalLevel += prog.level;
      }
      
      const isOpen = openCategories[category] ?? false;
  
      const header = el("div", {
        class: "skillCategory",
        text: (isOpen ? "▼ " : "▶ ") + category + " (" + totalLevel + ")",
        onclick: () => {
          openCategories[category] = !isOpen;
          render();
        }
      });
  
      elements.push(header);
  
      if (isOpen) {
        for (const skill of skills) {
          elements.push(renderSkillRow(skill));
        }
      }
    }
  
    skillsGrid.replaceChildren(...elements);
  }

  function renderTotals() {
    const { totalXp, totalLevel } = computeTotals();
    totalLevelEl.textContent = formatInt(totalLevel);
    totalXpEl.textContent = formatInt(totalXp);
    const charLevel = getCharacterLevel(totalXp);
    document.getElementById("characterLevel").textContent = charLevel;

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
    const milestone = milestoneData(prog.level);
    const symbol = skillSymbol(selectedSkill);
    detailName.replaceChildren(
      el("span", { class: "skillSymbol skillSymbol--lg", text: symbol, "aria-hidden": "true" }),
      el("span", { text: selectedSkill }),
      el("span", { 
        class: "skillTitle", 
        text: " • " + milestone.title,
        style: `color:${milestone.color}`
      })
    );
    detailLevel.textContent = String(prog.level);
    detailXp.textContent = formatInt(prog.cur);
    detailPct.textContent = `${Math.floor(prog.pct)}%`;
    detailBar.style.width = `${prog.pct.toFixed(2)}%`;
    detailToNext.textContent = formatInt(prog.toNext);

    const iconEl = detailCard.querySelector(".skillIcon");
    if (iconEl) {
      setIconGradient(iconEl, selectedSkill);
      iconEl.textContent = symbol;
    }

    const recents = state.recentBySkill[selectedSkill] || [];
    if (recents.length === 0) {
      recentList.replaceChildren(el("div", { class: "detailEmpty", text: "No recent activity yet." }));
    } else {
      recentList.replaceChildren(
        ...recents.map((r) =>
          el("div", { class: "recentItem" }, [
            el("div", { class: "recentItem__top" }, [
              el("div", { text: `${symbol} ${selectedSkill}` }),
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

  function renderHeatmap() {

    const container = document.getElementById("heatmap");
  
    const activity = getDailyActivity();
  
    const cells = [];
  
    const days = 91; // about 13 weeks
  
    for (let i = days - 1; i >= 0; i--) {
  
      const d = new Date();
      d.setDate(d.getDate() - i);
  
      const key = d.toISOString().slice(0,10);
  
      const count = activity[key] || 0;
  
      let level = 0;
  
      if (count >= 5) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;
  
      const cell = el("div", {
        class: "heatCell heat" + level,
        title: key + " — " + count + " activities"
      });
  
      cells.push(cell);
  
    }
  
    container.replaceChildren(...cells);
  
  }
  function render() {
    renderTotals();
    renderSkills();
    renderDetail();
    renderHeatmap();
    renderWeeklyReport();
    renderCategoryStats();
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
    
    // Damage boss when XP is gained
    boss.hp -= amt;
    if (boss.hp < 0) boss.hp = 0;
    
    showDamage(amt);
    updateBossUI();

    if (boss.hp === 0 && !boss.defeated) {
      boss.defeated = true;
      alert("Boss defeated! New boss arrives next week.");
    }
    state.bossHp = boss.hp;
    state.bossDefeated = boss.defeated;
    
    saveState(state);
    
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
  function showDamage(amount) {
    const container = document.getElementById("damageContainer");
  
    const dmg = document.createElement("div");
    dmg.className = "damageNumber";
    dmg.textContent = "+" + amount;
  
    container.appendChild(dmg);
  
    setTimeout(() => {
      dmg.remove();
    }, 1000);
  }
  function hydrateSkillSelect() {
    const prev = skillSelect.value;
    skillSelect.replaceChildren(...SKILLS.map((s) => el("option", { value: s, text: `${skillSymbol(s)} ${s}` })));
    if (prev) skillSelect.value = prev;
  }

  function buildSymbolsList() {
    if (!symbolsList) return;
    symbolsList.replaceChildren(
      ...SKILLS.map((name) => {
        const preview = el("div", { class: "skillIcon", "aria-hidden": "true" });
        setIconGradient(preview, name);
        preview.textContent = skillSymbol(name);

        const input = el("input", {
          class: "field__control symbolsInput",
          type: "text",
          inputmode: "text",
          autocomplete: "off",
          spellcheck: "false",
          placeholder: defaultSymbolForSkill(name),
          value: state.skills[name].symbol || "",
          dataset: { skill: name },
        });

        return el("label", { class: "symbolsRow", role: "listitem" }, [
          preview,
          el("div", { class: "symbolsRow__main" }, [
            el("div", { class: "symbolsRow__name", text: name }),
            input,
          ]),
        ]);
      })
    );
  }
  function renderCategoryStats() {

    const container = document.getElementById("categoryStats");
    container.innerHTML = "";
  
    Object.keys(SKILL_CATEGORIES).forEach(category => {
  
      let totalXp = 0;
  
      SKILL_CATEGORIES[category].forEach(skill => {
        if (skills[skill]) {
          totalXp += skills[skill].xp;
        }
      });
  
      const level = Math.floor(Math.sqrt(totalXp / 100));
      const nextLevelXp = (level + 1) ** 2 * 100;
      const currentLevelXp = level ** 2 * 100;
  
      const progress = (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp);
  
      const block = document.createElement("div");
      block.className = "categoryBlock";
  
      block.innerHTML = `
        <div class="categoryHeader">
          <span class="categoryName">${category}</span>
          <span class="categoryLevel">Lv ${level}</span>
        </div>
  
        <div class="categoryBar">
          <div class="categoryFill" style="width:${progress * 100}%"></div>
        </div>
      `;
  
      container.appendChild(block);
  
    });
  
  }
  function openSymbolsDialog() {
    ensureSelectedSkill();
    buildSymbolsList();
    if (typeof symbolsDialog?.showModal === "function") {
      symbolsDialog.showModal();
      const firstInput = symbolsDialog.querySelector("input[data-skill]");
      if (firstInput instanceof HTMLInputElement) setTimeout(() => firstInput.focus(), 0);
    } else {
      alert("Your browser does not support dialogs. Please update your browser.");
    }
  }

  function closeSymbolsDialog() {
    if (symbolsDialog?.open) symbolsDialog.close();
  }

  function bindEvents() {
    logBtn.addEventListener("click", () => openLogDialog());
    cancelBtn.addEventListener("click", closeLogDialog);

    symbolsBtn?.addEventListener("click", openSymbolsDialog);
    symbolsCancelBtn?.addEventListener("click", closeSymbolsDialog);

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

    symbolsForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputs = symbolsDialog.querySelectorAll("input[data-skill]");
      for (const node of inputs) {
        if (!(node instanceof HTMLInputElement)) continue;
        const name = node.dataset.skill;
        if (!name || !SKILLS.includes(name)) continue;
        const v = (node.value || "").trim();
        state.skills[name].symbol = v ? v : defaultSymbolForSkill(name);
      }
      saveState(state);
      hydrateSkillSelect();
      render();
      closeSymbolsDialog();
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

    // Close symbols dialog on outside click.
    symbolsDialog?.addEventListener("click", (e) => {
      const rect = symbolsDialog.getBoundingClientRect();
      const inDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!inDialog) closeSymbolsDialog();
    });
  }

  function init() {
    if (state.bossHp !== undefined) {
      boss.hp = state.bossHp;
    }
  
    if (state.bossDefeated !== undefined) {
      boss.defeated = state.bossDefeated;
    }
  
    resetBossIfNewWeek();
  
    state.bossHp = boss.hp;
    state.bossDefeated = boss.defeated;
    saveState(state);
  
    hydrateSkillSelect();
    bindEvents();
    render();

    updateBossUI();
  }
  init();
})();

