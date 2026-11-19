import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import { OdibotMascot } from './OdibotMascot';
import {
  X,
  Compass,
  Map,
  Repeat,
  Trophy,
  Play,
  Gamepad2,
  Lightbulb,
  Bug,
  Sparkles,
  Boxes,
  ListOrdered,
  Star,
  CheckCircle2,
  BookMarked,
  Keyboard,
} from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
  onStartFirstMission?: () => void;
  onReplayWalkthrough?: () => void;
}

type GuideTab = 'START' | 'TILES' | 'LOGIC' | 'MODES';

export const GuideModal: React.FC<GuideModalProps> = ({
  onClose,
  onStartFirstMission,
  onReplayWalkthrough,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('START');

  const tabs: { id: GuideTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'START', label: '1. Mulai Cepat', shortLabel: 'Mulai', icon: Play },
    { id: 'TILES', label: '2. Peta & Rintangan', shortLabel: 'Peta', icon: Map },
    { id: 'LOGIC', label: '3. Loop, Logika & Fungsi', shortLabel: 'Loop & F1', icon: Repeat },
    { id: 'MODES', label: '4. Mode Lain & Bintang', shortLabel: 'Mode & ★', icon: Trophy },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/92 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92dvh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/80 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
              <BookMarked className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold font-display text-white truncate">
                Panduan Menggunakan Odibot
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
                Cara bermain, membaca peta, menyusun loop, hingga meraih 3 bintang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onReplayWalkthrough && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onReplayWalkthrough();
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Mulai tur interaktif antarmuka Arena & Workspace Kode"
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tur Antarmuka</span>
                <span className="sm:hidden">Tur</span>
              </button>
            )}

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
              title="Tutup Panduan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-3 sm:px-6 py-2 bg-slate-950/50 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sounds.playClick();
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-900">
          {activeTab === 'START' && (
            <div className="space-y-4">
              {/* Mascot Welcome */}
              <div className="flex items-start gap-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                <OdibotMascot size="sm" className="shrink-0" />
                <div className="text-xs text-slate-300 leading-relaxed space-y-1">
                  <div className="font-bold text-cyan-300 font-display text-sm">
                    Selamat Datang di Stasiun Antariksa Odibot!
                  </div>
                  <p>
                    Tugasmu adalah memprogram robot <strong>Kodi</strong> untuk mengumpulkan seluruh <strong>Kristal Energi 💎</strong> lalu berhenti tepat di ubin <strong>Terminal Emas ★</strong> sebelum baterai habis atau jatuh ke jurang.
                  </p>
                </div>
              </div>

              {/* 4 Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono text-[11px]">
                      1
                    </span>
                    <span>Amati Peta &amp; Arah Robot</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Perhatikan <strong>panah oranye</strong> di badan robot untuk mengetahui arah hadapnya (Utara, Timur, Selatan, Barat). Kamu bisa mengganti sudut pandang <strong>3D / 2D</strong>, memutar kamera, atau menggeser peta dengan sentuhan/mouse.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-[11px]">
                      2
                    </span>
                    <span>Susun Balok Perintah</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Ketuk balok di panel <strong>Pilih Balok Perintah</strong> (sebelah kiri di laptop, bagian bawah di HP) untuk memasukkannya ke <strong>Susunan Kode Odibot</strong>. Gunakan panah ▲ ▼ untuk mengubah urutan atau ikon tempat sampah untuk menghapus.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono text-[11px]">
                      3
                    </span>
                    <span>Jalankan atau Uji 1 Langkah</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tekan <strong>▶ Jalankan</strong> untuk melihat Kodi bergerak mengikuti kodemu, atau tekan <strong>1 Langkah</strong> untuk menelusuri instruksi satu per satu. Kamu juga bisa menyalakan mode <strong>Auto</strong> agar kode langsung diuji setelah dirangkai.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-mono text-[11px]">
                      4
                    </span>
                    <span>Pantau Memori RAM &amp; Python</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Buka panel <strong>Inspektor Memori &amp; Trace</strong> di bawah arena untuk memantau sisa <em>baterai</em>, posisi koordinat <code>(X, Y)</code>, dan tabel penelusuran langkah. Klik tab <strong>Python</strong> di workspace untuk melihat terjemahan kode Python aslinya!
                  </p>
                </div>
              </div>

              {/* Manual D-Pad & Keyboard */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-amber-400" />
                    <span>Kemudi Langsung &amp; Pintasan Keyboard</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Cocok untuk mencoba rute sebelum menyusun blok kode
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2">
                    <Gamepad2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Klik tombol <strong>Kemudi</strong> di pojok kiri bawah arena untuk memunculkan tombol D-Pad sentuh (Maju, Kiri, Kanan, Lompat, Ambil, Saklar).
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2">
                    <Keyboard className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="font-mono text-[11px] leading-relaxed">
                      <strong className="text-white">↑/W</strong> Maju · <strong className="text-white">←/A</strong> Kiri · <strong className="text-white">→/D</strong> Kanan · <strong className="text-white">J</strong> Lompat · <strong className="text-white">E</strong> Ambil · <strong className="text-white">F</strong> Saklar · <strong className="text-white">R</strong> Reset · <strong className="text-white">Spasi</strong> Jalankan
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TILES' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Kenali setiap jenis ubin di Stasiun Luar Angkasa agar Kodi tidak menabrak tebing, tersengat laser, atau kehabisan baterai:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center text-[11px] font-mono text-slate-300">
                    0m
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">Ubin Jalan Datar (Path)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Ubin datar aman dilewati dengan blok <strong>Maju 1 Petak</strong>. Setiap langkah maju menghabiskan <strong>1 unit baterai</strong> (jika level memakai batas baterai).
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-500/70 shrink-0 flex items-center justify-center text-[11px] font-mono font-bold text-blue-300">
                    +1m
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-blue-300">Tebing Bertingkat (+1m / +2m)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Gunakan blok <strong>Lompat Tebing</strong> untuk naik atau turun selisih ketinggian 1 tingkat. Jika memakai <em>Maju</em> ke tebing lebih tinggi/rendah, robot akan tertahan!
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/60 shrink-0 flex items-center justify-center text-lg">
                    💎
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-cyan-300">Kristal Energi</div>
                    <p className="text-slate-400 leading-relaxed">
                      Robot harus berhenti di atas ubin kristal lalu menjalankan blok <strong>Ambil Kristal</strong>. Semua kristal wajib terkumpul sebelum misi dinyatakan menang.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400 shrink-0 flex items-center justify-center text-lg text-amber-300 font-bold">
                    ★
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-amber-300">Terminal Emas (Tujuan)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Titik akhir misi. Kodi harus mengakhiri langkah tepat di atas ubin emas ini setelah semua kristal berhasil diamankan.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-500 shrink-0 flex items-center justify-center">
                    <span className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white inline-block" />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-emerald-300">Tombol Saklar (Switch)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Ditandai bulatan tombol di tengah ubin. Berdiri di atasnya lalu pasang blok <strong>Saklar Laser</strong> untuk mematikan gerbang laser merah (berubah hijau saat aktif).
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-950 border border-rose-500 shrink-0 flex items-center justify-center text-rose-200 font-black text-base">
                    ✕
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-rose-300">Gerbang Laser Merah (Hazard)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Menyengat Kodi jika dilangkahi saat masih aktif (merah). Matikan saklarnya terlebih dahulu hingga ubin berubah abu-abu gelap.
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-sky-600 border border-sky-300 flex items-center justify-center">
                      <span className="w-3.5 h-3.5 border border-white/80 inline-block" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-yellow-600 border border-yellow-300 flex items-center justify-center">
                      <span className="w-3.5 h-3.5 border border-white/80 inline-block" />
                    </div>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-sky-300">Ubin Sensor Biru &amp; Sensor Kuning</div>
                    <p className="text-slate-400 leading-relaxed">
                      Digunakan bersama blok logika <strong>Cek Warna</strong>. Ketika Kodi berdiri di atasnya dan warna sesuai kondisi, perintah di dalam blok sensor akan dijalankan otomatis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'LOGIC' && (
            <div className="space-y-3.5">
              {/* How to use Loop */}
              <div className="p-4 bg-purple-950/30 border border-purple-700/50 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-purple-300 font-display">
                  <Repeat className="w-4 h-4 text-purple-400" />
                  <span>Cara Menggunakan Loop (Ulangi &amp; Selama)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-200 leading-relaxed">
                  <li>
                    Klik blok <strong className="text-purple-300">🔁 Ulangi (Loop)</strong> atau <strong className="text-purple-300">🔁 Selama (While)</strong> di palet. Kotak loop akan langsung ditandai bingkai kuning (<strong>Mode Isi Blok aktif</strong>).
                  </li>
                  <li>
                    Langsung klik balok perintah di palet (misalnya <em>Maju 1 Petak</em> dan <em>Ambil Kristal</em>) — balok otomatis masuk <strong>ke dalam kotak loop</strong>, atau tekan tombol kecil <code className="px-1.5 py-0.5 bg-slate-800 rounded text-white">+ Maju</code> di dalam loop.
                  </li>
                  <li>
                    Atur jumlah pengulangan memakai tombol <code className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300">-</code> <code className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300">+</code> (untuk <em>Ulangi</em>) atau ubah operator <code className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300">&gt;</code> &amp; angka batas variabel (untuk <em>Selama</em>).
                  </li>
                  <li>
                    Setelah selesai mengisi isi loop, klik tombol kuning <strong>✓ Selesai Isi</strong> supaya balok berikutnya dipasang di luar loop.
                  </li>
                </ol>
              </div>

              {/* Conditionals, Lists & Functions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4 text-blue-400" />
                    <span>Struktur Data List (Sektor 3)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pasang blok <strong>📋 Baca List Rute</strong> untuk mengeksekusi daftar antrean perintah otomatis yang tampil di HUD atas (misal <code>[MAJU, KANAN, AMBIL]</code>), lalu sambung langkah sisa jika perlu.
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-950/25 border border-emerald-700/50 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-emerald-400" />
                    <span>Cara Menggunakan Fungsi F1 &amp; F2 (Sektor 4)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-200 leading-relaxed">
                    <li>
                      Klik tab hijau <strong className="text-emerald-300">F1</strong> (atau <strong className="text-purple-300">F2</strong>) di bagian atas area susunan kode.
                    </li>
                    <li>
                      Isi dengan paket perintah berulang (misal <em>Lompat ➔ Ambil Kristal ➔ Lompat</em>).
                    </li>
                    <li>
                      Kembali ke tab <strong className="text-white">Program Utama</strong> lalu klik <code className="px-1.5 py-0.5 bg-slate-800 rounded text-emerald-300">⚙️ Panggil F1()</code> di palet. Jangan panggil <em>F1()</em> di dalam tab <em>F1</em> sendiri!
                    </li>
                  </ol>
                </div>

                <div className="sm:col-span-2 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-orange-400" />
                    <span>Sensor Kondisi (Cek Warna, Halangan &amp; Jika Nilai)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Gunakan <strong>🎨 Cek Warna</strong> (klik label <em>Ubin Biru / Ubin Kuning</em> untuk mengganti target), <strong>🚧 Jika Halangan</strong> (aktif saat ada tebing, jurang, atau laser tepat di depan robot), atau <strong>❓ Jika Nilai</strong> (membandingkan variabel seperti <code>baterai &gt; 3</code>). Klik tombol <strong>+ Else</strong> pada balok kondisi untuk menambahkan jalur alternatif saat syarat tidak terpenuhi!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'MODES' && (
            <div className="space-y-3.5">
              {/* Star Rating System */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5 font-display">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>Sistem Penilaian Bintang (1★ – 3★)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40">
                    <div className="font-bold text-amber-300 mb-0.5">★★★ Optimal (3 Bintang)</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Menyelesaikan misi &amp; semua kristal dengan jumlah balok <strong>kurang atau sama dengan (&le;)</strong> batas <code>Maks. ★</code>.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700">
                    <div className="font-bold text-cyan-300 mb-0.5">★★ Efisien (2 Bintang)</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Misi &amp; kristal tuntas dengan jumlah balok masih dalam batas toleransi efisiensi menengah.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="font-bold text-slate-200 mb-0.5">★ Misi Tuntas (1 Bintang)</div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Berhasil mencapai Terminal Emas dengan semua kristal, namun memakai balok lebih banyak.
                    </p>
                  </div>
                </div>
              </div>

              {/* Extra Modes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-950/70 border border-rose-900/40 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Bug className="w-4 h-4 text-rose-400" />
                    <span>Detektif Bug (Sektor 6)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Kode sudah terisi namun memiliki kesalahan logika. Gunakan <strong>1 Langkah</strong> dan cek tab <strong>F1/F2</strong> serta <strong>Tabel Trace</strong> untuk menemukan baris yang keliru lalu memperbaikinya.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-purple-900/40 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Studio Sandbox</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Rancang sendiri peta tantangan 4×4 hingga 6×6 lengkap dengan tebing, kristal, saklar, laser, dan ubin sensor, lalu uji algoritma buatanmu sendiri!
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-cyan-900/40 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Kostum &amp; Google Cloud</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bintang yang terkumpul membuka kostum robot baru di <strong>Bengkel Kostum</strong>. Gunakan <strong>Masuk Google</strong> bila ingin menyimpan progres belajar.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Buntu di suatu misi? Tekan tombol <strong>Petunjuk</strong> di atas layar untuk tips dari Kodi, atau klik <strong>Contoh Solusi</strong> pada misi pengantar untuk melihat contoh susunan balok yang benar.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/90 shrink-0 text-xs">
          <span className="text-slate-400 hidden sm:inline">
            Tips: Klik tombol <strong>Panduan</strong> kapan saja saat bermain tanpa menghapus kodemu.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            {onStartFirstMission && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onClose();
                  onStartFirstMission();
                }}
                className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl font-semibold text-xs transition-colors"
              >
                Mulai Bermain
              </button>
            )}
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95"
            >
              Saya Mengerti!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
