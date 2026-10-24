export const DEFAULT_SETTINGS = {
  paused: false,
  block: true,              // bloqueia sites presentes nas listas de ameaças
  blockHeuristic: false,    // bloqueia também suspeita "alta" detectada só por heurística
  cancelDownloads: true,    // cancela downloads vindos de endereços listados
  notifyLevel: 'alta',      // 'alta' | 'media' | 'nenhuma'
  logClean: true,           // registra também visitas sem problemas (para o relatório)
  rdapMode: 'suspeitos',    // idade do domínio: 'desligado' | 'suspeitos' | 'todos'
  sbKey: '',                // chave opcional da Google Safe Browsing API
  abuseKey: '',             // Auth-Key gratuita da abuse.ch (para a lista URLhaus)
  retentionDays: 30,
  allowlist: []
};

export async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

export async function saveSettings(patch) {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}
