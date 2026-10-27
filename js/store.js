/* Lưu preset của người dùng trong IndexedDB (dự phòng localStorage) */
(function () {
  'use strict';
  const S = (window.S = window.S || {});
  const LS = 'studio-presets-v1';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no idb'));
      const r = indexedDB.open('studio-cua-khang', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('presets', { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = (mode, fn) => db().then(d => new Promise((res, rej) => {
    const t = d.transaction('presets', mode); const st = t.objectStore('presets');
    const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error);
  }));
  const lsGet = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { return []; } };
  const lsSet = a => { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (e) { /* đầy bộ nhớ */ } };
  S.store = {
    async all() {
      try { const r = await tx('readonly', st => st.getAll()); return (r || []).sort((a, b) => (a.created || 0) - (b.created || 0)); }
      catch (e) { return lsGet(); }
    },
    async put(p) {
      const o = JSON.parse(JSON.stringify({ ...p, lutData: undefined }));
      if (p.lutData) o.lutData = Array.from(p.lutData, v => Math.round(v * 10000) / 10000);
      try { await tx('readwrite', st => st.put(o)); }
      catch (e) { const a = lsGet().filter(x => x.id !== o.id); a.push(o); lsSet(a); }
    },
    async del(id) {
      try { await tx('readwrite', st => st.delete(id)); }
      catch (e) { lsSet(lsGet().filter(x => x.id !== id)); }
    }
  };
})();
