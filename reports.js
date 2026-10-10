// Citizen photo reports: photo + auto location -> Supabase -> auto-escalation to authorities.
// Loaded AFTER the main inline script, so it can use the app's `map`, `esc` and `showToast`.
(() => {
  const C = window.CIVIC_CONFIG || {};
  if (!window.supabase || !C.url || C.url.startsWith('PASTE')) { console.warn('Reports disabled: fill in config.js'); return; }
  const sb = supabase.createClient(C.url, C.key);
  const RADIUS = C.radiusM || 30, NEED = C.threshold || 3;
  const CATS = { pothole:['🕳️','Pothole / damaged road'], open_drain:['💧','Open or blocked drain'], broken_barricade:['🚧','Broken barricade'], unsafe_work:['⚠️','Unsafe work site'], other:['📍','Other'] };
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  let deviceId; try { deviceId = localStorage.getItem('civic_device') || uid(); localStorage.setItem('civic_device', deviceId); } catch { deviceId = uid(); }

  const layer = L.layerGroup().addTo(map);
  const q = id => document.getElementById(id);

  // --- UI: button next to the hamburger, plus the report modal ---
  const fab = document.createElement('button');
  fab.className = 'absolute left-14 top-0 h-[44px] bg-red-600 text-white font-bold text-sm px-3 rounded-md shadow-lg';
  fab.textContent = '📷 Report';
  q('topBarFilter').appendChild(fab);

  const modal = document.createElement('div');
  modal.className = 'hidden absolute inset-0 bg-black/60 z-[9999] flex justify-center items-center p-4';
  modal.innerHTML = `<div class="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 max-h-full overflow-y-auto">
    <h2 class="text-lg font-bold text-gray-800 mb-2">📷 Report a problem here</h2>
    <label class="block text-xs font-bold text-gray-600 mb-1">Photo</label>
    <input id="rpPhoto" type="file" accept="image/*" capture="environment" class="w-full text-sm mb-2">
    <img id="rpPreview" class="hidden w-full h-40 object-cover rounded mb-2" alt="Preview">
    <select id="rpCat" aria-label="Problem type" class="w-full border border-gray-300 rounded p-2.5 mb-2 text-sm">
      ${Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v[0]} ${v[1]}</option>`).join('')}
    </select>
    <textarea id="rpNote" rows="2" maxlength="300" placeholder="Optional note" class="w-full border border-gray-300 rounded p-2 mb-2 text-sm resize-none"></textarea>
    <div id="rpLoc" class="text-xs text-gray-600 mb-1"></div>
    <button id="rpMapCentre" class="text-xs text-blue-600 underline mb-2">Use map centre instead (pan the map first)</button>
    <div id="rpMsg" class="text-xs text-red-600 mb-2 min-h-[1rem]"></div>
    <button id="rpSend" class="w-full bg-red-600 text-white font-bold py-3 rounded">Submit report</button>
    <button id="rpCancel" class="w-full mt-2 text-gray-500 text-sm font-bold py-3">Cancel</button></div>`;
  document.querySelector('main').appendChild(modal);

  let pos = null, file = null;
  const msg = t => { q('rpMsg').textContent = t || ''; };

  function locate() {
    pos = null; q('rpLoc').textContent = '📍 Finding your location…';
    if (!navigator.geolocation) { q('rpLoc').textContent = '📍 GPS not available. Use the map centre option.'; return; }
    navigator.geolocation.getCurrentPosition(
      p => { pos = { lat: p.coords.latitude, lng: p.coords.longitude }; q('rpLoc').textContent = `📍 Location locked (±${Math.round(p.coords.accuracy)} m)`; },
      () => { q('rpLoc').textContent = '📍 Could not get GPS (needs HTTPS and permission). Use the map centre option.'; },
      { enableHighAccuracy: true, timeout: 10000 });
  }
  function openReport(preset) {
    file = null; q('rpPhoto').value = ''; q('rpPreview').classList.add('hidden'); q('rpNote').value = ''; msg();
    modal.classList.remove('hidden');
    if (preset) { pos = { lat: preset.lat, lng: preset.lng }; q('rpCat').value = preset.cat; q('rpLoc').textContent = '📍 Adding to this reported spot'; }
    else locate();
  }
  fab.onclick = () => openReport();
  q('rpCancel').onclick = () => modal.classList.add('hidden');
  q('rpMapCentre').onclick = () => { const c = map.getCenter(); pos = { lat: c.lat, lng: c.lng }; q('rpLoc').textContent = `📍 Using map centre (${c.lat.toFixed(5)}, ${c.lng.toFixed(5)})`; };
  q('rpPhoto').onchange = e => {
    file = e.target.files[0] || null;
    if (file) { q('rpPreview').src = URL.createObjectURL(file); q('rpPreview').classList.remove('hidden'); }
  };

  // Shrink photos on the phone before upload (max 1280px, JPEG)
  const compress = f => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(b => b ? res(b) : rej(new Error('Could not process photo')), 'image/jpeg', 0.7);
    };
    img.onerror = () => rej(new Error('That file is not a readable image'));
    img.src = URL.createObjectURL(f);
  });

  q('rpSend').onclick = async () => {
    if (!file) return msg('Please take or choose a photo.');
    if (!pos) return msg('We need your location. Allow GPS or use the map centre.');
    const btn = q('rpSend'); btn.disabled = true; btn.textContent = 'Uploading…'; msg();
    try {
      const blob = await compress(file);
      const path = `${deviceId}/${Date.now()}.jpg`;
      const up = await sb.storage.from('report-photos').upload(path, blob, { contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      const url = sb.storage.from('report-photos').getPublicUrl(path).data.publicUrl;
      const ins = await sb.from('reports').insert({ lat: pos.lat, lng: pos.lng, category: q('rpCat').value, note: q('rpNote').value.trim() || null, photo_url: url, device_id: deviceId });
      if (ins.error) throw ins.error;
      modal.classList.add('hidden');
      const data = await load();
      const near = data && data.clusters.find(c => c.category === q('rpCat').value && map.distance([c.lat, c.lng], [pos.lat, pos.lng]) <= RADIUS);
      if (near && near.esc) showToast(`🚨 Threshold reached! Escalated to ${near.esc.dept}.`);
      else showToast(`✅ Report added. ${near ? near.devs : 1} of ${NEED} residents have reported this spot.`);
      map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 17));
    } catch (e) { console.error(e); msg('Upload failed: ' + (e.message || 'check your connection and try again.')); }
    btn.disabled = false; btn.textContent = 'Submit report';
  };

  // --- Load reports, group nearby ones, draw on the map ---
  async function load() {
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const [r, e] = await Promise.all([
      sb.from('reports').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(500),
      sb.from('escalations').select('*').neq('status', 'resolved')]);
    if (r.error || e.error) { console.error(r.error || e.error); return null; }
    layer.clearLayers();
    const clusters = [];
    r.data.forEach(x => {
      const c = clusters.find(k => k.category === x.category && map.distance([k.lat, k.lng], [x.lat, x.lng]) <= RADIUS);
      if (c) c.items.push(x); else clusters.push({ category: x.category, lat: x.lat, lng: x.lng, items: [x] });
    });
    clusters.forEach(c => {
      c.devs = new Set(c.items.map(i => i.device_id)).size;
      c.esc = e.data.find(z => z.category === c.category && map.distance([z.lat, z.lng], [c.lat, c.lng]) <= RADIUS);
      const [emoji, label] = CATS[c.category] || CATS.other;
      const colour = c.esc ? 'bg-red-600' : 'bg-amber-500';
      const icon = L.divIcon({ className: '', iconSize: [40, 40], iconAnchor: [20, 20],
        html: `<div class="relative w-10 h-10"><div class="${colour} text-white rounded-full shadow-md flex items-center justify-center border-2 border-white w-10 h-10 text-lg">${emoji}</div><div class="absolute -top-1 -right-2 bg-white text-gray-800 text-[10px] font-bold rounded-full px-1.5 border border-gray-300">${c.esc ? '🚨' : c.devs + '/' + NEED}</div></div>` });
      const pics = c.items.slice(0, 3).map(i => `<img src="${esc(i.photo_url)}" loading="lazy" class="w-16 h-16 object-cover rounded" alt="Report photo">`).join('');
      const notes = c.items.filter(i => i.note).slice(0, 2).map(i => `<div class="text-xs text-gray-600 italic">"${esc(i.note)}"</div>`).join('');
      L.marker([c.lat, c.lng], { icon, zIndexOffset: 500 }).addTo(layer).bindPopup(`<div>
        <b>${emoji} ${esc(label)}</b>
        <div class="text-xs mt-1">${c.devs} of ${NEED} residents reported this spot</div>
        ${c.esc ? `<div class="text-xs mt-1 bg-red-50 border border-red-200 rounded p-1.5"><b class="text-red-700">🚨 Escalated to ${esc(c.esc.dept)}</b><br>Status: ${esc(c.esc.status)}</div>` : `<div class="text-xs mt-1 text-gray-500">Needs ${NEED - c.devs} more resident(s) to escalate</div>`}
        <div class="flex gap-1 mt-2">${pics}</div>${notes}</div>`);
    });
    return { clusters, escalations: e.data };
  }
  load(); setInterval(load, 30000);
})();
