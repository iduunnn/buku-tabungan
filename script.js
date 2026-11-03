let dataTransaksi = JSON.parse(localStorage.getItem('bukuTabunganData')) || [];
let chartInstance = null;

let currentValues = {
    saldo: 0,
    masuk: 0,
    keluar: 0
};

// Inisialisasi Halaman & Canvas Background Partikel
document.addEventListener('DOMContentLoaded', () => {
    initCanvasParticles();
    renderTabel();
    updateDashboard();
});

// --- ANIMASI BACKGROUND PARTIKEL CANVAS (NEON BIRU & UNGU) ---
function initCanvasParticles() {
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = Math.floor(width / 20);

    // Warna partikel selang-seling antara Cyan-Biru dan Purple-Magenta
    const colors = ['rgba(56, 189, 248, ', 'rgba(168, 85, 247, ', 'rgba(192, 132, 252, '];

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2.5 + 1,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: Math.random() * 0.6 + 0.2
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            // Gambar titik partikel
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `${p.color}${p.alpha})`;
            ctx.fill();

            // Hubungkan garis tipis antar partikel
            for (let j = i + 1; j < particles.length; j++) {
                let p2 = particles[j];
                let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 - dist / 1200})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
}

// --- FITUR TOAST NOTIFICATION ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '⚡';
    if (type === 'danger') icon = '🗑️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- ANIMASI COUNTER ANGKA ---
function animateValue(elementId, startVal, endVal, duration = 600) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (startVal === endVal) {
        element.textContent = formatRupiah(endVal);
        return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        const currentVal = Math.floor(easeProgress * (endVal - startVal) + startVal);

        element.textContent = formatRupiah(currentVal);

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = formatRupiah(endVal);
        }
    };
    window.requestAnimationFrame(step);
}

// Tambah Transaksi
function tambahTransaksi(e) {
    e.preventDefault();

    const keterangan = document.getElementById('keterangan').value;
    const tipe = document.getElementById('tipe').value;
    const kategori = document.getElementById('kategori').value;
    const nominal = parseFloat(document.getElementById('nominal').value);
    const tanggal = new Date().toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    const item = {
        id: Date.now(),
        tanggal,
        keterangan,
        tipe,
        kategori,
        nominal
    };

    dataTransaksi.unshift(item);
    simpanLocal();
    
    document.getElementById('formTabungan').reset();
    renderTabel();
    updateDashboard();

    if (tipe === 'masuk') {
        showToast(`Berhasil menabung ${formatRupiah(nominal)}!`, 'success');
    } else {
        showToast(`Pencatatan pengeluaran ${formatRupiah(nominal)} disimpan`, 'info');
    }
}

// Hapus Transaksi
function hapusTransaksi(id) {
    if (confirm('Yakin ingin menghapus transaksi ini?')) {
        dataTransaksi = dataTransaksi.filter(item => item.id !== id);
        simpanLocal();
        renderTabel();
        updateDashboard();
        showToast('Transaksi telah dihapus', 'danger');
    }
}

// Hapus Semua Data
function hapusSemuaData() {
    if (dataTransaksi.length === 0) {
        showToast('Tabel riwayat masih kosong!', 'info');
        return;
    }

    if (confirm('PERINGATAN: Semua riwayat transaksi akan dihapus permanent!')) {
        dataTransaksi = [];
        simpanLocal();
        renderTabel();
        updateDashboard();
        showToast('Semua riwayat berhasil dibersihkan', 'danger');
    }
}

function simpanLocal() {
    localStorage.setItem('bukuTabunganData', JSON.stringify(dataTransaksi));
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
}

// Render Tabel
function renderTabel() {
    const tbody = document.getElementById('tabelRiwayat');
    const filter = document.getElementById('filterKategori').value;
    tbody.innerHTML = '';

    const filteredData = filter === 'semua' 
        ? dataTransaksi 
        : dataTransaksi.filter(item => item.kategori === filter);

    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-6 text-slate-500">Belum ada catatan transaksi.</td>
            </tr>
        `;
        return;
    }

    filteredData.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-purple-900/20 transition duration-150';
        
        const isMasuk = item.tipe === 'masuk';
        const nominalText = isMasuk ? `+ ${formatRupiah(item.nominal)}` : `- ${formatRupiah(item.nominal)}`;
        const nominalClass = isMasuk ? 'text-cyan-400 font-semibold' : 'text-purple-400 font-semibold';

        tr.innerHTML = `
            <td class="px-4 py-3 text-xs text-slate-400">${item.tanggal}</td>
            <td class="px-4 py-3 font-medium text-slate-200">${item.keterangan}</td>
            <td class="px-4 py-3"><span class="px-2 py-1 bg-slate-900 text-purple-300 rounded-lg text-xs border border-purple-800/50">${item.kategori}</span></td>
            <td class="px-4 py-3 ${nominalClass}">${nominalText}</td>
            <td class="px-4 py-3 text-right">
                <button onclick="hapusTransaksi(${item.id})" class="text-slate-500 hover:text-rose-400 transition">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Update Dashboard & Chart
function updateDashboard() {
    let newTotalMasuk = 0;
    let newTotalKeluar = 0;
    const kategoriMap = {};

    dataTransaksi.forEach(item => {
        if (item.tipe === 'masuk') {
            newTotalMasuk += item.nominal;
        } else {
            newTotalKeluar += item.nominal;
        }

        kategoriMap[item.kategori] = (kategoriMap[item.kategori] || 0) + item.nominal;
    });

    const newTotalSaldo = newTotalMasuk - newTotalKeluar;

    animateValue('totalSaldo', currentValues.saldo, newTotalSaldo);
    animateValue('totalMasuk', currentValues.masuk, newTotalMasuk);
    animateValue('totalKeluar', currentValues.keluar, newTotalKeluar);

    currentValues.saldo = newTotalSaldo;
    currentValues.masuk = newTotalMasuk;
    currentValues.keluar = newTotalKeluar;

    renderChart(kategoriMap);
}

// Render Chart dengan Palet Biru - Ungu Neon
function renderChart(kategoriMap) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    const labels = Object.keys(kategoriMap);
    const data = Object.values(kategoriMap);

    if (chartInstance) {
        chartInstance.destroy();
    }

    if (labels.length === 0) {
        return;
    }

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#38bdf8', '#c084fc', '#818cf8', '#e879f9', '#0284c7', '#a855f7'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#c084fc', font: { family: 'Plus Jakarta Sans' } }
                }
            }
        }
    });
}

// Export JSON
function exportData() {
    if (dataTransaksi.length === 0) {
        showToast('Tidak ada data untuk dicadangkan!', 'info');
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataTransaksi));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `buku_tabungan_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Data berhasil dicadangkan ke JSON', 'success');
}

// Import JSON
function importData(e) {
    const fileReader = new FileReader();
    fileReader.onload = function (event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                dataTransaksi = importedData;
                simpanLocal();
                renderTabel();
                updateDashboard();
                showToast('Data tabungan berhasil dipulihkan!', 'success');
            } else {
                showToast('Format file cadangan tidak valid!', 'danger');
            }
        } catch (err) {
            showToast('Gagal membaca file JSON!', 'danger');
        }
    };
    if (e.target.files[0]) {
        fileReader.readAsText(e.target.files[0]);
    }
}