// Heurísticas locais de análise de URLs e downloads.
// Módulo puro (sem APIs do Chrome) para poder ser testado fora do navegador.

export const MULTI_SUFFIXES = new Set([
  'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'art.br', 'blog.br', 'eco.br', 'app.br',
  'dev.br', 'log.br', 'ind.br', 'inf.br', 'tv.br', 'mil.br', 'jus.br', 'leg.br', 'mp.br', 'adv.br',
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'net.au', 'org.au', 'co.jp', 'com.ar', 'com.mx',
  'com.pt', 'co.za', 'com.co', 'com.pe', 'com.cn', 'com.tr', 'co.in', 'co.nz', 'com.sg', 'com.hk',
  'com.uy', 'com.py', 'com.bo', 'com.ve', 'com.ec', 'co.kr', 'com.tw'
]);

// Plataformas onde cada subdomínio pertence a um dono diferente (muito usadas em phishing).
export const HOSTING_PLATFORMS = new Set([
  'blogspot.com', 'github.io', 'netlify.app', 'vercel.app', 'web.app', 'firebaseapp.com', 'pages.dev',
  'workers.dev', 'glitch.me', 'weebly.com', 'wixsite.com', '000webhostapp.com', 'herokuapp.com',
  'ngrok-free.app', 'ngrok.io', 'ngrok.app', 'repl.co', 'replit.app', 'square.site', 'godaddysites.com',
  'webflow.io', 'framer.app', 'framer.website', 'carrd.co', 'surge.sh', 'onrender.com', 'fly.dev',
  'azurewebsites.net', 'appspot.com', 'r2.dev', 'myshopify.com', 'wordpress.com', 'tumblr.com',
  'strikingly.com', 'mystrikingly.com', 'jimdosite.com', 'yolasite.com', 'site123.me', 'gitbook.io',
  'notion.site', 'glide.page', 'bubbleapps.io', 'duckdns.org', 'no-ip.org', 'ddns.net', 'hopto.org',
  'zapto.org', 'serveo.net', 'trycloudflare.com', 'loca.lt', 'pythonanywhere.com', 'mybluehost.me',
  'zyrosite.com', 'hostingersite.com', 'wixstudio.io', 'typedream.app', 'webcindario.com'
]);

export const SUSPICIOUS_TLDS = new Set([
  'zip', 'mov', 'top', 'xyz', 'tk', 'ml', 'ga', 'cf', 'gq', 'click', 'link', 'country', 'kim', 'work',
  'rest', 'fit', 'cyou', 'icu', 'buzz', 'sbs', 'cfd', 'monster', 'quest', 'lol', 'bond', 'beauty',
  'hair', 'skin', 'makeup', 'autos', 'boats', 'yachts', 'mom', 'loan', 'win', 'bid', 'date', 'download',
  'racing', 'review', 'stream', 'accountant', 'cricket', 'science', 'party', 'faith', 'men', 'gdn',
  'su', 'pw', 'cam', 'online', 'site'
]);

// Marca -> domínios oficiais (domínio registrável).
export const BRANDS = {
  google: ['google.com', 'google.com.br', 'youtube.com', 'gmail.com', 'googleusercontent.com', 'gstatic.com', 'googleapis.com', 'withgoogle.com', 'blogspot.com', 'googleblog.com', 'g.co', 'goo.gl'],
  gmail: ['gmail.com', 'google.com'],
  youtube: ['youtube.com', 'youtu.be', 'ytimg.com', 'google.com'],
  facebook: ['facebook.com', 'fb.com', 'fbcdn.net', 'facebook.net', 'meta.com', 'fb.me'],
  instagram: ['instagram.com', 'cdninstagram.com', 'facebook.com'],
  whatsapp: ['whatsapp.com', 'whatsapp.net', 'wa.me'],
  microsoft: ['microsoft.com', 'live.com', 'office.com', 'microsoftonline.com', 'outlook.com', 'bing.com', 'msn.com', 'azure.com', 'windows.com', 'sharepoint.com', 'office365.com', 'skype.com', 'xbox.com', 'microsoft365.com', 'msft.net', 'msauth.net'],
  outlook: ['outlook.com', 'live.com', 'office.com', 'microsoft.com', 'office365.com'],
  hotmail: ['hotmail.com', 'live.com', 'outlook.com', 'microsoft.com'],
  office365: ['office365.com', 'office.com', 'microsoft.com', 'microsoftonline.com'],
  apple: ['apple.com', 'icloud.com', 'apple.news', 'mzstatic.com', 'apple-cloudkit.com'],
  icloud: ['icloud.com', 'apple.com'],
  amazon: ['amazon.com', 'amazon.com.br', 'amazonaws.com', 'primevideo.com', 'media-amazon.com', 'ssl-images-amazon.com', 'amazon.dev', 'a2z.com', 'amzn.to'],
  netflix: ['netflix.com', 'nflxvideo.net', 'nflximg.net', 'nflxext.com', 'nflxso.net'],
  paypal: ['paypal.com', 'paypalobjects.com', 'paypal.me'],
  mercadolivre: ['mercadolivre.com.br', 'mercadolibre.com', 'mercadopago.com.br', 'mercadopago.com', 'mlstatic.com'],
  mercadopago: ['mercadopago.com.br', 'mercadopago.com', 'mercadolivre.com.br', 'mercadolibre.com'],
  nubank: ['nubank.com.br', 'nu.com.br', 'nubank.com'],
  itau: ['itau.com.br', 'itau.com', 'itaupersonnalite.com.br', 'itau-unibanco.com.br'],
  bradesco: ['bradesco.com.br', 'bradescoseguros.com.br', 'bradescocartoes.com.br', 'next.me'],
  santander: ['santander.com.br', 'santander.com'],
  caixa: ['caixa.gov.br', 'caixa.com.br'],
  caixaeconomica: ['caixa.gov.br'],
  caixatem: ['caixa.gov.br'],
  bancodobrasil: ['bb.com.br'],
  picpay: ['picpay.com', 'picpay.com.br'],
  serasa: ['serasa.com.br', 'serasaexperian.com.br', 'serasa.com'],
  correios: ['correios.com.br'],
  receitafederal: ['gov.br'],
  magazineluiza: ['magazineluiza.com.br', 'magalu.com', 'magalu.com.br'],
  magalu: ['magazineluiza.com.br', 'magalu.com', 'magalu.com.br'],
  americanas: ['americanas.com.br', 'americanas.com'],
  shopee: ['shopee.com.br', 'shopee.com', 'susercontent.com'],
  linkedin: ['linkedin.com', 'licdn.com', 'lnkd.in'],
  binance: ['binance.com'],
  steamcommunity: ['steamcommunity.com', 'steampowered.com'],
  steampowered: ['steampowered.com', 'steamcommunity.com'],
  discord: ['discord.com', 'discord.gg', 'discordapp.com', 'discordapp.net', 'discord.media'],
  twitter: ['twitter.com', 'x.com', 'twimg.com', 't.co'],
  tiktok: ['tiktok.com', 'tiktokcdn.com', 'tiktokv.com'],
  dropbox: ['dropbox.com', 'dropboxusercontent.com', 'db.tt'],
  docusign: ['docusign.com', 'docusign.net'],
  coinbase: ['coinbase.com'],
  roblox: ['roblox.com', 'rbxcdn.com']
};

// Marcas que também são palavras comuns: não acusar só por aparecerem como palavra.
const NO_TOKEN = new Set(['caixa', 'apple', 'office365']);
// Marcas curtas/comuns demais para checar "parecido com" (evita falso positivo).
const NO_TYPO = new Set(['caixa', 'apple', 'itau', 'magalu', 'gmail']);
// Marcas globais que usam o mesmo nome em domínios de vários países (google.de, amazon.fr...).
const GLOBAL_BRANDS = new Set(['google', 'amazon', 'apple', 'microsoft', 'facebook', 'netflix', 'paypal', 'youtube', 'santander', 'shopee', 'tiktok', 'linkedin', 'binance', 'mercadopago']);

export const OFFICIAL = new Set(Object.values(BRANDS).flat());

// Domínios grandes e compartilhados: listas de malware citam URLs específicas neles,
// mas o domínio inteiro não é malicioso.
export const SHARED_HOSTS = new Set([
  'github.com', 'githubusercontent.com', 'raw.githubusercontent.com', 'gitlab.com', 'bitbucket.org',
  'google.com', 'docs.google.com', 'drive.google.com', 'storage.googleapis.com', 'firebasestorage.googleapis.com',
  'dropbox.com', 'dl.dropboxusercontent.com', 'onedrive.live.com', '1drv.ms', 'sharepoint.com',
  'discord.com', 'cdn.discordapp.com', 'media.discordapp.net', 'mediafire.com', 'pastebin.com',
  'archive.org', 'amazonaws.com', 's3.amazonaws.com', 'cloudfront.net', 'transfer.sh', 'anonfiles.com',
  'sendspace.com', 'wetransfer.com', 'mega.nz', 'telegra.ph', 't.me', 'bit.ly', 'tinyurl.com',
  'jsdelivr.net', 'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', 'r2.dev', 'pages.dev',
  'workers.dev', 'blogspot.com', 'wordpress.com', 'weebly.com', 'wixsite.com', 'netlify.app', 'vercel.app'
]);

const KEYWORDS = [
  'login', 'signin', 'logon', 'verify', 'verificacao', 'verificar', 'validacao', 'validar', 'atualizar',
  'atualizacao', 'recadastro', 'recadastramento', 'seguranca', 'security', 'secure', 'conta', 'account',
  'desbloqueio', 'desbloquear', 'token', 'senha', 'password', 'premio', 'resgate', 'resgatar', 'pix',
  'bonus', 'gratis', 'suporte', 'auth', 'acesso', 'confirmar', 'confirmacao', 'regularizar',
  'pendencia', 'multa', 'fatura', 'boleto', 'rastreio', 'rastreamento', 'taxa', 'cashback', 'sorteio',
  'wallet', 'airdrop', 'giveaway', 'unlock', 'recovery', 'restore'
];

export const DANGEROUS_EXT = new Set([
  'exe', 'scr', 'msi', 'bat', 'cmd', 'com', 'pif', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'hta', 'ps1',
  'jar', 'apk', 'lnk', 'iso', 'img', 'reg', 'cpl', 'dll', 'msix', 'appx', 'appinstaller', 'xll', 'dmg',
  'pkg', 'vhd', 'vhdx', 'msc', 'chm', 'url', 'library-ms', 'xlam', 'docm', 'xlsm', 'pptm'
]);

const LURE_EXT = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|txt|mp4|mp3|zip|rar|csv|html?)\.([a-z0-9]{2,6})$/i;

export function isIp(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[') || host.includes(':');
}

export function isLocal(host) {
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
    host.endsWith('.lan') || host.endsWith('.internal') || host === '[::1]' ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host);
}

export function splitDomain(rawHost) {
  const host = rawHost.toLowerCase().replace(/\.$/, '');
  if (isIp(host)) return { host, domain: host, label: host, tld: '', sub: '', platform: null, ip: true };
  const parts = host.split('.');
  let suffixLen = 1;
  if (parts.length >= 3 && MULTI_SUFFIXES.has(parts.slice(-2).join('.'))) suffixLen = 2;
  let platform = null;
  for (let n = 3; n >= 2; n--) {
    if (parts.length > n) {
      const cand = parts.slice(-n).join('.');
      if (HOSTING_PLATFORMS.has(cand)) { platform = cand; suffixLen = n; break; }
    }
  }
  if (parts.length <= suffixLen) {
    return { host, domain: host, label: parts[0], tld: parts.slice(1).join('.'), sub: '', platform: null, ip: false };
  }
  const domain = parts.slice(-(suffixLen + 1)).join('.');
  const label = parts[parts.length - suffixLen - 1];
  const tld = parts[parts.length - 1];
  const sub = parts.slice(0, parts.length - suffixLen - 1).join('.');
  return { host, domain, label, tld, sub, platform, ip: false };
}

export function registrableDomain(host) {
  return splitDomain(host).domain;
}

export function hostMatches(host, list) {
  return list.some(d => host === d || host.endsWith('.' + d));
}

export function isOfficialHost(host) {
  for (const o of OFFICIAL) if (host === o || host.endsWith('.' + o)) return true;
  return false;
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Gera versões "desconfundidas" (0→o, 1→l ou i, rn→m, vv→w...) para pegar imitações visuais.
export function deconfuse(s) {
  const base = s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's')
    .replace(/7/g, 't').replace(/\$/g, 's').replace(/vv/g, 'w');
  const out = new Set([
    base.replace(/[1|!]/g, 'l'),
    base.replace(/[1|!]/g, 'i'),
    base.replace(/[1|!]/g, 'l').replace(/rn/g, 'm'),
    base.replace(/[1|!]/g, 'i').replace(/rn/g, 'm')
  ]);
  for (const v of [...out]) out.add(v.replace(/-/g, ''));
  return [...out];
}

function typoThreshold(brand) {
  if (brand.length >= 9) return 2;
  if (brand.length >= 5) return 1;
  return 0;
}

export function sumScore(reasons) {
  return Math.min(100, reasons.reduce((s, r) => s + (r.pts || 0), 0));
}

export function severityOf(score) {
  if (score >= 70) return 'alta';
  if (score >= 40) return 'media';
  if (score >= 20) return 'baixa';
  return 'limpo';
}

export const SEVERITY_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa', limpo: 'Limpo' };

export function analyzeUrl(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch { return { ok: false }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false };
  const d = splitDomain(u.hostname);
  const official = !d.ip && isOfficialHost(d.host);
  const base = { ok: true, url: u.href, host: d.host, domain: d.domain, platform: d.platform, ip: d.ip, official, reasons: [] };
  if (isLocal(d.host)) return { ...base, local: true };

  const reasons = base.reasons;
  const add = (code, pts, text) => reasons.push({ code, pts, text });

  if (u.protocol === 'http:') add('http', 10, 'Conexão sem criptografia (HTTP)');
  if (d.ip) add('ip', 30, 'Site acessado por endereço IP em vez de nome de domínio');
  if (u.username || u.password) add('userinfo', 40, 'Endereço contém "@" — truque para disfarçar o site real');
  if (u.port && u.port !== '80' && u.port !== '443') add('porta', 10, `Porta de rede incomum (${u.port})`);
  if (d.host.includes('xn--')) add('punycode', 25, 'Domínio com caracteres internacionais (pode imitar letras de outro site)');
  if (!d.ip && !d.platform && SUSPICIOUS_TLDS.has(d.tld)) add('tld', 15, `Extensão de domínio muito usada em golpes (.${d.tld})`);
  if (d.platform) add('hospedagem', 10, `Hospedado em plataforma gratuita/compartilhada (${d.platform})`);
  if (d.sub && d.sub.split('.').length >= 4) add('subdominios', 10, 'Muitos subdomínios encadeados');
  if (d.host.length >= 60) add('longo', 10, 'Nome de domínio anormalmente longo');
  if (!d.ip && !d.label.startsWith('xn--') && (d.label.match(/-/g) || []).length >= 3) add('hifens', 10, 'Domínio com muitos hífens');

  let brandHit = false;
  if (!d.ip && !official) {
    const tokens = d.host.split(/[.\-_]/).filter(Boolean);
    const candidates = deconfuse(d.label);
    for (const [brand, domains] of Object.entries(BRANDS)) {
      if (hostMatches(d.host, domains)) continue;
      if (d.label === brand || d.label.replace(/-/g, '') === brand) {
        const ccTld = /^[a-z]{2}$/.test(d.tld) && !d.platform;
        if (GLOBAL_BRANDS.has(brand) && ccTld && d.label === brand) continue;
        add('marca-dominio', 45, `Usa o nome "${brand}" em um domínio que não é o oficial (${d.domain})`);
        brandHit = true; break;
      }
      if (candidates.includes(brand) || (!NO_TOKEN.has(brand) && d.label !== d.label.replace(/[0-9$|!]/g, '') &&
          candidates.some(c => c.split('-').includes(brand)))) {
        add('imitacao', 70, `Domínio imita "${brand}" trocando letras por números/símbolos (${d.domain})`);
        brandHit = true; break;
      }
      const t = typoThreshold(brand);
      if (t && !NO_TYPO.has(brand)) {
        const close = candidates.some(c => {
          const dist = levenshtein(c, brand);
          return dist > 0 && dist <= t && Math.abs(c.length - brand.length) <= t;
        });
        if (close) {
          add('typosquat', 55, `Domínio muito parecido com "${brand}" (${d.domain}) — possível erro de digitação explorado`);
          brandHit = true; break;
        }
      }
      if (!NO_TOKEN.has(brand) && tokens.includes(brand)) {
        add('marca-sub', 35, `Cita a marca "${brand}" mas não pertence a ela (${d.domain})`);
        brandHit = true; break;
      }
    }

    const tokensHost = d.host.split(/[.\-_]/);
    const kw = KEYWORDS.find(k => tokensHost.includes(k) || (d.label.includes(k) && k.length >= 6));
    if (kw) add('palavras', brandHit ? 20 : 10, `Domínio usa termo típico de golpe ("${kw}")`);
  }

  return base;
}

export function analyzeFilename(filename) {
  const reasons = [];
  if (!filename) return reasons;
  const name = filename.split(/[\\/]/).pop();
  if (/[‮‭‎‏]/.test(name)) {
    reasons.push({ code: 'rtl', pts: 60, text: 'Nome do arquivo usa caractere invisível para disfarçar a extensão' });
  }
  const ext = (name.match(/\.([a-z0-9-]+)$/i) || [])[1]?.toLowerCase();
  const lure = name.match(LURE_EXT);
  if (lure && DANGEROUS_EXT.has(lure[2].toLowerCase())) {
    reasons.push({ code: 'dupla-ext', pts: 45, text: `Extensão dupla disfarçada (.${lure[1]}.${lure[2]})` });
  } else if (ext && DANGEROUS_EXT.has(ext)) {
    reasons.push({ code: 'executavel', pts: 25, text: `Arquivo executável ou script (.${ext})` });
  }
  return reasons;
}

export function normalizeForMatch(urlStr) {
  try {
    const u = new URL(urlStr.trim());
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    if (path === '/') path = '';
    return `${u.hostname.toLowerCase()}${path}${u.search}`;
  } catch {
    return null;
  }
}
