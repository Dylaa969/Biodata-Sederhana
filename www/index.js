
const DB_NAME = 'biodataDB';
const DB_VER  = 1;
const STORE   = 'biodata';
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE)) {
        const store = d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('nis',  'nis',  { unique: false });
        store.createIndex('nama', 'nama', { unique: false });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror   = e => reject(e.target.error);
  });
}

function dbGetAll() {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
function dbAdd(data) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
function dbPut(data) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
function dbDelete(id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}


let allData  = [];
let editId   = null;
let deleteId = null;

const fields = [
  'nama','nis','nisn','ttl_tempat','ttl_tgl',
  'jk','agama','goldar','hp','email','alamat',
  'kelas','jurusan','tahun',
  'ayah','ibu','kerja_ayah','hp_ortu','alamat_ortu'
];


async function renderList() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allData.filter(d =>
    (d.nama   ||'').toLowerCase().includes(q) ||
    (d.nis    ||'').toLowerCase().includes(q) ||
    (d.kelas  ||'').toLowerCase().includes(q) ||
    (d.jurusan||'').toLowerCase().includes(q)
  );

  document.getElementById('totalSiswa').textContent = allData.length;
  document.getElementById('totalLaki').textContent  = allData.filter(d => d.jk === 'Laki-laki').length;
  document.getElementById('totalPerem').textContent = allData.filter(d => d.jk === 'Perempuan').length;

  const el = document.getElementById('list-view');
  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">📭</div>
      <p>${q ? 'Data tidak ditemukan.' : 'Belum ada data.<br>Tekan <b>+ Tambah</b> untuk mulai.'}</p></div>`;
    return;
  }

  el.innerHTML = filtered.map(d => {
    const inisial = (d.nama || '?')[0].toUpperCase();
    const ttl = d.ttl_tempat && d.ttl_tgl
      ? `${d.ttl_tempat}, ${formatDate(d.ttl_tgl)}`
      : (d.ttl_tempat || d.ttl_tgl || '-');
    return `
      <div class="card">
        <div class="card-top">
          <div class="avatar">${inisial}</div>
          <div>
            <div class="card-name">${d.nama || '-'}</div>
            <div class="card-nis">NIS: ${d.nis || '-'}</div>
          </div>
          <div class="badge">${d.kelas || '-'} ${d.jurusan || ''}</div>
        </div>
        <div class="card-grid">
          <div class="card-item">TTL<span>${ttl}</span></div>
          <div class="card-item">Kelamin<span>${d.jk || '-'}</span></div>
          <div class="card-item">Agama<span>${d.agama || '-'}</span></div>
          <div class="card-item">No. HP<span>${d.hp || '-'}</span></div>
        </div>
        <div class="card-actions">
          <button class="btn-action btn-detail" onclick="openDetail(${d.id})">👁 Detail</button>
          <button class="btn-action btn-edit"   onclick="openEdit(${d.id})">✏️ Edit</button>
          <button class="btn-action btn-del"    onclick="askDelete(${d.id})">🗑 Hapus</button>
        </div>
      </div>`;
  }).join('');
}

function formatDate(str) {
  if (!str) return '-';
  const [y, m, d] = str.split('-');
  const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d} ${bln[parseInt(m)-1]} ${y}`;
}


function clearForm() {
  fields.forEach(f => {
    const el = document.getElementById('f_' + f);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
}

function openForm() {
  editId = null;
  clearForm();
  document.getElementById('formTitle').textContent = '➕ Tambah Biodata';
  openOverlay('formOverlay');
}

function openEdit(id) {
  const d = allData.find(x => x.id === id);
  if (!d) return;
  editId = id;
  document.getElementById('formTitle').textContent = '✏️ Edit Biodata';
  fields.forEach(f => {
    const el = document.getElementById('f_' + f);
    if (el) el.value = d[f] || '';
  });
  closeOverlay('detailOverlay');
  openOverlay('formOverlay');
}


function filterHuruf(el) {
  const val    = el.value;
  const bersih = val.replace(/[^a-zA-ZÀ-ÿ\s.'-]/g, '');
  if (val !== bersih) el.value = bersih;
  el.classList.toggle('error', bersih.length > 0 && /[0-9]/.test(val));
}

function filterAngka(el) {
  const val    = el.value;
  const bersih = val.replace(/[^0-9]/g, '');
  if (val !== bersih) el.value = bersih;
  el.classList.toggle('error', val !== bersih);
}

function validateEmail(el) {
  const val = el.value.trim();
  if (!val) { el.classList.remove('error'); return; }
  const ok = val.includes('@') && !val.startsWith('@') && !val.endsWith('@');
  el.classList.toggle('error', !ok);
}

function setError(id, isError) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('error', isError);
}


async function simpanData() {
  let valid = true;
  const chk = (id, cond) => { setError(id, cond); if (cond) valid = false; };
  const g   = id => document.getElementById(id).value.trim();

  const nama = g('f_nama'), nis = g('f_nis'), nisn = g('f_nisn');
  const hp = g('f_hp'), hp_ortu = g('f_hp_ortu');
  const email = g('f_email'), tahun = g('f_tahun');
  const ayah = g('f_ayah'), ibu = g('f_ibu');

  chk('f_nama',    !nama || /[0-9]/.test(nama));
  chk('f_nis',     !nis  || /[^0-9]/.test(nis));
  chk('f_nisn',    nisn.length > 0 && /[^0-9]/.test(nisn));
  chk('f_hp',      hp.length > 0 && (hp.length !== 12 || /[^0-9]/.test(hp)));
  chk('f_hp_ortu', hp_ortu.length > 0 && (hp_ortu.length !== 12 || /[^0-9]/.test(hp_ortu)));
  chk('f_email',   email.length > 0 && (!email.includes('@') || email.startsWith('@') || email.endsWith('@')));
  chk('f_tahun',   tahun.length > 0 && /[^0-9]/.test(tahun));
  chk('f_ayah',    ayah.length > 0 && /[0-9]/.test(ayah));
  chk('f_ibu',     ibu.length  > 0 && /[0-9]/.test(ibu));

  if (!valid) {
    showToast('⚠️ Periksa kembali isian yang merah!');
    const firstErr = document.querySelector('.form-group input.error, .form-group select.error');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const obj = {};
  fields.forEach(f => { obj[f] = document.getElementById('f_' + f).value.trim(); });

  try {
    if (editId !== null) {
      obj.id = editId;
      await dbPut(obj);
      showToast('✅ Biodata berhasil diperbarui!');
    } else {
      await dbAdd(obj);
      showToast('✅ Biodata berhasil disimpan!');
    }
    closeOverlay('formOverlay');
    await loadData();
  } catch (e) {
    showToast('❌ Gagal menyimpan: ' + e.message);
  }
}


function openDetail(id) {
  const d = allData.find(x => x.id === id);
  if (!d) return;
  const inisial = (d.nama || '?')[0].toUpperCase();
  const ttl = d.ttl_tempat && d.ttl_tgl
    ? `${d.ttl_tempat}, ${formatDate(d.ttl_tgl)}`
    : (d.ttl_tempat || formatDate(d.ttl_tgl) || '-');

  const rows = [
    ['NIS', d.nis], ['NISN', d.nisn], ['TTL', ttl],
    ['Jenis Kelamin', d.jk], ['Agama', d.agama], ['Gol. Darah', d.goldar],
    ['No. HP', d.hp], ['Email', d.email], ['Alamat', d.alamat],
    ['Kelas', d.kelas], ['Jurusan', d.jurusan], ['Tahun Masuk', d.tahun],
    ['Nama Ayah', d.ayah], ['Nama Ibu', d.ibu],
    ['Pekerjaan Ayah', d.kerja_ayah], ['HP Orang Tua', d.hp_ortu],
    ['Alamat Orang Tua', d.alamat_ortu],
  ];

  document.getElementById('detailContent').innerHTML = `
    <div class="sheet-handle"></div>
    <div class="detail-header">
      <div class="detail-avatar">${inisial}</div>
      <div class="detail-name">${d.nama || '-'}</div>
      <div class="detail-nis">NIS: ${d.nis || '-'}</div>
      <div class="detail-kelas">${d.kelas || ''} ${d.jurusan || ''}</div>
    </div>
    ${rows.map(([l,v]) => v ? `
      <div class="detail-row">
        <span class="lbl">${l}</span>
        <span class="val">${v}</span>
      </div>` : '').join('')}
    <button class="btn-submit" style="margin-top:20px" onclick="openEdit(${d.id})">✏️ Edit Biodata</button>
    <button class="btn-cancel" onclick="closeOverlay('detailOverlay')">Tutup</button>
  `;
  openOverlay('detailOverlay');
}


function askDelete(id) { deleteId = id; openOverlay('confirmOverlay'); }

async function confirmDelete() {
  if (deleteId === null) return;
  try {
    await dbDelete(deleteId);
    showToast('🗑️ Biodata berhasil dihapus!');
    closeOverlay('confirmOverlay');
    closeOverlay('detailOverlay');
    await loadData();
  } catch (e) {
    showToast('❌ Gagal hapus: ' + e.message);
  }
  deleteId = null;
}


function openOverlay(id)  { document.getElementById(id).classList.add('active'); }
function closeOverlay(id) { document.getElementById(id).classList.remove('active'); }
function closeIfOutside(e, id) { if (e.target.id === id) closeOverlay(id); }

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

async function loadData() {
  allData = await dbGetAll();
  renderList();
}


document.addEventListener('DOMContentLoaded', () => {
  initDB().then(loadData).catch(e => {
    document.getElementById('list-view').innerHTML =
      `<div class="empty-state"><div class="icon">❌</div><p>Database error: ${e}</p></div>`;
  });
});