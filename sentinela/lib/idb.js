// Armazenamento local dos eventos em IndexedDB (compartilhado entre o
// service worker e as páginas da extensão). Nada sai do navegador.
const DB_NAME = 'sentinela';
const DB_VERSION = 1;
let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('events')) {
          const s = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
          s.createIndex('ts', 'ts');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction('events', mode);
    const store = t.objectStore('events');
    let result;
    Promise.resolve(fn(store, v => { result = v; })).catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export function addEvent(ev) {
  return tx('readwrite', (store, set) => {
    const r = store.add(ev);
    r.onsuccess = () => set(r.result);
  });
}

export function updateEvent(id, patch) {
  return tx('readwrite', (store) => {
    const r = store.get(id);
    r.onsuccess = () => { if (r.result) store.put({ ...r.result, ...patch }); };
  });
}

export function getEvents(sinceTs = 0, untilTs = Infinity) {
  return tx('readonly', (store, set) => {
    const range = untilTs === Infinity
      ? IDBKeyRange.lowerBound(sinceTs)
      : IDBKeyRange.bound(sinceTs, untilTs);
    const r = store.index('ts').getAll(range);
    r.onsuccess = () => set(r.result);
  });
}

export function purgeBefore(ts) {
  return tx('readwrite', (store) => {
    const r = store.index('ts').openCursor(IDBKeyRange.upperBound(ts, true));
    r.onsuccess = () => {
      const c = r.result;
      if (c) { c.delete(); c.continue(); }
    };
  });
}

export function clearEvents() {
  return tx('readwrite', (store) => { store.clear(); });
}
