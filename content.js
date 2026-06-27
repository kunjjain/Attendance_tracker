// Christ University Attendance Tracker
const TARGET = 85;

function findSubjectCards() {
  const results = [];
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    if (el.children.length > 6) continue;
    const text = el.innerText || '';
    if (/\d+\s+of\s+\d+\s+hours?\s+attended/i.test(text) && text.length < 600) {
      results.push(el);
    }
  }

  // Group by hours string (e.g. "7 of 10 hours attended"), pick shortest with a course code
  const grouped = {};
  for (const el of results) {
    const m = (el.innerText || '').match(/\d+\s+of\s+\d+\s+hours?\s+attended/i);
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

    const hoursMatch = text.match(/(\d+)\s+of\s+(\d+)\s+hours?\s+attended/i);
    if (!hoursMatch) continue;

    const attended = parseInt(hoursMatch[1]);
    const total = parseInt(hoursMatch[2]);

    const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    const pct = pctMatch ? parseFloat(pctMatch[1]) : parseFloat(((attended / total) * 100).toFixed(1));

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let name = null;
    for (const line of lines) {
      if (/^\d+(\.\d+)?%$/.test(line)) continue;
      if (/^\d+\s+of\s+\d+/i.test(line)) continue;
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
    const hrsMatch = text.match(/(\d+)\s*[\/]\s*(\d+)\s*hrs?/i);

    if (pctMatch || hrsMatch) {
      return {
        pct: pctMatch ? parseFloat(pctMatch[1]) : null,
        present: hrsMatch ? parseInt(hrsMatch[1]) : null,
        total: hrsMatch ? parseInt(hrsMatch[2]) : null,
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

function buildPanel(subjects, overall) {
  const existing = document.getElementById('christ-att-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'christ-att-panel';

  const header = `
    <div class="cap-header">
      <span class="cap-logo">📊</span>
      <span class="cap-title">Attendance Analyser</span>
      <span class="cap-target">Target: ${TARGET}%</span>
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
    document.getElementById('cap-close-btn').onclick = () => panel.remove();
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
  document.getElementById('cap-close-btn').onclick = () => panel.remove();
}

function run() {
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
