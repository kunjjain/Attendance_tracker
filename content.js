// Christ University Attendance Tracker
let TARGET = 85;
let userClosed = false;

function findSubjectCards() {
  const results = [];
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    if (el.children.length > 6) continue;
    const text = el.innerText || '';
    if (/\d+(?:\.\d+)?\s+of\s+\d+(?:\.\d+)?\s+hours?\s+attended/i.test(text) && text.length < 600) {
      results.push(el);
    }
  }

  // Group by hours string, pick shortest with a course code
  const grouped = {};
  for (const el of results) {
    const m = (el.innerText || '').match(/\d+(?:\.\d+)?\s+of\s+\d+(?:\.\d+)?\s+hours?\s+attended/i);
    if (!m) continue;
    const key = m[0];
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(el);
  }

  const best = [];
  for (const group of Object.values(grouped)) {
    const withCode = group.filter(el => /[A-Z]{2,6}\d{3}/i.test(el.innerText || ''));
    const pool = withCode.length > 0 ? withCode : group;
    pool.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
    best.push(pool[0]);
  }
  return best;
}

function parseCards() {
  const cards = findSubjectCards();
  const subjects = [];

  for (const card of cards) {
    const text = card.innerText || '';

    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s+of\s+(\d+(?:\.\d+)?)\s+hours?\s+attended/i);
    if (!hoursMatch) continue;

    const attended = parseFloat(hoursMatch[1]);
    const total = parseFloat(hoursMatch[2]);

    const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const pct = pctMatch ? parseFloat(pctMatch[1]) : parseFloat(((attended / total) * 100).toFixed(1));

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let name = null;
    for (const line of lines) {
      if (/^\d+(\.\d+)?%$/.test(line)) continue;
      if (/^\d+(?:\.\d+)?\s+of\s+\d+/i.test(line)) continue;
      if (/^[A-Z]{2,6}\d{3}/.test(line) && line.length < 15) continue;
      if (line.length > 4) { name = line.substring(0, 45); break; }
    }

    if (!name) continue;
    const lowerName = name.toLowerCase();
    if (['attendence', 'attendance', 'semester', 'overall', 'present', 'absent', 'daily log', 'course overview'].includes(lowerName)) continue;
    if (!/[A-Z]{2,6}\d{3}/i.test(text)) continue;

    subjects.push({ name, attended, total, pct });
  }

  return subjects;
}

function parseOverall() {
  const allEls = Array.from(document.querySelectorAll('*'));
  for (const el of allEls) {
    if (el.children.length > 12) continue;
    const text = (el.innerText || '').trim();
    if (!text.includes('Overall Attendance')) continue;
    if (text.length > 300) continue;

    const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const hrsMatch = text.match(/(\d+(?:\.\d+)?)\s*[\/]\s*(\d+(?:\.\d+)?)\s*hrs?/i);

    if (pctMatch || hrsMatch) {
      return {
        pct: pctMatch ? parseFloat(pctMatch[1]) : null,
        present: hrsMatch ? parseFloat(hrsMatch[1]) : null,
        total: hrsMatch ? parseFloat(hrsMatch[2]) : null,
      };
    }
  }
  return null;
}

function calcStats(attended, total) {
  const current = total > 0 ? (attended / total) * 100 : 0;
  const needed = TARGET / 100;

  let classesNeeded = null;
  if (current < TARGET) {
    classesNeeded = Math.ceil((needed * total - attended) / (1 - needed));
    if (classesNeeded < 0) classesNeeded = 0;
  }

  let canSkip = null;
  if (current >= TARGET) {
    canSkip = Math.floor(attended / needed - total);
    if (canSkip < 0) canSkip = 0;
  }

  return { current: current.toFixed(1), classesNeeded, canSkip };
}


function closePanel(panel) {
  userClosed = true;
  panel.remove();
  showReopenBubble();
}

function minimizePanel(panel) {
  panel.classList.toggle('cap-minimized');
  const btn = document.getElementById('cap-minimize-btn');
  if (btn) btn.textContent = panel.classList.contains('cap-minimized') ? '▢' : '▁';
}

function showReopenBubble() {
  const existingBubble = document.getElementById('cap-reopen-bubble');
  if (existingBubble) return;
  const bubble = document.createElement('div');
  bubble.id = 'cap-reopen-bubble';
  bubble.innerHTML = '📊';
  bubble.title = 'Open Attendance Analyser';
  bubble.onclick = () => {
    userClosed = false;
    bubble.remove();
    run();
  };
  document.body.appendChild(bubble);
}

function buildPanel(subjects, overall) {
  const existing = document.getElementById('christ-att-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'christ-att-panel';

  const header = `
    <div class="cap-header">
      <span class="cap-logo">📊</span>
      <span class="cap-title">Attendance Analyser</span>
      <div class="cap-target-wrap">
        <label class="cap-target-label">Target:</label>
        <input class="cap-target-input" id="cap-target-input" type="number" min="1" max="100" value="${TARGET}" />
        <span class="cap-target-pct">%</span>
      </div>
      <button class="cap-minimize" id="cap-minimize-btn">▁</button>
      <button class="cap-close" id="cap-close-btn">✕</button>
    </div>
  `;

  let overallHTML = '';
  if (overall && overall.pct !== null) {
    const pct = overall.pct;
    const pctColor = pct >= TARGET ? '#4ade80' : pct >= TARGET - 10 ? '#facc15' : '#f87171';
    const barPct = Math.min(pct, 100);
    const { classesNeeded, canSkip } = overall.present !== null
      ? calcStats(overall.present, overall.total)
      : { classesNeeded: null, canSkip: null };

    let statusMsg = '';
    if (canSkip !== null && canSkip > 0) statusMsg = `🟢 Can bunk <strong>${canSkip}</strong> more classes overall`;
    else if (classesNeeded !== null) statusMsg = `🔴 Need <strong>${classesNeeded}</strong> more classes to reach ${TARGET}%`;
    else statusMsg = `✅ At the limit`;

    overallHTML = `
      <div class="cap-overall">
        <div class="cap-overall-top">
          <span class="cap-overall-label">Overall Attendance</span>
          <span class="cap-overall-pct" style="color:${pctColor}">${pct}%</span>
        </div>
        ${overall.present !== null ? `<div class="cap-overall-hrs">${overall.present} / ${overall.total} hrs</div>` : ''}
        <div class="cap-bar-bg" style="margin-top:8px">
          <div class="cap-bar-fill" style="width:${barPct}%;background:${pctColor}"></div>
          <div class="cap-bar-target"></div>
        </div>
        <div class="cap-overall-status">${statusMsg}</div>
      </div>
      <div class="cap-divider"></div>
    `;
  }

  if (subjects.length === 0) {
    panel.innerHTML = header + `<div class="cap-body">${overallHTML}<div class="cap-empty">No subject data found.<br><br>Make sure you're on the<br><strong>Course Overview</strong> tab.</div></div>`;
    document.body.appendChild(panel);
    document.getElementById('cap-close-btn').onclick = () => closePanel(panel);
  const minBtn = document.getElementById('cap-minimize-btn');
  if (minBtn) minBtn.onclick = () => minimizePanel(panel);
    setupTargetInput();
    return;
  }

  subjects.sort((a, b) => (a.attended / a.total) - (b.attended / b.total));

  const rows = subjects.map(s => {
    const { current, classesNeeded, canSkip } = calcStats(s.attended, s.total);
    const curPct = parseFloat(current);
    const isSafe = curPct >= TARGET;
    const isClose = !isSafe && curPct >= TARGET - 10;

    let status, statusClass;
    if (isSafe) {
      status = canSkip > 0 ? `🟢 Can bunk <strong>${canSkip}</strong> class${canSkip !== 1 ? 'es' : ''}` : `✅ At limit — attend all`;
      statusClass = 'safe';
    } else {
      status = `🔴 Need <strong>${classesNeeded}</strong> more class${classesNeeded !== 1 ? 'es' : ''}`;
      statusClass = isClose ? 'warn' : 'danger';
    }

    const barPct = Math.min(curPct, 100);
    const barColor = isSafe ? '#4ade80' : isClose ? '#facc15' : '#f87171';

    return `
      <div class="cap-row">
        <div class="cap-row-top">
          <span class="cap-name">${s.name}</span>
          <span class="cap-pct" style="color:${barColor}">${current}%</span>
        </div>
        <div class="cap-bar-bg">
          <div class="cap-bar-fill" style="width:${barPct}%;background:${barColor}"></div>
          <div class="cap-bar-target"></div>
        </div>
        <div class="cap-status ${statusClass}">${status} · ${s.attended}/${s.total} hrs</div>
      </div>
    `;
  }).join('');

  panel.innerHTML = header + `<div class="cap-body">${overallHTML}${rows}</div>`;
  document.body.appendChild(panel);
  document.getElementById('cap-close-btn').onclick = () => closePanel(panel);
  const minBtn = document.getElementById('cap-minimize-btn');
  if (minBtn) minBtn.onclick = () => minimizePanel(panel);
  setupTargetInput();
}

function setupTargetInput() {
  const input = document.getElementById('cap-target-input');
  if (!input) return;
  input.addEventListener('change', () => {
    const val = parseInt(input.value);
    if (val >= 1 && val <= 100) {
      TARGET = val;
      const subjects = parseCards();
      const overall = parseOverall();
      buildPanel(subjects, overall);
    }
  });
}

const ALLOWED = [
  "https://espro.christuniversity.in:444/main/attendence",
  "https://espro.christuniversity.in:444/main/Attendencdetails"
];

function isAllowedPage() {
  return ALLOWED.some(url => location.href.startsWith(url));
}

function run() {
  if (!isAllowedPage() || userClosed) return;
  const subjects = parseCards();
  const overall = parseOverall();
  buildPanel(subjects, overall);
}

setTimeout(run, 2500);

let debounce;
const observer = new MutationObserver(() => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    if (!document.getElementById('christ-att-panel')) run();
  }, 1500);
});
observer.observe(document.body, { childList: true, subtree: true });

// --- SPA navigation detection ---
// Re-run when the URL changes (React router navigating between pages)
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    userClosed = false; // reset so panel re-opens on new page
    // Wait for new page content to render then re-run
    setTimeout(run, 2500);
  }
}, 500);

// --- Auto-refresh every 60 seconds ---
setInterval(() => {
  // Only refresh if panel is visible and we're on the attendance page
  if (document.getElementById('christ-att-panel') && location.href.includes('attendence')) {
    run();
  }
}, 60000);
