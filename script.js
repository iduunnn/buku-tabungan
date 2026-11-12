const STORAGE_KEY_TRANSACTIONS = 'bukuTabunganData_v2';
const STORAGE_KEY_TARGET = 'targetTabunganData_v2';

let dataTransaksi = [];
let targetData = { title: '', amount: 0, image: '' };
let chartInstance = null;

const currentValues = {
    saldo: 0,
    masuk: 0,
    keluar: 0
};

function init() {
    loadData();
    initCanvasBackground();
    renderTabel();
    updateDashboard();
    updateTargetUI(currentValues.saldo);
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        dataTransaksi = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(dataTransaksi)) dataTransaksi = [];

        const targetRaw = localStorage.getItem(STORAGE_KEY_TARGET);
        targetData = targetRaw ? JSON.parse(targetRaw) : { title: '', amount: 0, image: '' };
    } catch (e) {
        console.error('Gagal memuat data:', e);
        dataTransaksi = [];
        targetData = { title: '', amount: 0, image: '' };
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(dataTransaksi));
}

function saveTarget() {
    localStorage.setItem(STORAGE_KEY_TARGET, JSON.stringify(targetData));
}

/* ---------- UI ---------- */

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✦';
    if (type === 'danger') icon = '🗑️';

    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function animateValue(elementId, startVal, endVal, duration = 750) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (startVal === endVal) {
        element.textContent = formatRupiah(endVal);
        return;
    }

    const diff = endVal - startVal;
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startVal + diff * ease);

        element.textContent = formatRupiah(current);

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = formatRupiah(endVal);
        }
    }

    requestAnimationFrame(step);
}

/* ---------- Dashboard ---------- */

function updateDashboard() {
    let totalMasuk = 0;
    let totalKeluar = 0;
    const kategoriMap = {};

    for (const item of dataTransaksi) {
        if (item.tipe === 'masuk') totalMasuk += item.nominal;
        else totalKeluar += item.nominal;

        kategoriMap[item.kategori] = (kategoriMap[item.kategori] || 0) + item.nominal;
    }

    const totalSaldo = totalMasuk - totalKeluar;

    animateValue('totalSaldo', currentValues.saldo, totalSaldo);
    animateValue('totalMasuk', currentValues.masuk, totalMasuk);
    animateValue('totalKeluar', currentValues.keluar, totalKeluar);

    currentValues.saldo = totalSaldo;
    currentValues.masuk = totalMasuk;
    currentValues.keluar = totalKeluar;

    renderChart(kategoriMap);
    updateTargetUI(totalSaldo);
}

/* ---------- Target ---------- */

function bukaModalTarget() {
    const modal = document.getElementById('modalTarget');
    modal.classList.remove('hidden');
    document.getElementById('inputTargetTitle').value = targetData.title;
    document.getElementById('inputTargetAmount').value = targetData.amount === 0 ? '' : targetData.amount;
    document.getElementById('inputTargetImage').value = '';
}

function tutupModalTarget() {
    document.getElementById('modalTarget').classList.add('hidden');
}

function simpanTarget() {
    const title = document.getElementById('inputTargetTitle').value.trim();
    const amount = parseFloat(document.getElementById('inputTargetAmount').value);
    const imageInput = document.getElementById('inputTargetImage');

    if (!title || !amount || amount <= 0) {
        showToast('Masukkan nama dan nominal target yang valid', 'danger');
        return;
    }

    const handleSave = (image) => {
        targetData = { title, amount, image: image || targetData.image || '' };
        saveTarget();
        tutupModalTarget();
        updateTargetUI(currentValues.saldo);
        showToast(image ? 'Target dan foto impian tersimpan' : 'Target tabungan tersimpan', 'success');
    };

    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => handleSave(e.target.result);
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        handleSave(null);
    }
}

function updateTargetUI(currentSaldo) {
    const titleDisplay = document.getElementById('targetTitleDisplay');
    const currentText = document.getElementById('targetCurrentText');
    const maxText = document.getElementById('targetMaxText');
    const progressBar = document.getElementById('targetProgressBar');
    const statusText = document.getElementById('targetStatusText');
    const percentageText = document.getElementById('targetPercentageText');

    const imageDisplay = document.getElementById('targetImageDisplay');
    const imagePlaceholder = document.getElementById('targetImagePlaceholder');

    if (!titleDisplay) return;

    if (targetData.image) {
        imageDisplay.src = targetData.image;
        imageDisplay.classList.remove('hidden');
        imagePlaceholder.classList.add('hidden');
    } else {
        imageDisplay.classList.add('hidden');
        imagePlaceholder.classList.remove('hidden');
    }

    if (!targetData.title || !targetData.amount || targetData.amount <= 0) {
        titleDisplay.textContent = 'Belum ada target';
        currentText.textContent = formatRupiah(currentSaldo);
        maxText.textContent = 'Rp 0';
        progressBar.style.width = '0%';
        percentageText.textContent = '0%';
        statusText.textContent = 'Tentukan impian finansialmu';
        statusText.className = 'text-xs text-slate-400 truncate max-w-[240px]';
        return;
    }

    titleDisplay.textContent = `Impian: ${targetData.title}`;
    currentText.textContent = formatRupiah(currentSaldo);
    maxText.textContent = formatRupiah(targetData.amount);

    let percentage = (currentSaldo / targetData.amount) * 100;
    percentage = Math.max(0, Math.min(100, percentage));

    progressBar.style.width = `${percentage.toFixed(1)}%`;
    percentageText.textContent = `${percentage.toFixed(1)}%`;

    if (currentSaldo >= targetData.amount) {
        statusText.textContent = 'Target keuangan telah tercapai';
        statusText.className = 'text-xs text-[#d4af37] font-semibold truncate max-w-[240px]';
    } else {
        const kekurangan = targetData.amount - currentSaldo;
        statusText.textContent = `Masih butuh ${formatRupiah(kekurangan)}`;
        statusText.className = 'text-xs text-slate-400 truncate max-w-[240px]';
    }
}

/* ---------- Transactions ---------- */

function tambahTransaksi(e) {
    e.preventDefault();

    const keterangan = document.getElementById('keterangan').value.trim();
    const tipe = document.getElementById('tipe').value;
    const kategori = document.getElementById('kategori').value;
    const nominal = parseFloat(document.getElementById('nominal').value);

    if (!keterangan) {
        showToast('Keterangan tidak boleh kosong', 'danger');
        return;
    }
    if (!nominal || nominal <= 0) {
        showToast('Nominal harus lebih dari 0', 'danger');
        return;
    }

    const item = {
        id: Date.now(),
        tanggal: new Date().toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric'
        }),
        keterangan,
        tipe,
        kategori,
        nominal
    };

    dataTransaksi.unshift(item);
    saveData();

    document.getElementById('formTabungan').reset();
    renderTabel();
    updateDashboard();

    showToast(
        tipe === 'masuk'
            ? `Pemasukan ${formatRupiah(nominal)} dicatat`
            : `Pengeluaran ${formatRupiah(nominal)} dicatat`,
        tipe === 'masuk' ? 'success' : 'info'
    );
}

function hapusTransaksi(id) {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;

    dataTransaksi = dataTransaksi.filter((item) => item.id !== id);
    saveData();
    renderTabel();
    updateDashboard();
    showToast('Transaksi dihapus', 'danger');
}

function hapusSemuaData() {
    if (dataTransaksi.length === 0) {
        showToast('Riwayat masih kosong', 'info');
        return;
    }

    if (!confirm('PERINGATAN: Semua riwayat transaksi akan dihapus permanen.')) return;

    dataTransaksi = [];
    saveData();
    renderTabel();
    updateDashboard();
    showToast('Riwayat dibersihkan', 'danger');
}

function renderTabel() {
    const tbody = document.getElementById('tabelRiwayat');
    const emptyRow = document.getElementById('emptyHistory');
    const filter = document.getElementById('filterKategori').value;

    tbody.innerHTML = '';

    const filtered = filter === 'semua'
        ? dataTransaksi
        : dataTransaksi.filter((item) => item.kategori === filter);

    if (filtered.length === 0) {
        if (emptyRow) emptyRow.classList.remove('hidden');
        return;
    }
    if (emptyRow) emptyRow.classList.add('hidden');

    for (const item of filtered) {
        const tr = document.createElement('tr');
        tr.className = 'fade-in hover:bg-[#d4af37]/5 transition-colors duration-200';

        const isMasuk = item.tipe === 'masuk';
        const nominalText = isMasuk ? `+ ${formatRupiah(item.nominal)}` : `- ${formatRupiah(item.nominal)}`;
        const nominalClass = isMasuk ? 'text-[#d4af37] font-semibold' : 'text-[#b8860b] font-semibold';

        tr.innerHTML = `
            <td class="px-4 py-3 text-xs text-slate-500">${item.tanggal}</td>
            <td class="px-4 py-3 font-medium text-slate-200">${escapeHtml(item.keterangan)}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 bg-slate-900 text-[#d4af37] rounded-xl text-xs border border-[#d4af37]/20">
                    ${escapeHtml(item.kategori)}
                </span>
            </td>
            <td class="px-4 py-3 ${nominalClass}">${nominalText}</td>
            <td class="px-4 py-3 text-right">
                <button onclick="hapusTransaksi(${item.id})" class="text-slate-600 hover:text-[#d4af37] transition-colors duration-200" aria-label="Hapus ${escapeHtml(item.keterangan)}">
                    🗑️
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

/* ---------- Chart ---------- */

function renderChart(kategoriMap) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    const labels = Object.keys(kategoriMap);
    const data = Object.values(kategoriMap);

    if (chartInstance) {
        chartInstance.destroy();
    }

    if (labels.length === 0) return;

    const palette = ['#d4af37', '#f5deb3', '#b8860b', '#daa520', '#c5a059', '#e6c27a'];

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: palette,
                borderWidth: 0,
                hoverOffset: 22
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#b8860b',
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(12, 12, 18, 0.95)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(212, 175, 55, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => {
                            const total = data.reduce((a, b) => a + b, 0);
                            const value = ctx.parsed || 0;
                            const pct = total ? ((value / total) * 100).toFixed(1) : '0';
                            return `${ctx.label}: ${formatRupiah(value)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

/* ---------- Export / Import ---------- */

function exportData() {
    if (dataTransaksi.length === 0) {
        showToast('Tidak ada data untuk dicadangkan', 'info');
        return;
    }

    const payload = {
        exportedAt: new Date().toISOString(),
        transaksi: dataTransaksi,
        target: targetData
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tabunganku_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    showToast('Cadangan berhasil diunduh', 'success');
}

function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);

            let transactions = [];
            let target = null;

            if (Array.isArray(imported)) {
                transactions = imported;
            } else if (imported && Array.isArray(imported.transaksi)) {
                transactions = imported.transaksi;
                target = imported.target || null;
            } else {
                showToast('Format cadangan tidak valid', 'danger');
                return;
            }

            dataTransaksi = transactions;
            saveData();

            if (target) {
                targetData = target;
                saveTarget();
            }

            renderTabel();
            updateDashboard();
            showToast('Data berhasil dipulihkan', 'success');
        } catch (err) {
            showToast('Gagal membaca file JSON', 'danger');
        }
    };
    reader.readAsText(file);
}

/* ---------- Background ---------- */

function initCanvasBackground() {
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const blobs = [];
    const blobCount = 5;

    const colors = [
        'rgba(212, 175, 55, 0.14)',
        'rgba(184, 134, 11, 0.11)',
        'rgba(212, 175, 55, 0.09)',
        'rgba(139, 69, 19, 0.07)'
    ];

    for (let i = 0; i < blobCount; i++) {
        blobs.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            radius: Math.random() * 400 + 300,
            color: colors[i]
        });
    }

    const stars = [];
    for (let i = 0; i < 160; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5,
            alpha: Math.random() * 0.8 + 0.2
        });
    }

    function animate() {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#020203');
        gradient.addColorStop(0.5, '#09090d');
        gradient.addColorStop(1, '#020203');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ffffff';
        for (const s of stars) {
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        for (const b of blobs) {
            b.x += b.vx;
            b.y += b.vy;

            if (b.x < -b.radius) b.x = width + b.radius;
            if (b.x > width + b.radius) b.x = -b.radius;
            if (b.y < -b.radius) b.y = height + b.radius;
            if (b.y > height + b.radius) b.y = -b.radius;

            const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
            g.addColorStop(0, b.color);
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(animate);
    }

    animate();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);