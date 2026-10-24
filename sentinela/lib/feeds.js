// Listas públicas de ameaças: baixadas periodicamente e consultadas localmente
// (os endereços que você visita NÃO são enviados a esses serviços).
import { normalizeForMatch, splitDomain, SHARED_HOSTS, isOfficialHost } from './rules.js';

export const FEEDS = [
  {
    id: 'urlhaus', name: 'URLhaus (abuse.ch)', kind: 'urls', label: 'malware', needsKey: 'abuseKey',
    url: key => `https://urlhaus-api.abuse.ch/v2/files/exports/${encodeURIComponent(key)}/online.csv`, hostPts: 40
  },
  {
    id: 'openphish', name: 'OpenPhish', kind: 'urls', label: 'phishing',
    url: 'https://openphish.com/feed.txt', hostPts: 50
  },
  {
    id: 'phishingarmy', name: 'Phishing Army', kind: 'domains', label: 'phishing',
    url: 'https://phishing.army/download/phishing_army_blocklist.txt', hostPts: 90
  }
];

const urlIndex = new Map();   // url normalizada -> id da lista
const hostIndex = new Map();  // host -> id da lista
let loaded = false;

function shared(host) {
  if (isOfficialHost(host)) return true;
  for (const s of SHARED_HOSTS) if (host === s || host.endsWith('.' + s)) return true;
  return false;
}

export function parseFeed(feed, text) {
  const urls = [];
  const hosts = new Set();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    if (feed.kind === 'domains') {
      const h = line.replace(/^\*\./, '').replace(/^0\.0\.0\.0\s+|^127\.0\.0\.1\s+/, '').split(/\s+/)[0].toLowerCase();
      if (h && h.includes('.') && !shared(h)) hosts.add(h);
    } else {
      // Aceita texto puro (uma URL por linha) ou CSV (URL em uma das colunas).
      const m = line.match(/https?:\/\/[^\s",]+/i);
      if (!m) continue;
      const n = normalizeForMatch(m[0]);
      if (!n) continue;
      urls.push(n);
      try {
        const h = new URL(m[0]).hostname.toLowerCase();
        if (!shared(h)) hosts.add(h);
      } catch { /* ignora linha inválida */ }
    }
  }
  return { urls, hosts: [...hosts] };
}

function indexFeed(feed, data) {
  for (const u of data.urls || []) if (!urlIndex.has(u)) urlIndex.set(u, feed.id);
  for (const h of data.hosts || []) if (!hostIndex.has(h)) hostIndex.set(h, feed.id);
}

export async function loadFeeds() {
  urlIndex.clear(); hostIndex.clear();
  const keys = FEEDS.map(f => 'feed_' + f.id);
  const stored = await chrome.storage.local.get(keys);
  for (const f of FEEDS) {
    const data = stored['feed_' + f.id];
    if (data) indexFeed(f, data);
  }
  loaded = true;
}

async function fetchText(url, ms = 45000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

export async function updateFeeds() {
  const { feedsMeta = {}, settings = {} } = await chrome.storage.local.get(['feedsMeta', 'settings']);
  for (const f of FEEDS) {
    let url = f.url;
    if (f.needsKey) {
      const key = (settings[f.needsKey] || '').trim();
      if (!key) {
        feedsMeta[f.id] = { ...(feedsMeta[f.id] || {}), error: null, needsKey: true };
        continue;
      }
      url = f.url(key);
    }
    try {
      const text = await fetchText(url);
      if (text.startsWith('PK')) throw new Error('arquivo compactado inesperado');
      const data = parseFeed(f, text);
      if (data.urls.length + data.hosts.length === 0) throw new Error('lista vazia');
      await chrome.storage.local.set({ ['feed_' + f.id]: data });
      feedsMeta[f.id] = { updated: Date.now(), count: data.urls.length || data.hosts.length, error: null };
    } catch (e) {
      let msg = String(e.message || e);
      if (/HTTP (401|403)/.test(msg)) msg = 'chave recusada — confira a Auth-Key';
      feedsMeta[f.id] = { ...(feedsMeta[f.id] || {}), needsKey: false, lastError: Date.now(), error: msg };
    }
  }
  await chrome.storage.local.set({ feedsMeta });
  await loadFeeds();
  return feedsMeta;
}

export function feedsLoaded() { return loaded; }

const feedById = id => FEEDS.find(f => f.id === id);

// Retorna motivos (pontuados) se a URL ou o domínio estiverem em alguma lista.
export function feedLookup(urlStr) {
  const reasons = [];
  const n = normalizeForMatch(urlStr);
  if (!n) return reasons;
  const exact = urlIndex.get(n);
  if (exact) {
    const f = feedById(exact);
    reasons.push({ code: 'lista-url', pts: 100, text: `Endereço listado como ${f.label} em ${f.name}` });
    return reasons;
  }
  let host;
  try { host = new URL(urlStr).hostname.toLowerCase(); } catch { return reasons; }
  const d = splitDomain(host);
  // Verifica o host e os domínios-pai até o domínio registrável.
  const parts = host.split('.');
  const minLen = d.domain.split('.').length;
  for (let i = 0; parts.length - i >= minLen; i++) {
    const cand = parts.slice(i).join('.');
    const id = hostIndex.get(cand);
    if (id) {
      const f = feedById(id);
      const pts = d.ip ? Math.max(f.hostPts, 80) : f.hostPts;
      const text = f.kind === 'domains'
        ? `Domínio listado como ${f.label} em ${f.name}`
        : `Domínio hospeda endereços de ${f.label} listados em ${f.name}`;
      reasons.push({ code: 'lista-dominio', pts, text });
      break;
    }
  }
  return reasons;
}

export function feedStats() {
  return { urls: urlIndex.size, hosts: hostIndex.size };
}
