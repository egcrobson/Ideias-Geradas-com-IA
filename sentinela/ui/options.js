import { getSettings, saveSettings } from '../lib/settings.js';
import { FEEDS } from '../lib/feeds.js';
import { SEVERITY_LABEL } from '../lib/rules.js';

const $ = id => document.getElementById(id);
const send = msg => chrome.runtime.sendMessage(msg);

if (new URLSearchParams(location.search).get('bemvindo')) $('welcome').hidden = false;

const toggles = ['block', 'blockHeuristic', 'cancelDownloads', 'logClean'];
const selects = ['notifyLevel', 'rdapMode', 'retentionDays'];

async function init() {
  const s = await getSettings();
  for (const k of toggles) {
    $(k).checked = !!s[k];
    $(k).onchange = () => saveSettings({ [k]: $(k).checked });
  }
  for (const k of selects) {
    $(k).value = String(s[k]);
    $(k).onchange = () => saveSettings({ [k]: k === 'retentionDays' ? Number($(k).value) : $(k).value });
  }
  $('sbKey').value = s.sbKey || '';
  $('abuseKey').value = s.abuseKey || '';
  if (s.sbKey) $('sbStatus').textContent = 'Chave configurada.';
  renderAllow(s.allowlist);
  renderFeeds();
}

async function renderFeeds() {
  const st = await send({ cmd: 'status' });
  const meta = st.feedsMeta || {};
  $('feedRows').replaceChildren(...FEEDS.map(f => {
    const m = meta[f.id] || {};
    const tr = document.createElement('tr');
    const when = m.updated ? new Date(m.updated).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'ainda não';
    const err = m.error ? ` (último erro: ${m.error})` : '';
    const status = (m.needsKey && !m.updated) ? 'precisa da chave da abuse.ch (abaixo)' : when + err;
    for (const t of [f.name, m.count ? m.count.toLocaleString('pt-BR') : '—', status]) {
      const td = document.createElement('td'); td.textContent = t; tr.append(td);
    }
    return tr;
  }));
}

function renderAllow(list) {
  $('allowChips').replaceChildren(...list.map(d => {
    const c = document.createElement('span'); c.className = 'chip'; c.textContent = d;
    const x = document.createElement('button'); x.textContent = '×'; x.title = 'Remover';
    x.onclick = async () => { const s = await getSettings(); const n = s.allowlist.filter(v => v !== d); await saveSettings({ allowlist: n }); renderAllow(n); };
    c.append(x); return c;
  }));
  if (!list.length) $('allowChips').innerHTML = '<span class="small muted">Nenhum domínio.</span>';
}

$('allowAdd').onclick = async () => {
  let v = $('allowInput').value.trim().toLowerCase();
  if (!v) return;
  try { if (v.includes('/')) v = new URL(v.includes('://') ? v : 'https://' + v).hostname; } catch { return; }
  v = v.replace(/^www\./, '');
  const s = await getSettings();
  const n = [...new Set([...s.allowlist, v])];
  await saveSettings({ allowlist: n });
  $('allowInput').value = '';
  renderAllow(n);
};

$('sbTest').onclick = async () => {
  const key = $('sbKey').value.trim();
  await saveSettings({ sbKey: key });
  if (!key) { $('sbStatus').textContent = 'Chave removida.'; $('sbStatus').className = 'small'; return; }
  $('sbStatus').textContent = 'Testando…'; $('sbStatus').className = 'small';
  const r = await send({ cmd: 'testSafeBrowsing', key });
  if (r.ok) { $('sbStatus').textContent = '✓ Chave funcionando — o Safe Browsing reconheceu o endereço de teste.'; $('sbStatus').className = 'small ok'; }
  else { $('sbStatus').textContent = '✗ Não funcionou: ' + (r.error || 'resposta inesperada') + '. Confira se a Safe Browsing API está ativada no projeto.'; $('sbStatus').className = 'small err'; }
};

$('abuseSave').onclick = async () => {
  await saveSettings({ abuseKey: $('abuseKey').value.trim() });
  $('updateFeeds').click();
};

$('updateFeeds').onclick = async () => {
  $('updateFeeds').disabled = true; $('feedStatus').textContent = 'Baixando…';
  try { await send({ cmd: 'updateFeeds' }); $('feedStatus').textContent = 'Atualizado.'; }
  catch (e) { $('feedStatus').textContent = 'Erro: ' + e.message; }
  $('updateFeeds').disabled = false;
  renderFeeds();
};

$('testBtn').onclick = async () => {
  let u = $('testUrl').value.trim();
  if (!u) return;
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  $('testResult').textContent = 'Analisando…';
  const r = await send({ cmd: 'analyze', url: u });
  if (!r?.ok) { $('testResult').textContent = 'Endereço inválido.'; return; }
  const box = document.createElement('div');
  const sev = document.createElement('span'); sev.className = 'sev ' + r.severity; sev.textContent = SEVERITY_LABEL[r.severity];
  const h = document.createElement('b'); h.textContent = ' ' + r.host + ' ';
  const sc = document.createElement('span'); sc.className = 'muted small'; sc.textContent = `pontuação ${r.score}/100`;
  box.append(sev, h, sc);
  const ul = document.createElement('ul'); ul.className = 'small';
  for (const x of (r.reasons.length ? r.reasons : [{ text: 'Nenhum sinal de risco encontrado' }])) { const li = document.createElement('li'); li.textContent = x.text; ul.append(li); }
  box.append(ul);
  $('testResult').replaceChildren(box);
};
$('testUrl').onkeydown = e => { if (e.key === 'Enter') $('testBtn').click(); };

init();
