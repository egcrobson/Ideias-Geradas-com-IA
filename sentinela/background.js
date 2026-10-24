// Sentinela — service worker principal.
import { analyzeUrl, analyzeFilename, registrableDomain, sumScore, severityOf, SEVERITY_LABEL, splitDomain } from './lib/rules.js';
import { loadFeeds, updateFeeds, feedLookup, feedStats } from './lib/feeds.js';
import { addEvent, getEvents, purgeBefore, clearEvents } from './lib/idb.js';
import { DEFAULT_SETTINGS, getSettings } from './lib/settings.js';

let settings = { ...DEFAULT_SETTINGS };
const ready = (async () => {
  settings = await getSettings();
  await loadFeeds();
})();

const chains = new Map();         // tabId -> { requestId, hops: [] }
const recentBlocks = new Map();   // tabId -> url bloqueada
const lastNotify = new Map();     // host -> ts
const seenResource = new Map();   // tabId|host -> ts
const seenPassword = new Map();   // host -> ts
const sbCache = new Map();        // url -> { ts, threat }

const isWeb = url => /^https?:\/\//i.test(url || '');
const now = () => Date.now();

// ---------- ciclo de vida ----------
function ensureAlarms() {
  chrome.alarms.get('feeds', a => { if (!a) chrome.alarms.create('feeds', { periodInMinutes: 360 }); });
  chrome.alarms.get('purge', a => { if (!a) chrome.alarms.create('purge', { periodInMinutes: 720 }); });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await ready;
  ensureAlarms();
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('pages/options.html?bemvindo=1') });
  }
  updateFeeds().catch(console.error);
  refreshBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await ready;
  ensureAlarms();
  refreshBadge();
  const { feedsMeta = {} } = await chrome.storage.local.get('feedsMeta');
  const oldest = Math.min(...Object.values(feedsMeta).map(m => m.updated || 0), Infinity);
  if (!isFinite(oldest) || now() - oldest > 6 * 3600e3) updateFeeds().catch(console.error);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  await ready;
  if (alarm.name === 'feeds') updateFeeds().catch(console.error);
  if (alarm.name === 'purge') {
    await purgeBefore(now() - settings.retentionDays * 86400e3);
    const { stats = {} } = await chrome.storage.local.get('stats');
    const cutoff = new Date(now() - settings.retentionDays * 86400e3).toISOString().slice(0, 10);
    for (const k of Object.keys(stats)) if (k < cutoff) delete stats[k];
    await chrome.storage.local.set({ stats });
    refreshBadge();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    settings = { ...DEFAULT_SETTINGS, ...(changes.settings.newValue || {}) };
    refreshBadge();
  }
});

// ---------- utilidades ----------
async function isAllowed(host) {
  if (settings.allowlist.some(a => host === a || host.endsWith('.' + a))) return true;
  const { allowOnce = [] } = await chrome.storage.session.get('allowOnce');
  return allowOnce.includes(host);
}

async function bumpStats(field) {
  const day = new Date().toLocaleDateString('sv-SE');
  const { stats = {} } = await chrome.storage.local.get('stats');
  stats[day] = stats[day] || { analisadas: 0, downloads: 0 };
  stats[day][field] = (stats[day][field] || 0) + 1;
  await chrome.storage.local.set({ stats });
}

async function fetchJson(url, opts = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

const THREAT_PT = {
  MALWARE: 'malware',
  SOCIAL_ENGINEERING: 'phishing / engenharia social',
  UNWANTED_SOFTWARE: 'software indesejado',
  POTENTIALLY_HARMFUL_APPLICATION: 'aplicativo potencialmente nocivo'
};

export async function safeBrowsing(url, key) {
  const c = sbCache.get(url);
  if (c && now() - c.ts < 30 * 60e3) return c.threat;
  const body = {
    client: { clientId: 'sentinela-pessoal', clientVersion: chrome.runtime.getManifest().version },
    threatInfo: {
      threatTypes: Object.keys(THREAT_PT),
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }]
    }
  };
  const j = await fetchJson(
    'https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' + encodeURIComponent(key),
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const threat = j.matches?.[0]?.threatType || null;
  sbCache.set(url, { ts: now(), threat });
  if (sbCache.size > 2000) sbCache.delete(sbCache.keys().next().value);
  return threat;
}

async function domainAgeDays(domain) {
  const { rdap = {} } = await chrome.storage.local.get('rdap');
  const c = rdap[domain];
  if (c && now() - c.ts < 7 * 86400e3) return c.days;
  let days = null;
  try {
    const j = await fetchJson('https://rdap.org/domain/' + encodeURIComponent(domain),
      { headers: { Accept: 'application/rdap+json' } }, 7000);
    const reg = (j.events || []).find(e => e.eventAction === 'registration');
    if (reg?.eventDate) days = Math.floor((now() - Date.parse(reg.eventDate)) / 86400e3);
  } catch { /* sem dados: ignora */ }
  rdap[domain] = { ts: now(), days };
  const keys = Object.keys(rdap);
  if (keys.length > 800) keys.sort((a, b) => rdap[a].ts - rdap[b].ts).slice(0, 200).forEach(k => delete rdap[k]);
  await chrome.storage.local.set({ rdap });
  return days;
}

// Análise completa de uma URL: heurísticas + listas + Safe Browsing + idade do domínio.
async function fullAnalysis(url, { hops = [], skipRemote = false } = {}) {
  const a = analyzeUrl(url);
  if (!a.ok) return null;
  if (a.local) return { ...a, reasons: [], score: 0, severity: 'limpo' };
  if (await isAllowed(a.host)) {
    return { ...a, reasons: [{ code: 'confiavel', pts: 0, text: 'Domínio na sua lista de confiança' }], score: 0, severity: 'limpo', allowed: true };
  }
  const reasons = [...a.reasons, ...feedLookup(url)];

  if (hops.length >= 3) {
    const domains = new Set(hops.map(h => { try { return registrableDomain(new URL(h).hostname); } catch { return h; } }));
    if (domains.size >= 3) {
      reasons.push({ code: 'redirecionamentos', pts: 15, text: `Passou por ${hops.length - 1} redirecionamentos entre ${domains.size} domínios` });
    }
  }
  for (const h of hops.slice(0, -1)) {
    const hit = feedLookup(h)[0];
    if (hit) {
      let host = h; try { host = new URL(h).hostname; } catch { }
      reasons.push({ ...hit, code: 'redir-lista', pts: Math.min(hit.pts, 60), text: `Chegou aqui redirecionado por ${host}: ${hit.text}` });
      break;
    }
  }

  if (!skipRemote && settings.sbKey) {
    try {
      const threat = await safeBrowsing(url, settings.sbKey);
      if (threat) reasons.push({ code: 'safebrowsing', pts: 100, text: `Google Safe Browsing: ${THREAT_PT[threat] || threat}` });
    } catch { /* falha de rede ou chave inválida */ }
  }

  const pre = sumScore(reasons);
  const wantAge = settings.rdapMode === 'todos' || (settings.rdapMode === 'suspeitos' && pre >= 10);
  if (!skipRemote && wantAge && !a.official && !a.ip && !a.platform) {
    const days = await domainAgeDays(a.domain);
    if (days !== null && days >= 0) {
      if (days <= 7) reasons.push({ code: 'dominio-novo', pts: 45, text: `Domínio registrado há apenas ${days} dia(s)` });
      else if (days <= 30) reasons.push({ code: 'dominio-novo', pts: 30, text: `Domínio registrado há ${days} dias` });
      else if (days <= 90) reasons.push({ code: 'dominio-recente', pts: 10, text: `Domínio relativamente novo (${days} dias)` });
    }
  }

  const score = sumScore(reasons);
  return { ...a, reasons: reasons.sort((x, y) => y.pts - x.pts), score, severity: severityOf(score) };
}

// ---------- registro, badge e notificações ----------
async function record(ev) {
  const full = { ts: now(), action: 'registrado', ...ev };
  if (full.severity === 'limpo' && !settings.logClean && full.type !== 'download') return null;
  const id = await addEvent(full);
  full.id = id;
  if (full.severity !== 'limpo') {
    refreshBadge();
    maybeNotify(full);
  }
  return full;
}

async function refreshBadge() {
  try {
    if (settings.paused) {
      await chrome.action.setBadgeText({ text: 'off' });
      await chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
      return;
    }
    const evs = await getEvents(now() - 86400e3);
    const alta = evs.filter(e => e.severity === 'alta').length;
    const media = evs.filter(e => e.severity === 'media').length;
    const n = alta + media;
    await chrome.action.setBadgeText({ text: n ? String(n > 99 ? '99+' : n) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: alta ? '#dc2626' : '#d97706' });
  } catch (e) { console.warn(e); }
}

function maybeNotify(ev) {
  const lvl = settings.notifyLevel;
  if (lvl === 'nenhuma') return;
  if (lvl === 'alta' && ev.severity !== 'alta') return;
  if (lvl === 'media' && !['alta', 'media'].includes(ev.severity)) return;
  const key = ev.host || ev.url;
  if (now() - (lastNotify.get(key) || 0) < 5 * 60e3) return;
  lastNotify.set(key, now());
  const verb = ev.action === 'bloqueado' ? 'Bloqueado' : ev.action === 'cancelado' ? 'Download cancelado' : 'Atividade suspeita';
  chrome.notifications.create('ev-' + ev.id, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `Sentinela: ${verb} (risco ${SEVERITY_LABEL[ev.severity].toLowerCase()})`,
    message: `${ev.host || ''}\n${ev.reasons?.[0]?.text || ''}`.trim(),
    priority: ev.severity === 'alta' ? 2 : 1
  });
}

chrome.notifications.onClicked.addListener((nid) => {
  const id = nid.startsWith('ev-') ? nid.slice(3) : '';
  chrome.tabs.create({ url: chrome.runtime.getURL('pages/report.html' + (id ? '#ev-' + id : '')) });
  chrome.notifications.clear(nid);
});

function blockTab(tabId, url, reasons) {
  recentBlocks.set(tabId, url);
  const page = chrome.runtime.getURL('pages/warning.html') + '?u=' + encodeURIComponent(url) +
    '&r=' + encodeURIComponent(JSON.stringify(reasons.slice(0, 6).map(r => r.text)));
  chrome.tabs.update(tabId, { url: page }).catch(() => { });
}

// ---------- navegação ----------
chrome.webNavigation.onBeforeNavigate.addListener(async (d) => {
  if (d.frameId !== 0 || !isWeb(d.url)) return;
  await ready;
  if (settings.paused || !settings.block) return;
  await checkAndBlockEarly(d.tabId, d.url, 'navegacao');
});

async function checkAndBlockEarly(tabId, url, type) {
  const a = analyzeUrl(url);
  if (!a.ok || a.local || await isAllowed(a.host)) return false;
  const hits = feedLookup(url);
  if (!hits.some(h => h.pts >= 80)) return false;
  const reasons = [...hits, ...a.reasons];
  const score = sumScore(reasons);
  blockTab(tabId, url, reasons);
  await record({ type, url, host: a.host, domain: a.domain, tabId, score, severity: severityOf(score), reasons, action: 'bloqueado' });
  return true;
}

chrome.webRequest.onBeforeRequest.addListener((d) => {
  if (d.tabId < 0) return;
  if (d.type === 'main_frame') {
    const c = chains.get(d.tabId);
    if (!c || c.requestId !== d.requestId) chains.set(d.tabId, { requestId: d.requestId, hops: [d.url] });
    return;
  }
  checkResource(d);
}, { urls: ['<all_urls>'] });

chrome.webRequest.onBeforeRedirect.addListener(async (d) => {
  if (d.type !== 'main_frame' || d.tabId < 0) return;
  const c = chains.get(d.tabId);
  if (c && c.requestId === d.requestId) c.hops.push(d.redirectUrl);
  await ready;
  if (!settings.paused && settings.block && isWeb(d.redirectUrl)) {
    await checkAndBlockEarly(d.tabId, d.redirectUrl, 'redirecionamento');
  }
}, { urls: ['<all_urls>'] });

async function checkResource(d) {
  if (!isWeb(d.url)) return;
  await ready;
  if (settings.paused) return;
  const hits = feedLookup(d.url);
  if (!hits.length || hits[0].pts < 40) return;
  let host; try { host = new URL(d.url).hostname; } catch { return; }
  if (await isAllowed(host)) return;
  const key = d.tabId + '|' + host;
  if (now() - (seenResource.get(key) || 0) < 10 * 60e3) return;
  seenResource.set(key, now());
  const tipos = { script: 'script', sub_frame: 'quadro incorporado (iframe)', xmlhttprequest: 'requisição em segundo plano', image: 'imagem', stylesheet: 'folha de estilo', media: 'mídia', websocket: 'websocket', object: 'objeto/plugin' };
  const reasons = hits.map(h => ({ ...h, text: `A página carregou um(a) ${tipos[d.type] || d.type} de endereço perigoso — ${h.text}` }));
  const score = sumScore(reasons);
  await record({
    type: 'recurso', url: d.url, host, domain: registrableDomain(host), tabId: d.tabId,
    pageUrl: d.documentUrl || d.initiator || '', score, severity: severityOf(score), reasons
  });
}

chrome.webNavigation.onCommitted.addListener(async (d) => {
  if (d.frameId !== 0 || !isWeb(d.url)) return;
  await ready;
  if (settings.paused) return;
  if (recentBlocks.get(d.tabId) === d.url) { recentBlocks.delete(d.tabId); return; }

  const c = chains.get(d.tabId);
  const hops = c && c.hops.length > 1 ? c.hops : [];
  chains.delete(d.tabId);

  const res = await fullAnalysis(d.url, { hops });
  if (!res) return;
  await bumpStats('analisadas');

  let action = 'registrado';
  const strong = res.reasons.some(r => r.code === 'safebrowsing' || r.pts >= 80);
  if (!res.allowed && settings.block && (strong || (settings.blockHeuristic && res.severity === 'alta'))) {
    blockTab(d.tabId, d.url, res.reasons);
    action = 'bloqueado';
  }
  await record({
    type: 'navegacao', url: d.url, host: res.host, domain: res.domain, tabId: d.tabId,
    transition: d.transitionType, hops: hops.length > 1 ? hops : undefined,
    score: res.score, severity: res.severity, reasons: res.reasons, action
  });
});

chrome.tabs.onRemoved.addListener((tabId) => { chains.delete(tabId); recentBlocks.delete(tabId); });

// ---------- downloads ----------
chrome.downloads.onChanged.addListener(async (delta) => {
  await ready;
  if (settings.paused) return;
  if (delta.filename?.current) {
    const [item] = await chrome.downloads.search({ id: delta.id });
    if (item) analyzeDownload(item);
  }
  const danger = delta.danger?.current;
  if (danger && ['file', 'url', 'content', 'uncommon', 'host', 'unwanted', 'accountCompromise'].includes(danger)) {
    const [item] = await chrome.downloads.search({ id: delta.id });
    const src = item?.finalUrl || item?.url || '';
    let host = ''; try { host = new URL(src).hostname; } catch { }
    const reasons = [{ code: 'chrome-perigo', pts: 60, text: `O próprio navegador marcou o download como perigoso (${danger})` }];
    await record({ type: 'download', url: src, host, domain: host ? registrableDomain(host) : '', filename: item?.filename?.split(/[\\/]/).pop(), score: 60, severity: 'media', reasons });
  }
});

async function analyzeDownload(item) {
  await bumpStats('downloads');
  const src = item.finalUrl || item.url || '';
  const fileReasons = analyzeFilename(item.filename);
  let reasons = [...fileReasons];
  let host = '', domain = '';
  const viaPage = !isWeb(src);
  const target = viaPage ? (item.referrer || '') : src;
  if (isWeb(target)) {
    const res = await fullAnalysis(target, { skipRemote: false });
    if (res) {
      host = res.host; domain = res.domain;
      if (res.allowed) reasons = [];
      else reasons.push(...res.reasons.map(r => viaPage ? { ...r, text: `Página de origem: ${r.text}` } : r));
    }
  }
  const score = sumScore(reasons);
  const severity = severityOf(score);
  let action = 'registrado';
  const fromList = reasons.some(r => ['lista-url', 'lista-dominio', 'safebrowsing'].includes(r.code));
  if (settings.cancelDownloads && fromList && item.state === 'in_progress') {
    try { await chrome.downloads.cancel(item.id); action = 'cancelado'; } catch { }
  }
  await record({
    type: 'download', url: src.startsWith('data:') ? 'data:(conteúdo gerado pela página)' : src,
    pageUrl: item.referrer || '', host, domain, filename: item.filename.split(/[\\/]/).pop(),
    fileSize: item.fileSize > 0 ? item.fileSize : item.totalBytes, mime: item.mime,
    score, severity, reasons, action
  });
}

// ---------- mensagens (páginas da extensão e content script) ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender).then(sendResponse, e => sendResponse({ error: String(e.message || e) }));
  return true;
});

async function handle(msg, sender) {
  await ready;
  switch (msg.cmd) {
    case 'status': {
      const { feedsMeta = {}, stats = {} } = await chrome.storage.local.get(['feedsMeta', 'stats']);
      return { settings, feedsMeta, feedStats: feedStats(), stats };
    }
    case 'analyze': {
      return await fullAnalysis(msg.url) || { ok: false };
    }
    case 'updateFeeds': {
      const meta = await updateFeeds();
      return { feedsMeta: meta, feedStats: feedStats() };
    }
    case 'allowOnce': {
      let host; try { host = new URL(msg.url).hostname; } catch { return { ok: false }; }
      const { allowOnce = [] } = await chrome.storage.session.get('allowOnce');
      if (!allowOnce.includes(host)) allowOnce.push(host);
      await chrome.storage.session.set({ allowOnce });
      return { ok: true };
    }
    case 'clearAll': {
      await clearEvents();
      await chrome.storage.local.set({ stats: {} });
      refreshBadge();
      return { ok: true };
    }
    case 'refreshBadge': { refreshBadge(); return { ok: true }; }
    case 'testSafeBrowsing': {
      sbCache.clear();
      const t = await safeBrowsing('http://malware.testing.google.test/testing/malware/', msg.key);
      return { ok: !!t, threat: t };
    }
    case 'passwordField': return await onPasswordField(msg, sender);
    default: return { error: 'comando desconhecido' };
  }
}

async function onPasswordField(msg, sender) {
  if (settings.paused || !sender.tab) return { ok: true };
  const url = sender.tab.url || msg.url;
  const a = analyzeUrl(url);
  if (!a.ok || a.local || a.official || await isAllowed(a.host)) return { ok: true };
  const today = new Date().toDateString();
  if (seenPassword.get(a.host) === today) return { ok: true };

  const reasons = [];
  const domainReasons = a.reasons.filter(r => r.code !== 'http');
  const domainScore = sumScore(domainReasons) + sumScore(feedLookup(url));
  if (url.startsWith('http:')) reasons.push({ code: 'senha-http', pts: 35, text: 'Página pede senha sem criptografia (HTTP) — a senha pode ser interceptada' });
  if (domainScore >= 20) reasons.push({ code: 'senha-suspeito', pts: 25, text: 'Página pede senha em um domínio com sinais de golpe' });
  if (msg.formAction && isWeb(msg.formAction)) {
    try {
      const fa = new URL(msg.formAction);
      if (fa.protocol === 'http:' && url.startsWith('https:')) reasons.push({ code: 'senha-form-http', pts: 25, text: 'O formulário envia a senha sem criptografia' });
      const fd = registrableDomain(fa.hostname);
      if (fd !== a.domain && !splitDomain(fa.hostname).ip) reasons.push({ code: 'senha-outro-dominio', pts: 15, text: `O formulário envia a senha para outro domínio (${fd})` });
    } catch { }
  }
  if (sumScore(reasons) < 20) return { ok: true };
  seenPassword.set(a.host, today);
  const all = [...reasons, ...a.reasons];
  const score = sumScore(all);
  await record({ type: 'senha', url, host: a.host, domain: a.domain, tabId: sender.tab.id, score, severity: severityOf(score), reasons: all.sort((x, y) => y.pts - x.pts) });
  return { ok: true };
}
