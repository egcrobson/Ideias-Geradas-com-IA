import { getEvents } from '../lib/idb.js';
import { SEVERITY_LABEL } from '../lib/rules.js';
import { getSettings } from '../lib/settings.js';

const $ = id => document.getElementById(id);
const TYPE_LABEL = { navegacao: 'Site visitado', download: 'Download', recurso: 'Conteúdo da página', senha: 'Pedido de senha', redirecionamento: 'Redirecionamento' };
const ACTION_LABEL = { registrado: 'Registrado', bloqueado: 'Bloqueado', cancelado: 'Download cancelado' };
const SEV_ORDER = { alta: 3, media: 2, baixa: 1, limpo: 0 };
const PAGE = 200;

let all = [];
let filtered = [];
let shown = PAGE;

const fmt = ts => new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
const dayKey = ts => new Date(ts).toLocaleDateString('sv-SE');

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
  }
  for (const k of kids) if (k != null) e.append(k);
  return e;
}

function range() {
  const p = $('fPeriod').value;
  if (p === 'all') return [0, Infinity];
  if (p === 'custom') {
    const from = $('fFrom').value ? new Date($('fFrom').value + 'T00:00:00').getTime() : 0;
    const to = $('fTo').value ? new Date($('fTo').value + 'T23:59:59.999').getTime() : Infinity;
    return [from, to];
  }
  return [Date.now() - Number(p) * 86400e3, Infinity];
}

function periodText() {
  const p = $('fPeriod').value;
  const [from, to] = range();
  if (p === 'all') return 'Todo o histórico armazenado';
  const f = new Date(from || (all[0]?.ts ?? Date.now())).toLocaleDateString('pt-BR');
  const t = new Date(to === Infinity ? Date.now() : to).toLocaleDateString('pt-BR');
  return `Período: ${f} a ${t}`;
}

async function load() {
  const [from, to] = range();
  all = (await getEvents(from, to)).sort((a, b) => b.ts - a.ts);
  apply();
}

function apply() {
  const sev = $('fSev').value;
  const type = $('fType').value;
  const q = $('fSearch').value.trim().toLowerCase();
  filtered = all.filter(e => {
    if (sev === 'alerts' && e.severity === 'limpo') return false;
    if (sev === 'alta' && e.severity !== 'alta') return false;
    if (sev === 'altamedia' && !['alta', 'media'].includes(e.severity)) return false;
    if (type !== 'all' && e.type !== type) return false;
    if (q) {
      const hay = [e.url, e.host, e.filename, e.pageUrl, ...(e.reasons || []).map(r => r.text)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  shown = PAGE;
  render();
}

function render() {
  $('periodLabel').textContent = periodText();
  $('genAt').textContent = new Date().toLocaleString('pt-BR');
  renderTiles();
  renderChart();
  renderTop();
  renderReasons();
  renderTable();
}

function renderTiles() {
  const alerts = all.filter(e => e.severity !== 'limpo');
  const sites = new Set(all.filter(e => e.type === 'navegacao').map(e => e.host)).size;
  const data = [
    ['', all.filter(e => e.type === 'navegacao').length, 'páginas analisadas'],
    ['', sites, 'sites diferentes'],
    ['alta', alerts.filter(e => e.severity === 'alta').length, 'alertas de risco alto'],
    ['media', alerts.filter(e => e.severity === 'media').length, 'alertas de risco médio'],
    ['baixa', alerts.filter(e => e.severity === 'baixa').length, 'alertas de risco baixo'],
    ['alta', all.filter(e => e.action === 'bloqueado' || e.action === 'cancelado').length, 'bloqueios / cancelamentos'],
    ['', all.filter(e => e.type === 'download').length, 'downloads verificados']
  ];
  $('tiles').replaceChildren(...data.map(([c, v, l]) =>
    el('div', { class: 'tile ' + c }, el('div', { class: 'v', text: v.toLocaleString('pt-BR') }), el('div', { class: 'l', text: l }))));
}

function renderChart() {
  const alerts = filtered.filter(e => e.severity !== 'limpo');
  const [from, to] = range();
  const start = new Date(Math.max(from, alerts.length ? Math.min(...alerts.map(e => e.ts)) : Date.now() - 6 * 86400e3));
  const end = new Date(to === Infinity ? Date.now() : Math.min(to, Date.now()));
  const days = [];
  const d = new Date(start); d.setHours(12, 0, 0, 0);
  const endKey = dayKey(end.getTime());
  while (days.length < 120) {
    days.push(dayKey(d.getTime()));
    if (dayKey(d.getTime()) >= endKey) break;
    d.setDate(d.getDate() + 1);
  }
  while (days.length < 7) { const x = new Date(days[0] + 'T12:00:00'); x.setDate(x.getDate() - 1); days.unshift(dayKey(x.getTime())); }

  const counts = Object.fromEntries(days.map(k => [k, { alta: 0, media: 0, baixa: 0 }]));
  for (const e of alerts) { const k = dayKey(e.ts); if (counts[k]) counts[k][e.severity]++; }
  const max = Math.max(1, ...days.map(k => counts[k].alta + counts[k].media + counts[k].baixa));
  const W = 600, H = 190, L = 28, B = 22, T = 8;
  const bw = (W - L) / days.length;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const mk = (t, a) => { const n = document.createElementNS(ns, t); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); return n; };
  const ticks = max <= 5 ? max : 4;
  for (let i = 0; i <= ticks; i++) {
    const v = Math.round(max * i / ticks);
    const y = H - B - (H - B - T) * v / max;
    svg.append(mk('line', { x1: L, x2: W, y1: y, y2: y, class: 'grid' }));
    const tx = mk('text', { x: L - 6, y: y + 3, 'text-anchor': 'end', class: 'axis' }); tx.textContent = v; svg.append(tx);
  }
  const step = Math.ceil(days.length / 10);
  days.forEach((k, i) => {
    let y = H - B;
    for (const s of ['baixa', 'media', 'alta']) {
      const h = (H - B - T) * counts[k][s] / max;
      if (h > 0) {
        const r = mk('rect', { x: L + i * bw + bw * .15, y: y - h, width: bw * .7, height: h, fill: `var(--${s})`, rx: 2 });
        const title = mk('title', {}); title.textContent = `${k.split('-').reverse().join('/')}: ${counts[k][s]} ${SEVERITY_LABEL[s].toLowerCase()}`;
        r.append(title); svg.append(r);
        y -= h;
      }
    }
    if (i % step === 0) {
      const tx = mk('text', { x: L + i * bw + bw / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis' });
      tx.textContent = k.slice(8, 10) + '/' + k.slice(5, 7); svg.append(tx);
    }
  });
  $('chart').replaceChildren(svg);
}

function renderTop() {
  const map = new Map();
  for (const e of filtered) {
    if (e.severity === 'limpo' || !e.domain) continue;
    const m = map.get(e.domain) || { n: 0, sev: 'limpo' };
    m.n++; if (SEV_ORDER[e.severity] > SEV_ORDER[m.sev]) m.sev = e.severity;
    map.set(e.domain, m);
  }
  const top = [...map.entries()].sort((a, b) => SEV_ORDER[b[1].sev] - SEV_ORDER[a[1].sev] || b[1].n - a[1].n).slice(0, 10);
  if (!top.length) { $('topDomains').replaceChildren(el('p', { class: 'muted', text: 'Nenhum domínio com alertas.' })); return; }
  $('topDomains').replaceChildren(...top.map(([d, m]) =>
    el('li', {}, el('div', { class: 'd' }, el('span', { text: d }),
      el('span', {}, el('span', { class: 'sev ' + m.sev, text: SEVERITY_LABEL[m.sev] }), ' ', el('span', { class: 'small muted', text: m.n + 'x' }))))));
}

function reasonKey(r) {
  // Agrupa motivos pelo tipo, sem o domínio específico entre parênteses/aspas.
  return r.text.replace(/\s*\([^)]*\)\s*$/, '').replace(/"[^"]*"/g, '"…"').replace(/há (apenas )?\d+ dia\(s\)|há \d+ dias|\(\d+ dias\)/, 'recentemente');
}

function renderReasons() {
  const map = new Map();
  for (const e of filtered) {
    if (e.severity === 'limpo') continue;
    for (const r of e.reasons || []) { if (!r.pts) continue; const k = reasonKey(r); map.set(k, (map.get(k) || 0) + 1); }
  }
  const top = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = top[0]?.[1] || 1;
  if (!top.length) { $('topReasons').replaceChildren(el('p', { class: 'muted', text: 'Nenhum alerta no período.' })); return; }
  $('topReasons').replaceChildren(...top.map(([k, n]) => {
    const bar = el('div', { class: 'bar' }, el('i', { style: `width:${(n / max * 100).toFixed(1)}%` }));
    return el('div', { class: 'r' }, el('span', { text: k }), bar, el('span', { class: 'n', text: n }));
  }));
}

function renderTable() {
  const tb = $('table').querySelector('tbody');
  const rows = filtered.slice(0, window.matchMedia('print').matches ? filtered.length : shown);
  tb.replaceChildren(...rows.map(rowFor));
  $('evCount').textContent = `(${filtered.length.toLocaleString('pt-BR')})`;
  $('more').hidden = filtered.length <= shown;
  $('empty').hidden = filtered.length > 0;
  $('table').hidden = filtered.length === 0;
  highlight();
}

function rowFor(e) {
  const reasons = (e.reasons || []).filter(r => r.pts || r.code === 'confiavel');
  const ul = reasons.length ? el('ul', {}, ...reasons.map(r => el('li', { text: r.text }))) : el('span', { class: 'muted', text: 'Sem sinais de risco' });
  const addr = el('td', { class: 'addr' },
    el('div', { class: 'h', text: e.filename ? e.filename : (e.host || '') }),
    el('div', { class: 'u mono', text: e.url.length > 140 ? e.url.slice(0, 140) + '…' : e.url }));
  if (e.hops?.length > 1) addr.append(el('div', { class: 'small muted', text: 'Caminho: ' + e.hops.map(h => { try { return new URL(h).hostname; } catch { return h; } }).join(' → ') }));
  if (e.pageUrl && e.type !== 'navegacao') addr.append(el('div', { class: 'small muted', text: 'Na página: ' + e.pageUrl.slice(0, 100) }));
  const tr = el('tr', { id: 'ev-' + e.id },
    el('td', { class: 'when', text: fmt(e.ts) }),
    el('td', {}, el('span', { class: 'sev ' + e.severity, text: SEVERITY_LABEL[e.severity] }), el('div', { class: 'small muted', text: e.score + '/100' })),
    el('td', { text: TYPE_LABEL[e.type] || e.type }),
    addr,
    el('td', {}, ul),
    el('td', {}, el('span', { class: 'act ' + e.action, text: ACTION_LABEL[e.action] || e.action })));
  return tr;
}

function highlight() {
  const id = location.hash.slice(1);
  if (!id) return;
  const row = document.getElementById(id);
  if (row) { row.classList.add('hl'); row.scrollIntoView({ block: 'center' }); }
}

// ---------- exportação ----------
function download(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const stamp = () => new Date().toLocaleString('sv-SE').replace(/[: ]/g, '-').slice(0, 16);

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

$('expCsv').onclick = () => {
  // Separador ";" e BOM para abrir corretamente no Excel em português.
  const head = ['data_hora', 'risco', 'pontuacao', 'tipo', 'acao', 'dominio', 'host', 'url', 'arquivo', 'pagina_origem', 'motivos'];
  const lines = [head.join(';')];
  for (const e of filtered) {
    lines.push([fmt(e.ts), SEVERITY_LABEL[e.severity], e.score, TYPE_LABEL[e.type] || e.type, ACTION_LABEL[e.action] || e.action,
      e.domain, e.host, e.url, e.filename || '', e.pageUrl || '', (e.reasons || []).filter(r => r.pts).map(r => r.text).join(' | ')].map(csvCell).join(';'));
  }
  download(`sentinela-relatorio-${stamp()}.csv`, 'text/csv;charset=utf-8', '﻿' + lines.join('\r\n'));
};

$('expJson').onclick = () => {
  const out = {
    gerado_em: new Date().toISOString(),
    periodo: periodText(),
    filtros: { risco: $('fSev').value, tipo: $('fType').value, busca: $('fSearch').value },
    total: filtered.length,
    eventos: filtered.map(e => ({ ...e, data_hora: new Date(e.ts).toISOString() }))
  };
  download(`sentinela-relatorio-${stamp()}.json`, 'application/json', JSON.stringify(out, null, 2));
};

$('expPdf').onclick = () => {
  const prev = shown; shown = filtered.length; renderTable();
  setTimeout(() => { window.print(); shown = prev; renderTable(); }, 50);
};

$('more').onclick = () => { shown += PAGE; renderTable(); };
$('clearAll').onclick = async () => {
  const b = $('clearAll');
  if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Clique de novo para confirmar'; setTimeout(() => { b.dataset.confirm = ''; b.textContent = 'Apagar histórico'; }, 4000); return; }
  await chrome.runtime.sendMessage({ cmd: 'clearAll' });
  b.dataset.confirm = ''; b.textContent = 'Apagar histórico';
  load();
};

$('fPeriod').onchange = () => { $('customDates').hidden = $('fPeriod').value !== 'custom'; load(); };
$('fFrom').onchange = load; $('fTo').onchange = load;
$('fSev').onchange = apply; $('fType').onchange = apply;
let t; $('fSearch').oninput = () => { clearTimeout(t); t = setTimeout(apply, 200); };

if (location.hash.startsWith('#ev-')) { $('fPeriod').value = 'all'; $('fSev').value = 'all'; }
getSettings().then(s => { if (s.sbKey) $('sbNote').textContent = ', Google Safe Browsing'; });
load();
