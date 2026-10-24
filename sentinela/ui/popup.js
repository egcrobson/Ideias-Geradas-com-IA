import { getEvents } from '../lib/idb.js';
import { SEVERITY_LABEL } from '../lib/rules.js';
import { getSettings, saveSettings } from '../lib/settings.js';

const $ = id => document.getElementById(id);
const send = msg => chrome.runtime.sendMessage(msg);

function sevBadge(sev) {
  const s = document.createElement('span');
  s.className = 'sev ' + sev;
  s.textContent = SEVERITY_LABEL[sev] || sev;
  return s;
}

function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return m + ' min';
  const h = Math.round(m / 60);
  return h + ' h';
}

async function init() {
  const st = await send({ cmd: 'status' });
  $('active').checked = !st.settings.paused;
  const metas = Object.values(st.feedsMeta || {});
  const last = Math.max(0, ...metas.map(m => m.updated || 0));
  $('feedInfo').textContent = last
    ? `${(st.feedStats.urls + st.feedStats.hosts).toLocaleString('pt-BR')} ameaças conhecidas · listas de ${new Date(last).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
    : 'Baixando listas de ameaças…';
  if (st.settings.paused) $('feedInfo').textContent = 'Monitoramento pausado';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && /^https?:/.test(tab.url)) {
    const r = await send({ cmd: 'analyze', url: tab.url });
    if (r?.ok) {
      $('curHost').textContent = r.host;
      $('curSev').replaceChildren(sevBadge(r.severity));
      $('curMeter').style.width = Math.max(3, r.score) + '%';
      $('curMeter').style.background = `var(--${r.severity === 'limpo' ? 'accent' : r.severity})`;
      const ul = $('curReasons');
      const list = r.reasons.length ? r.reasons : [{ text: r.local ? 'Endereço da rede local' : 'Nenhum sinal de risco encontrado' }];
      for (const x of list) { const li = document.createElement('li'); li.textContent = x.text; ul.append(li); }
      if (!r.allowed && !r.official && !r.local) {
        $('trustRow').hidden = false;
        $('trustBtn').onclick = async () => {
          const s = await getSettings();
          const allow = [...new Set([...s.allowlist, r.domain])];
          await saveSettings({ allowlist: allow });
          $('trustBtn').textContent = 'Adicionado ✓'; $('trustBtn').disabled = true;
        };
      }
    }
  } else {
    $('curHost').textContent = 'Página interna do navegador';
    $('curReasons').innerHTML = '';
  }

  const evs = await getEvents(Date.now() - 86400e3);
  const nav = evs.filter(e => e.type === 'navegacao').length;
  const statsToday = st.stats?.[new Date().toLocaleDateString('sv-SE')];
  $('cAlta').textContent = evs.filter(e => e.severity === 'alta').length;
  $('cMedia').textContent = evs.filter(e => e.severity === 'media').length;
  $('cTotal').textContent = Math.max(nav, statsToday?.analisadas || 0);

  const alerts = evs.filter(e => e.severity === 'alta' || e.severity === 'media').sort((a, b) => b.ts - a.ts).slice(0, 5);
  if (alerts.length) {
    $('recentSec').hidden = false;
    for (const e of alerts) {
      const li = document.createElement('li');
      li.className = 'small';
      const h = document.createElement('span'); h.className = 'h'; h.textContent = (e.filename ? e.filename + ' · ' : '') + (e.host || e.url);
      h.title = e.reasons?.[0]?.text || '';
      const t = document.createElement('span'); t.className = 'muted'; t.textContent = timeAgo(e.ts);
      li.append(sevBadge(e.severity), h, t);
      li.style.cursor = 'pointer';
      li.onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('pages/report.html#ev-' + e.id) });
      $('recent').append(li);
    }
  }
}

$('active').onchange = async e => {
  await saveSettings({ paused: !e.target.checked });
  location.reload();
};
$('openReport').onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('pages/report.html') });
$('openOptions').onclick = () => chrome.runtime.openOptionsPage();

init().catch(e => { $('feedInfo').textContent = 'Erro: ' + e.message; });
