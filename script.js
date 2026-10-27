
(() => {
  'use strict';

  /* ---------- Konfigurasi bisnis ---------- */
  const CONFIG = {
    businessName: 'EVO Jangli Badminton',
    whatsappNumber: '6288291299537',   
    pricePerHour: 50000,               
    openHour: 8,                       
    closeHour: 23,                    
    maxBookingDaysAhead: 365
  };

  const LEGAL_CONTENT = {
    privasi: {
      title: 'Kebijakan Privasi',
      body: `
        <p>Nama dan nomor WhatsApp yang Anda isi pada form hanya diproses di browser untuk menghitung estimasi biaya dan menyusun pesan WhatsApp.</p>
        <p>Website ini tidak memiliki server atau database, sehingga data tersebut tidak disimpan oleh website. Data baru sampai ke pengelola ketika Anda sendiri mengirim pesan melalui WhatsApp.</p>`
    },
    syarat: {
      title: 'Syarat & Ketentuan',
      body: `
        <p>Biaya yang tampil adalah estimasi berdasarkan tarif Rp50.000 per jam dan durasi slot yang Anda pilih.</p>
        <p>Website ini tidak menampilkan ketersediaan lapangan secara real-time. Booking baru dianggap sah setelah jadwal dikonfirmasi oleh admin EVO Jangli melalui WhatsApp.</p>
        <p>Ketentuan pembayaran, perubahan jadwal, dan pembatalan ditentukan dan disampaikan langsung oleh pengelola EVO Jangli.</p>`
    }
  };

  /* ---------- Util DOM ---------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* ---------- Elemen ---------- */
  const header = $('.evo-header');
  const navLinks = $$('.evo-nav-link');
  const navCollapse = $('#navMenu');

  const form = $('#bookingForm');
  const inputNama = $('#nama');
  const inputWa = $('#whatsapp');
  const selectLapangan = $('#lapanganSelect');
  const inputTanggal = $('#tanggal');
  const dateField = $('#dateField');
  const dateText = $('#tanggalText');
  const slotGrid = $('#slotGrid');
  const inputDurasi = $('#durasi');
  const liveCost = $('#liveCost');

  const resultEmpty = $('#resultEmpty');
  const resultFilled = $('#resultFilled');
  const resultCard = $('.result-card');
  const btnWhatsApp = $('#btnWhatsApp');
  const btnReset = $('#btnReset');

  const courtCards = $$('.court-card');
  const courtButtons = $$('[data-court-select]');

  /* ---------- State ---------- */
  let selectedHours = [];         
  let rejectTimer = null;

  /* ---------- Format helper ---------- */
  const pad2 = (n) => String(n).padStart(2, '0');
  const formatHour = (h) => `${pad2(h)}.00`;
  const formatRupiah = (n) => 'Rp' + n.toLocaleString('id-ID');

  const toISODate = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

  const parseISODate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDateShort = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatDateLong = (iso) =>
    parseISODate(iso).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

  /* =========================================================
     1. NAVBAR: efek scroll, menu aktif, tutup menu mobile
     ========================================================= */
  const sectionIds = ['beranda', 'tentang', 'lapangan', 'fasilitas', 'booking', 'lokasi', 'data-pengunjung'];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
  let ticking = false;

  function updateNavOnScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);

    const y = window.scrollY + 140;
    let current = sections[0].id;
    sections.forEach((section) => {
      if (section.offsetTop <= y) current = section.id;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = 'data-pengunjung';
    }

    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${current}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateNavOnScroll);
    }
  }, { passive: true });
  window.addEventListener('resize', updateNavOnScroll);

  // Tutup menu mobile setelah link / tombol di dalamnya diklik
  $$('a', navCollapse).forEach((link) => {
    link.addEventListener('click', () => {
      if (navCollapse.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
      }
    });
  });

  /* =========================================================
     2. FORM: error handling
     ========================================================= */
  const fieldControls = {
    nama: () => inputNama,
    whatsapp: () => inputWa,
    lapangan: () => selectLapangan,
    tanggal: () => dateField,
    slot: () => null
  };

  function setError(field, message) {
    const errorEl = $(`#err-${field}`);
    const control = fieldControls[field]();
    errorEl.textContent = message || '';
    if (control) control.classList.toggle('is-invalid', Boolean(message));
    if (field === 'tanggal') inputTanggal.setAttribute('aria-invalid', message ? 'true' : 'false');
    else if (control) control.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function clearAllErrors() {
    Object.keys(fieldControls).forEach((field) => setError(field, ''));
  }

  /* =========================================================
     3. PILIH LAPANGAN
     ========================================================= */
  function highlightCourt(name) {
    courtCards.forEach((card) => {
      const selected = card.dataset.court === name;
      card.classList.toggle('is-selected', selected);
      const btn = $('[data-court-select]', card);
      if (btn) btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function chooseCourt(name) {
    selectLapangan.value = name;
    highlightCourt(name);
    setError('lapangan', '');
    invalidateResult();
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  courtButtons.forEach((btn) => {
    btn.addEventListener('click', () => chooseCourt(btn.dataset.courtSelect));
  });

  selectLapangan.addEventListener('change', () => {
    highlightCourt(selectLapangan.value);
    setError('lapangan', '');
    invalidateResult();
  });

  /* =========================================================
     4. TANGGAL
     ========================================================= */
  const today = new Date();
  const todayISO = toISODate(today);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + CONFIG.maxBookingDaysAhead);
  const maxISO = toISODate(maxDate);

  inputTanggal.min = todayISO;
  inputTanggal.max = maxISO;

  inputTanggal.addEventListener('click', () => {
    if (typeof inputTanggal.showPicker === 'function') {
      try { inputTanggal.showPicker(); } catch (e) { /* abaikan, browser tidak mengizinkan */ }
    }
  });

  function updateDateText() {
    const value = inputTanggal.value;
    dateText.textContent = value ? formatDateShort(value) : 'Pilih tanggal';
    dateText.classList.toggle('is-placeholder', !value);
  }

  inputTanggal.addEventListener('change', () => {
    updateDateText();
    setError('tanggal', '');
    updateSlotAvailability();
    renderSlots();
    invalidateResult();
  });

  /* =========================================================
     5. SLOT WAKTU
     ========================================================= */
  const slotButtons = [];

  function buildSlots() {
    for (let hour = CONFIG.openHour; hour < CONFIG.closeHour; hour++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.dataset.hour = String(hour);
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = `${formatHour(hour)} - ${formatHour(hour + 1)}`;
      btn.addEventListener('click', () => toggleSlot(hour, btn));
      slotGrid.appendChild(btn);
      slotButtons.push(btn);
    }
  }

  // Jika tanggal = hari ini, slot yang sudah lewat tidak bisa dipilih
  function updateSlotAvailability() {
    const isToday = inputTanggal.value === todayISO;
    const nowHour = new Date().getHours();
    let allPast = isToday;

    slotButtons.forEach((btn) => {
      const hour = Number(btn.dataset.hour);
      const past = isToday && hour <= nowHour;
      btn.disabled = past;
      if (!past) allPast = false;
    });

    selectedHours = selectedHours.filter((h) => !(isToday && h <= nowHour));

    if (allPast) setError('slot', 'Semua slot hari ini sudah lewat. Silakan pilih tanggal lain.');
    else if ($('#err-slot').textContent.startsWith('Semua slot')) setError('slot', '');
  }

  function isContiguous(hours) {
    return hours.every((h, i) => i === 0 || h === hours[i - 1] + 1);
  }

  function toggleSlot(hour, btn) {
    const min = selectedHours[0];
    const max = selectedHours[selectedHours.length - 1];

    if (selectedHours.includes(hour)) {
      if (selectedHours.length === 1 || hour === min || hour === max) {
        selectedHours = selectedHours.filter((h) => h !== hour);
      } else {
        selectedHours = selectedHours.filter((h) => h <= hour);
      }
    } else if (selectedHours.length === 0 || hour === min - 1 || hour === max + 1) {
      selectedHours = [...selectedHours, hour].sort((a, b) => a - b);
    } else {
      rejectSlot(btn);
      return;
    }

    setError('slot', '');
    renderSlots();
    invalidateResult();
  }

  function rejectSlot(btn) {
    btn.classList.add('is-rejected');
    window.clearTimeout(rejectTimer);
    rejectTimer = window.setTimeout(() => btn.classList.remove('is-rejected'), 900);
    setError('slot', 'Slot harus berurutan. Pilih jam yang bersambung dengan slot yang sudah dipilih.');
  }

  function renderSlots() {
    slotButtons.forEach((btn) => {
      const selected = selectedHours.includes(Number(btn.dataset.hour));
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    const duration = selectedHours.length;
    inputDurasi.value = duration ? `${duration} Jam` : '';
    liveCost.textContent = duration
      ? `${formatRupiah(CONFIG.pricePerHour)} × ${duration} jam = ${formatRupiah(duration * CONFIG.pricePerHour)}`
      : `Tarif ${formatRupiah(CONFIG.pricePerHour)} per jam.`;
  }

  /* =========================================================
     6. VALIDASI
     ========================================================= */
  function normalizePhone(raw) {
    let digits = raw.replace(/[\s\-().]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (!/^\d+$/.test(digits)) return null;

    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    else if (digits.startsWith('8')) digits = '62' + digits;
    else if (!digits.startsWith('62')) return null;

    return /^628\d{8,11}$/.test(digits) ? digits : null;
  }

  function validateForm() {
    const errors = {};
    const nama = inputNama.value.trim().replace(/\s+/g, ' ');
    const phone = normalizePhone(inputWa.value.trim());
    const lapangan = selectLapangan.value;
    const tanggal = inputTanggal.value;

    if (!nama) {
      errors.nama = 'Nama lengkap wajib diisi.';
    } else if (!/^\p{L}[\p{L}\s.'’-]{2,59}$/u.test(nama)) {
      errors.nama = 'Nama minimal 3 karakter dan hanya boleh berisi huruf, spasi, titik, atau apostrof.';
    }

    if (!inputWa.value.trim()) {
      errors.whatsapp = 'Nomor WhatsApp wajib diisi.';
    } else if (!phone) {
      errors.whatsapp = 'Nomor tidak valid. Gunakan nomor WhatsApp Indonesia, contoh: 085607331933.';
    }

    if (!lapangan) {
      errors.lapangan = 'Pilih lapangan terlebih dahulu.';
    }

    if (!tanggal) {
      errors.tanggal = 'Tanggal bermain wajib dipilih.';
    } else if (tanggal < todayISO) {
      errors.tanggal = 'Tanggal tidak boleh sebelum hari ini.';
    } else if (tanggal > maxISO) {
      errors.tanggal = `Booking maksimal ${CONFIG.maxBookingDaysAhead} hari ke depan.`;
    }

    if (selectedHours.length === 0) {
      errors.slot = 'Pilih minimal 1 slot waktu.';
    } else if (!isContiguous(selectedHours)) {
      errors.slot = 'Slot waktu harus berurutan.';
    } else if (selectedHours[selectedHours.length - 1] + 1 > CONFIG.closeHour) {
      errors.slot = `Sewa tidak boleh melewati pukul ${formatHour(CONFIG.closeHour)}.`;
    } else if (tanggal === todayISO && selectedHours[0] <= new Date().getHours()) {
      errors.slot = 'Slot yang dipilih sudah lewat. Pilih jam yang lebih akhir.';
    }

    return { errors, nama, phone, lapangan, tanggal };
  }

  function focusFirstError(errors) {
    const order = ['nama', 'whatsapp', 'lapangan', 'tanggal', 'slot'];
    const first = order.find((field) => errors[field]);
    const target = {
      nama: inputNama,
      whatsapp: inputWa,
      lapangan: selectLapangan,
      tanggal: inputTanggal,
      slot: slotButtons.find((b) => !b.disabled) || slotGrid
    }[first];
    if (!target) return;

    const anchor = first === 'tanggal' ? dateField : (first === 'slot' ? slotGrid : target);
    anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
  }

  /* =========================================================
     7. HASIL SIMULASI + WHATSAPP
     ========================================================= */
  function invalidateResult() {
    resultFilled.classList.add('d-none');
    resultEmpty.classList.remove('d-none');
  }

  function showResult({ nama, phone, lapangan, tanggal }) {
    const duration = selectedHours.length;
    const start = selectedHours[0];
    const end = selectedHours[selectedHours.length - 1] + 1;
    const total = duration * CONFIG.pricePerHour;

    const localPhone = '0' + phone.slice(2);
    const schedule = `${formatHour(start)} - ${formatHour(end)}`;

    $('#resNama').textContent = nama;
    $('#resWa').textContent = localPhone;
    $('#resLapangan').textContent = lapangan;
    $('#resTanggal').textContent = formatDateShort(tanggal);
    $('#resJadwal').textContent = schedule;
    $('#resDurasi').textContent = `${duration} Jam`;
    $('#resTotal').textContent = formatRupiah(total);

    const message = [
      `Halo ${CONFIG.businessName}, saya ingin booking lapangan.`,
      '',
      `Nama: ${nama}`,
      `WhatsApp: ${localPhone}`,
      `Lapangan: ${lapangan}`,
      `Tanggal: ${formatDateLong(tanggal)}`,
      `Jadwal: ${schedule}`,
      `Durasi: ${duration} Jam`,
      `Estimasi Total: ${formatRupiah(total)}`,
      '',
      'Mohon dicek ketersediaan jadwalnya. Terima kasih.'
    ].join('\n');

    btnWhatsApp.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;

    resultEmpty.classList.add('d-none');
    resultFilled.classList.remove('d-none');

   
    if (window.matchMedia('(max-width: 991.98px)').matches) {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = validateForm();

    Object.keys(fieldControls).forEach((field) => setError(field, data.errors[field] || ''));

    if (Object.keys(data.errors).length > 0) {
      invalidateResult();
      focusFirstError(data.errors);
      return;
    }
    showResult(data);
  });

  // Hapus pesan error & hasil lama saat pengguna mengubah isian
  inputNama.addEventListener('input', () => { setError('nama', ''); invalidateResult(); });
  inputWa.addEventListener('input', () => { setError('whatsapp', ''); invalidateResult(); });

  function resetBooking() {
    form.reset();
    selectedHours = [];
    clearAllErrors();
    highlightCourt('');
    updateDateText();
    updateSlotAvailability();
    renderSlots();
    invalidateResult();
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
    inputNama.focus({ preventScroll: true });
  }

  btnReset.addEventListener('click', resetBooking);

  /* =========================================================
     8. FOOTER: tahun otomatis + modal kebijakan
     ========================================================= */
  $('#tahun').textContent = String(new Date().getFullYear());

  const legalModalEl = $('#legalModal');
  const legalModal = bootstrap.Modal.getOrCreateInstance(legalModalEl);

  $$('[data-legal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const content = LEGAL_CONTENT[btn.dataset.legal];
      if (!content) return;
      $('#legalModalTitle').textContent = content.title;
      $('#legalModalBody').innerHTML = content.body;
      legalModal.show();
    });
  });


    /* =========================================================
     9. FORM DATA PENGUNJUNG
     ========================================================= */
  const visitorForm = $('#visitorForm');
  const visitorNama = $('#visitorNama');
  const visitorAlamat = $('#visitorAlamat');
  const visitorKota = $('#visitorKota');
  const visitorResult = $('#visitorResult');

  function setVisitorError(id, message, control) {
    $(`#err-${id}`).textContent = message || '';
    if (control) control.classList.toggle('is-invalid', Boolean(message));
  }

  const getHobi = () => $$('input[name="hobi"]:checked', visitorForm).map((el) => el.value);

  visitorForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const nama = visitorNama.value.trim();
    const alamat = visitorAlamat.value.trim();
    const kota = visitorKota.value;
    const hobi = getHobi();

    setVisitorError('visitorNama', nama ? '' : 'Nama wajib diisi.', visitorNama);
    setVisitorError('visitorAlamat', alamat ? '' : 'Alamat wajib diisi.', visitorAlamat);
    setVisitorError('visitorKota', kota ? '' : 'Pilih kota terlebih dahulu.', visitorKota);
    setVisitorError('visitorHobi', hobi.length ? '' : 'Pilih minimal satu hobi.');

    if (!nama || !alamat || !kota || hobi.length === 0) {
      visitorResult.classList.add('d-none');
      return;
    }

    // textContent dipakai agar input pengguna tidak dieksekusi sebagai HTML
    visitorResult.textContent = `Terima kasih, ${nama}! Data diterima — Kota: ${kota}; Hobi: ${hobi.join(', ')}.`;
    visitorResult.classList.remove('d-none');
  });

  visitorForm.addEventListener('input', (event) => {
    const map = {
      visitorNama: 'visitorNama',
      visitorAlamat: 'visitorAlamat',
      visitorKota: 'visitorKota'
    };
    if (map[event.target.id]) setVisitorError(map[event.target.id], '', event.target);
    if (event.target.name === 'hobi') setVisitorError('visitorHobi', '');
  });

  visitorForm.addEventListener('reset', () => {
    ['visitorNama', 'visitorAlamat', 'visitorKota'].forEach((id) => setVisitorError(id, '', $(`#${id}`)));
    setVisitorError('visitorHobi', '');
    visitorResult.classList.add('d-none');
  });

  /* ---------- Inisialisasi ---------- */
  buildSlots();
  updateDateText();
  updateSlotAvailability();
  renderSlots();
  updateNavOnScroll();
})();