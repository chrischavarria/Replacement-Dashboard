const STORAGE_KEY = "replacement-dashboard-config";
const DEMO_KEY = "replacement-dashboard-demo";

const demoData = {
  technicians: [
    { id: "tech-1", name: "Avery Johnson", created_at: "2026-01-03T12:00:00.000Z" },
    { id: "tech-2", name: "Mia Chen", created_at: "2026-01-06T12:00:00.000Z" },
    { id: "tech-3", name: "Jordan Blake", created_at: "2026-01-08T12:00:00.000Z" }
  ],
  reasons: [
    { id: "reason-1", name: "Wrong item selected", created_at: "2026-01-03T12:00:00.000Z" },
    { id: "reason-2", name: "Incorrect shipping address", created_at: "2026-01-03T12:00:00.000Z" },
    { id: "reason-3", name: "Missing accessory", created_at: "2026-01-03T12:00:00.000Z" },
    { id: "reason-4", name: "Wrong quantity", created_at: "2026-01-03T12:00:00.000Z" }
  ],
  replacements: [
    ["tech-1", "reason-1", 4], ["tech-1", "reason-2", 11], ["tech-2", "reason-3", 18],
    ["tech-3", "reason-1", 23], ["tech-2", "reason-4", 26], ["tech-1", "reason-1", 35],
    ["tech-3", "reason-2", 39], ["tech-2", "reason-3", 44], ["tech-1", "reason-4", 52],
    ["tech-2", "reason-1", 59], ["tech-3", "reason-3", 65], ["tech-1", "reason-2", 72]
  ].map(([technician_id, reason_id, daysAgo], index) => ({
    id: `replacement-${index + 1}`,
    technician_id,
    reason_id,
    order_number: `R-${4200 + index}`,
    notes: "",
    replacement_date: dateDaysAgo(daysAgo),
    created_at: new Date().toISOString()
  }))
};

const state = {
  client: null,
  mode: "demo",
  technicians: [],
  reasons: [],
  replacements: [],
  range: "30",
  techFilter: "all"
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  wireEvents();
  els.todayPill.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
  els.entryDate.value = new Date().toISOString().slice(0, 10);
  await connectFromSavedConfig();
  await loadAll();
}

function cacheElements() {
  Object.assign(els, {
    todayPill: document.querySelector("#today-pill"),
    syncTitle: document.querySelector("#sync-title"),
    syncDetail: document.querySelector("#sync-detail"),
    statusDot: document.querySelector(".status-dot"),
    rangeFilter: document.querySelector("#range-filter"),
    techFilter: document.querySelector("#tech-filter"),
    totalCount: document.querySelector("#total-count"),
    totalNote: document.querySelector("#total-note"),
    topReason: document.querySelector("#top-reason"),
    topReasonNote: document.querySelector("#top-reason-note"),
    topTech: document.querySelector("#top-tech"),
    topTechNote: document.querySelector("#top-tech-note"),
    monthCount: document.querySelector("#month-count"),
    monthNote: document.querySelector("#month-note"),
    trendChart: document.querySelector("#trend-chart"),
    reasonBars: document.querySelector("#reason-bars"),
    replacementForm: document.querySelector("#replacement-form"),
    entryReason: document.querySelector("#entry-reason"),
    entryTech: document.querySelector("#entry-tech"),
    entryOrder: document.querySelector("#entry-order"),
    entryDate: document.querySelector("#entry-date"),
    entryNotes: document.querySelector("#entry-notes"),
    entryMessage: document.querySelector("#entry-message"),
    techCards: document.querySelector("#tech-cards"),
    techForm: document.querySelector("#tech-form"),
    techName: document.querySelector("#tech-name"),
    techList: document.querySelector("#tech-list"),
    reasonForm: document.querySelector("#reason-form"),
    reasonName: document.querySelector("#reason-name"),
    reasonList: document.querySelector("#reason-list"),
    configForm: document.querySelector("#config-form"),
    supabaseUrl: document.querySelector("#supabase-url"),
    supabaseKey: document.querySelector("#supabase-key"),
    clearConfig: document.querySelector("#clear-config"),
    configMessage: document.querySelector("#config-message")
  });
}

function wireEvents() {
  els.rangeFilter.addEventListener("change", () => {
    state.range = els.rangeFilter.value;
    render();
  });
  els.techFilter.addEventListener("change", () => {
    state.techFilter = els.techFilter.value;
    render();
  });
  els.replacementForm.addEventListener("submit", submitReplacement);
  els.techForm.addEventListener("submit", submitTechnician);
  els.reasonForm.addEventListener("submit", submitReason);
  els.configForm.addEventListener("submit", saveConfig);
  els.clearConfig.addEventListener("click", clearConfig);
}

async function connectFromSavedConfig() {
  const config = getConfig();
  if (!config?.url || !config?.key || !window.supabase) {
    state.mode = "demo";
    state.client = null;
    updateSync("Demo data", "Save Supabase details to share live metrics.", false);
    return;
  }

  els.supabaseUrl.value = config.url;
  els.supabaseKey.value = config.key;
  state.client = window.supabase.createClient(config.url, config.key);
  state.mode = "supabase";
  updateSync("Supabase connected", "Live shared dashboard data.", true);
}

async function loadAll() {
  try {
    if (state.mode === "supabase") {
      const [techs, reasons, replacements] = await Promise.all([
        fetchTable("replacement_technicians"),
        fetchTable("replacement_reasons"),
        fetchTable("replacement_entries")
      ]);
      state.technicians = techs;
      state.reasons = reasons;
      state.replacements = replacements;
    } else {
      const stored = JSON.parse(localStorage.getItem(DEMO_KEY) || "null") || demoData;
      state.technicians = stored.technicians;
      state.reasons = stored.reasons;
      state.replacements = stored.replacements;
      saveDemo();
    }
    render();
  } catch (error) {
    state.mode = "demo";
    state.client = null;
    updateSync("Demo data", "Supabase failed to load. Check setup and policies.", false);
    showMessage(els.configMessage, error.message, true);
    await loadAll();
  }
}

async function fetchTable(tableName) {
  const { data, error } = await state.client
    .from(tableName)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

function render() {
  const filtered = filteredReplacements();
  renderSelectors();
  renderMetrics(filtered);
  renderTrend(filtered, els.trendChart, 300);
  renderReasonBars(filtered);
  renderTechCards();
  renderLists();
}

function renderSelectors() {
  const selectedTech = state.techFilter;
  els.techFilter.innerHTML = `<option value="all">All technicians</option>${state.technicians
    .map((tech) => `<option value="${escapeHtml(tech.id)}">${escapeHtml(tech.name)}</option>`)
    .join("")}`;
  els.techFilter.value = state.technicians.some((tech) => tech.id === selectedTech) ? selectedTech : "all";
  state.techFilter = els.techFilter.value;

  els.entryTech.innerHTML = optionMarkup(state.technicians, "Select technician");
  els.entryReason.innerHTML = optionMarkup(state.reasons, "Select reason");
}

function renderMetrics(records) {
  const total = records.length;
  const prior = priorPeriodRecords().length;
  const monthRecords = records.filter((record) => isSameMonth(new Date(record.replacement_date), new Date()));
  const previousMonthRecords = recordsForSelectedTech(state.replacements).filter((record) =>
    isPreviousMonth(new Date(record.replacement_date))
  );
  const topReason = topItem(records, "reason_id", state.reasons);
  const topTech = topItem(records, "technician_id", state.technicians);

  els.totalCount.textContent = total;
  els.totalNote.textContent = total === 1 ? "1 replacement in view" : `${prior} in the prior matching period`;
  els.topReason.textContent = topReason?.name || "-";
  els.topReasonNote.textContent = topReason ? `${topReason.count} logged replacements` : "Add reasons to start tracking";
  els.topTech.textContent = topTech?.name || "-";
  els.topTechNote.textContent = topTech ? `${topTech.count} logged replacements` : "No technician data yet";
  els.monthCount.textContent = monthRecords.length;
  els.monthNote.textContent = deltaText(monthRecords.length, previousMonthRecords.length);
}

function renderTrend(records, container, height = 220) {
  if (!records.length) {
    container.innerHTML = `<div class="empty-state">No replacements match this view yet.</div>`;
    return;
  }

  const points = monthlyCounts(records);
  const width = 760;
  const pad = 34;
  const max = Math.max(...points.map((point) => point.count), 1);
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? width / 2 : pad + index * step,
    y: height - pad - (point.count / max) * (height - pad * 2)
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Replacement trend chart">
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#dce3ea" />
      <polygon points="${area}" fill="rgba(25,103,210,0.12)"></polygon>
      <polyline points="${line}" fill="none" stroke="#1967d2" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${coords
        .map(
          (point) => `
            <circle cx="${point.x}" cy="${point.y}" r="5" fill="#1967d2"></circle>
            <text x="${point.x}" y="${point.y - 12}" text-anchor="middle" class="axis-label">${point.count}</text>
            <text x="${point.x}" y="${height - 10}" text-anchor="middle" class="axis-label">${point.label}</text>
          `
        )
        .join("")}
    </svg>
  `;
}

function renderReasonBars(records) {
  const counts = countsBy(records, "reason_id")
    .map((item) => ({ ...item, name: lookupName(item.id, state.reasons) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const max = Math.max(...counts.map((item) => item.count), 1);
  els.reasonBars.innerHTML = counts.length
    ? counts
        .map(
          (item) => `
            <div class="bar-row">
              <div class="bar-top"><span>${escapeHtml(item.name)}</span><span>${item.count}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${(item.count / max) * 100}%"></div></div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">Common error reasons will appear here.</div>`;
}

function renderTechCards() {
  els.techCards.innerHTML = state.technicians.length
    ? state.technicians
        .map((tech) => {
          const records = filteredByRange(state.replacements).filter((record) => record.technician_id === tech.id);
          const reasons = countsBy(records, "reason_id")
            .map((item) => ({ ...item, name: lookupName(item.id, state.reasons) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
          const chartId = `mini-${tech.id}`;
          requestAnimationFrame(() => renderTrend(records, document.querySelector(`#${CSS.escape(chartId)}`), 120));
          return `
            <article class="tech-card">
              <div class="tech-card-header">
                <div>
                  <span class="eyebrow">${records.length} replacements</span>
                  <h3>${escapeHtml(tech.name)}</h3>
                </div>
                <strong>${records.length}</strong>
              </div>
              <div class="mini-chart chart" id="${escapeHtml(chartId)}"></div>
              <div class="reason-chip-list">
                ${
                  reasons.length
                    ? reasons.map((reason) => `<span class="reason-chip">${escapeHtml(reason.name)}: ${reason.count}</span>`).join("")
                    : `<span class="reason-chip">No errors in selected range</span>`
                }
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">Add technicians to generate individual trend cards.</div>`;
}

function renderLists() {
  els.techList.innerHTML = state.technicians.map((tech) => listItem(tech, "technician")).join("");
  els.reasonList.innerHTML = state.reasons.map((reason) => listItem(reason, "reason")).join("");
  document.querySelectorAll("[data-delete-type]").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.deleteType, button.dataset.id));
  });
}

function listItem(item, type) {
  return `
    <span class="list-item">
      ${escapeHtml(item.name)}
      <button class="icon-delete" type="button" aria-label="Remove ${escapeHtml(item.name)}" data-delete-type="${type}" data-id="${escapeHtml(item.id)}">x</button>
    </span>
  `;
}

async function submitReplacement(event) {
  event.preventDefault();
  const payload = {
    technician_id: els.entryTech.value,
    reason_id: els.entryReason.value,
    order_number: els.entryOrder.value.trim() || null,
    replacement_date: els.entryDate.value,
    notes: els.entryNotes.value.trim() || null
  };
  if (!payload.technician_id || !payload.reason_id) return;

  try {
    await insertRecord("replacement_entries", payload, "replacements");
    els.replacementForm.reset();
    els.entryDate.value = new Date().toISOString().slice(0, 10);
    showMessage(els.entryMessage, "Replacement submitted.");
    render();
  } catch (error) {
    showMessage(els.entryMessage, error.message, true);
  }
}

async function submitTechnician(event) {
  event.preventDefault();
  const name = els.techName.value.trim();
  if (!name) return;
  try {
    await insertRecord("replacement_technicians", { name }, "technicians");
    els.techForm.reset();
    render();
  } catch (error) {
    alert(error.message);
  }
}

async function submitReason(event) {
  event.preventDefault();
  const name = els.reasonName.value.trim();
  if (!name) return;
  try {
    await insertRecord("replacement_reasons", { name }, "reasons");
    els.reasonForm.reset();
    render();
  } catch (error) {
    alert(error.message);
  }
}

async function insertRecord(tableName, payload, stateKey) {
  if (state.mode === "supabase") {
    const { data, error } = await state.client.from(tableName).insert(payload).select("*").single();
    if (error) throw error;
    state[stateKey].push(data);
    return;
  }
  state[stateKey].push({
    id: crypto.randomUUID(),
    ...payload,
    created_at: new Date().toISOString()
  });
  saveDemo();
}

async function deleteItem(type, id) {
  const stateKey = type === "technician" ? "technicians" : "reasons";
  const tableName = type === "technician" ? "replacement_technicians" : "replacement_reasons";
  const inUse = state.replacements.some((record) =>
    type === "technician" ? record.technician_id === id : record.reason_id === id
  );
  if (inUse) {
    alert("This item is tied to replacement history, so it cannot be deleted.");
    return;
  }

  if (state.mode === "supabase") {
    const { error } = await state.client.from(tableName).delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
  }
  state[stateKey] = state[stateKey].filter((item) => item.id !== id);
  saveDemo();
  render();
}

async function saveConfig(event) {
  event.preventDefault();
  const url = els.supabaseUrl.value.trim();
  const key = els.supabaseKey.value.trim();
  if (!url || !key) {
    showMessage(els.configMessage, "Enter both Supabase fields.", true);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key }));
  showMessage(els.configMessage, "Connection saved. Loading shared data...");
  await connectFromSavedConfig();
  await loadAll();
}

async function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
  els.supabaseUrl.value = "";
  els.supabaseKey.value = "";
  await connectFromSavedConfig();
  await loadAll();
  showMessage(els.configMessage, "Demo data is active on this browser.");
}

function filteredReplacements() {
  return recordsForSelectedTech(filteredByRange(state.replacements));
}

function recordsForSelectedTech(records) {
  return state.techFilter === "all" ? records : records.filter((record) => record.technician_id === state.techFilter);
}

function filteredByRange(records) {
  if (state.range === "all") return [...records];
  const start = new Date();
  start.setDate(start.getDate() - Number(state.range));
  return records.filter((record) => new Date(record.replacement_date) >= start);
}

function priorPeriodRecords() {
  if (state.range === "all") return [];
  const days = Number(state.range);
  const end = new Date();
  end.setDate(end.getDate() - days);
  const start = new Date();
  start.setDate(start.getDate() - days * 2);
  return state.replacements.filter((record) => {
    const date = new Date(record.replacement_date);
    return date >= start && date < end && (state.techFilter === "all" || record.technician_id === state.techFilter);
  });
}

function topItem(records, key, lookup) {
  const [top] = countsBy(records, key).sort((a, b) => b.count - a.count);
  return top ? { ...top, name: lookupName(top.id, lookup) } : null;
}

function countsBy(records, key) {
  const map = new Map();
  records.forEach((record) => map.set(record[key], (map.get(record[key]) || 0) + 1));
  return [...map.entries()].map(([id, count]) => ({ id, count }));
}

function monthlyCounts(records) {
  const map = new Map();
  records.forEach((record) => {
    const date = new Date(record.replacement_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
    map.set(key, { label, count: (map.get(key)?.count || 0) + 1 });
  });
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);
}

function lookupName(id, items) {
  return items.find((item) => item.id === id)?.name || "Unknown";
}

function optionMarkup(items, placeholder) {
  return `<option value="">${placeholder}</option>${items
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
    .join("")}`;
}

function dateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function deltaText(current, previous) {
  if (!previous && !current) return "No replacements this month";
  if (!previous) return "Up from 0 last month";
  const diff = current - previous;
  const percent = Math.round((diff / previous) * 100);
  if (diff === 0) return "Flat versus last month";
  return `${diff > 0 ? "Up" : "Down"} ${Math.abs(percent)}% versus last month`;
}

function isSameMonth(date, now) {
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isPreviousMonth(date) {
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return date.getMonth() === previous.getMonth() && date.getFullYear() === previous.getFullYear();
}

function saveDemo() {
  if (state.mode === "demo") {
    localStorage.setItem(
      DEMO_KEY,
      JSON.stringify({
        technicians: state.technicians,
        reasons: state.reasons,
        replacements: state.replacements
      })
    );
  }
}

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function updateSync(title, detail, live) {
  els.syncTitle.textContent = title;
  els.syncDetail.textContent = detail;
  els.statusDot.classList.toggle("live", live);
}

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
