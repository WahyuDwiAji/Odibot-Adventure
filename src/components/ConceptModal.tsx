import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import {
  X,
  BookOpen,
  Cpu,
  Repeat,
  ListOrdered,
  Boxes,
  GitBranch,
  Bug,
  Code2,
  ShieldCheck,
  Zap,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';

interface ConceptModalProps {
  onClose: () => void;
  activeConceptZoneId?: string;
}

export const ConceptModal: React.FC<ConceptModalProps> = ({ onClose, activeConceptZoneId }) => {
  const [selectedTopic, setSelectedTopic] = useState<string>(
    activeConceptZoneId || 'variabel'
  );

  const topics = [
    {
      id: 'variabel',
      title: '1. Manajemen Memori & State Variabel',
      csConcept: 'Variable Allocation & State Mutation',
      subtitle: 'Bagaimana Komputer Mengingat Data Saat Program Berjalan',
      icon: Cpu,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      badge: 'Fase C · Arsitektur Komputasi',
      thematicStory:
        'Di Stasiun Antariksa Aurora, Kodi membutuhkan alokasi memori RAM untuk mencatat sisa energi baterai dan jumlah kristal reaktor yang telah diamankan.',
      csTheory:
        'Variabel adalah slot memori fisik di dalam RAM (Random Access Memory) yang diberi label nama unik dan menyimpan nilai tertentu. Ketika nilai variabel berubah (misal baterai berkurang dari 5 menjadi 4), proses ini disebut State Mutation.',
      traceTableExample: [
        { step: 'Awal', code: 'baterai = 5; kristal = 0', regBaterai: '5', regKristal: '0', note: 'Inisialisasi memori awal' },
        { step: '1', code: 'kodi.maju()', regBaterai: '4', regKristal: '0', note: 'Baterai termutasi (-1)' },
        { step: '2', code: 'kodi.ambil_kristal()', regBaterai: '4', regKristal: '1', note: 'Akumulator kristal bertambah (+1)' },
      ],
      realWorldCS:
        'Penerapan Nyata: Digunakan di semua game engine (Unity/Unreal) untuk mencatat HP karakter, amunisi, dan skor, serta pada dashboard mobil pintar untuk memantau sisa bahan bakar.',
      pythonSnippets: [
        { label: 'Deklarasi State', code: 'baterai = 5\nkristal_reaktor = 0\nsensor_aktif = True' },
        { label: 'Mutasi Nilai (Decrement & Increment)', code: 'baterai -= 1  # Kodi melangkah 1 petak\nkristal_reaktor += 1  # Mengamankan kristal' },
      ],
    },
    {
      id: 'perulangan',
      title: '2. Siklus Iterasi & Pengenalan Pola',
      csConcept: 'Counted (For) & Conditional (While) Loops',
      subtitle: 'Otomatisasi Algoritma Sesuai Prinsip DRY (Don\'t Repeat Yourself)',
      icon: Repeat,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      badge: 'Fase C · Efisiensi Algoritma',
      thematicStory:
        'Lorong reaktor memiliki 6 petak berulang. Menuliskan instruksi satu per satu membuat kode membengkak dan memboroskan memori CPU!',
      csTheory:
        'Perulangan (Loop) adalah struktur kontrol yang mengeksekusi blok kode berulang kali. Ada dua model utama:\n1. Counted Loop (For): Iterasi dengan batas jumlah pasti (misal: 4 kali putaran).\n2. Conditional Loop (While): Iterasi yang terus berjalan selama kondisi logika bernilai True (misal: Selama baterai > 0). Menghentikan loop saat kondisi False mencegah terjadinya Infinite Loop (Hang).',
      traceTableExample: [
        { step: 'i=0', code: 'kodi.maju()', regBaterai: '4', regKristal: '0', note: 'Iterasi ke-1 selesai' },
        { step: 'i=1', code: 'kodi.maju()', regBaterai: '3', regKristal: '0', note: 'Iterasi ke-2 selesai' },
        { step: 'i=2', code: 'kodi.maju()', regBaterai: '2', regKristal: '0', note: 'Iterasi ke-3 selesai' },
      ],
      realWorldCS:
        'Penerapan Nyata: Mesin pencari Google memeriksa miliaran halaman web menggunakan loop, dan sistem radar autopilot terus memindai objek di depan selama mobil berjalan.',
      pythonSnippets: [
        { label: 'Loop Terhitung (For Loop)', code: 'for langkah in range(4):\n    kodi.maju()\n    kodi.ambil_kristal()' },
        { label: 'Loop Bersyarat (While Sensor)', code: 'while baterai > 0 and not kodi.di_terminal():\n    kodi.maju()\n    baterai -= 1' },
      ],
    },
    {
      id: 'struktur_data',
      title: '3. Arsitektur Struktur Data List / Array',
      csConcept: 'Linear Data Structures, Buffers & Indexing',
      subtitle: 'Menyimpan & Memproses Antrean Data Terurut',
      icon: ListOrdered,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      badge: 'Fase C · Struktur Data Komputer',
      thematicStory:
        'Pangkalan Bumi mengirimkan paket rute terenkripsi ke buffer satelit Kodi: antrean perintah harus dibaca berurutan sesuai nomor indeks.',
      csTheory:
        'List atau Array adalah struktur data linier yang menyimpan sekumpulan elemen data di lokasi memori yang berdampingan. Setiap elemen memiliki alamat nomor urut unik yang disebut indeks (dimulai dari indeks 0). Menelusuri seluruh data dalam list satu per satu disebut proses Traversal.',
      traceTableExample: [
        { step: 'Indeks 0', code: 'rute[0] == "MAJU"', regBaterai: '4', regKristal: '0', note: 'Eksekusi elemen pertama' },
        { step: 'Indeks 1', code: 'rute[1] == "LOMPAT"', regBaterai: '4', regKristal: '0', note: 'Eksekusi elemen kedua' },
        { step: 'Indeks 2', code: 'rute[2] == "AMBIL"', regBaterai: '4', regKristal: '1', note: 'Eksekusi elemen ketiga' },
      ],
      realWorldCS:
        'Penerapan Nyata: Antrean transmisi paket data internet (Network Packet Buffer), daftar antrean lagu di Spotify, dan daftar koordinat waypoint penerbangan maskapai komersial.',
      pythonSnippets: [
        { label: 'Inisialisasi Buffer List', code: 'antrean_rute = ["MAJU", "LOMPAT", "PUTAR_KANAN", "AMBIL"]\nprint(antrean_rute[0])  # Output: "MAJU"' },
        { label: 'Traversal Seluruh List', code: 'for perintah in antrean_rute:\n    jalankan_perintah(perintah)' },
      ],
    },
    {
      id: 'fungsi',
      title: '4. Dekomposisi & Fungsi Modular',
      csConcept: 'Procedural Abstraction & Code Reusability',
      subtitle: 'Memecah Masalah Kompleks Menjadi Modul-Modul Pintas',
      icon: Boxes,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      badge: 'Fase C · Rekayasa Perangkat Lunak',
      thematicStory:
        'Manuver menghindari perangkap laser membutuhkan 4 langkah rumit: Lompat -> Belok -> Ambil -> Putar Balik. Daripada mengulanginya berkali-kali, bungkus ke dalam Fungsi F1!',
      csTheory:
        'Dekomposisi adalah pilar Berpikir Komputasional untuk memecah masalah besar menjadi tugas-tugas kecil yang mandiri. Fungsi (Subrutin / Prosedur) mengemas sekumpulan baris kode menjadi satu nama panggilan tunggal (F1 / F2). Ini menciptakan abstraksi dan memungkinkan kode digunakan berulang kali (Reusability).',
      traceTableExample: [
        { step: 'Call F1()', code: 'F1() -> Eksekusi 3 sub-langkah', regBaterai: '3', regKristal: '1', note: 'Masuk subrutin F1' },
        { step: 'Call F1()', code: 'F1() -> Eksekusi 3 sub-langkah', regBaterai: '2', regKristal: '2', note: 'Menggunakan kembali F1' },
      ],
      realWorldCS:
        'Penerapan Nyata: Aplikasi seperti WhatsApp memanggil fungsi `kirim_pesan()` jutaan kali dari berbagai tombol tanpa perlu menulis ulang logika jaringan dari awal.',
      pythonSnippets: [
        { label: 'Deklarasi Fungsi F1', code: 'def F1_manuver_reaktor():\n    kodi.lompat()\n    kodi.putar_kanan()\n    kodi.ambil_kristal()' },
        { label: 'Pemanggilan di Program Utama', code: '# Program Utama\nfor i in range(3):\n    F1_manuver_reaktor()' },
      ],
    },
    {
      id: 'logika',
      title: '5. Gerbang Logika & Percabangan Keputusan',
      csConcept: 'Boolean Logic, Conditionals & Decision Trees',
      subtitle: 'Kecerdasan Buatan (AI) Berbasis Evaluasi Sensor',
      icon: GitBranch,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      badge: 'Fase C · Logika Komputasional',
      thematicStory:
        'Gerbang keamanan reaktor dilindungi laser berdaya tinggi. Kodi harus mengevaluasi sinyal sensor saklar: jika laser nonaktif, maju; jika aktif, injak saklar pengaman!',
      csTheory:
        'Percabangan (If-Else) memungkinkan komputer mengevaluasi suatu kondisi Boolean (True atau False) dan mengambil rute eksekusi yang berbeda. Dengan gerbang logika (AND, OR, NOT), robot dapat memproses multi-kondisi lingkungan secara cerdas layaknya pohon keputusan (Decision Tree).',
      traceTableExample: [
        { step: 'Sensor Check', code: 'if ubin == "KUNING":', regBaterai: '4', regKristal: '0', note: 'Kondisi bernilai TRUE' },
        { step: 'Cabang True', code: 'kodi.putar_kanan()', regBaterai: '4', regKristal: '0', note: 'Eksekusi blok percabangan' },
      ],
      realWorldCS:
        'Penerapan Nyata: Sistem pengereman darurat otomatis (AEB) pada mobil listrik yang memeriksa sensor kamera DAN radar jarak sebelum memutuskan menginjak rem otomatis.',
      pythonSnippets: [
        { label: 'Percabangan Sensor Warna', code: 'if sensor_lantai == "KUNING":\n    kodi.putar_kanan()\nelse:\n    kodi.maju()' },
        { label: 'Logika Multi-Syarat (AND / OR)', code: 'if baterai > 0 and not sensor_rintangan:\n    kodi.maju()\nelif sensor_rintangan:\n    kodi.lompat()' },
      ],
    },
    {
      id: 'debugging',
      title: '6. Laboratorium Forensik & Debugging Siber',
      csConcept: 'Code Debugging, Trace Tables & Unit Testing',
      subtitle: 'Menganalisis Crash Dump & Memperbaiki Kesalahan Algoritma',
      icon: Bug,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      badge: 'Fase C · Rekayasa Kualitas Perangkat Lunak',
      thematicStory:
        'Transmisi kode robot mengalami distorsi kosmik! Kodi terjebak menabrak dinding atau berputar di tempat. Temukan bug dalam program dan perbaiki baris logikanya!',
      csTheory:
        'Bug adalah cacat atau kesalahan logika dalam kode program yang menyebabkan hasil tidak sesuai harapan atau program terhenti (crash). Proses Debugging melibatkan: 1. Mereproduksi error, 2. Melacak nilai variabel menggunakan Tabel Trace, 3. Mengidentifikasi akar masalah (seperti Off-by-One error), dan 4. Memverifikasi perbaikan dengan pengujian ulang.',
      traceTableExample: [
        { step: 'Deteksi Bug', code: 'kodi.maju() 5 kali', regBaterai: '0', regKristal: '0', note: 'ERROR: Out of bounds (jurang)' },
        { step: 'Solusi Forensik', code: 'kodi.maju() 3x + putar', regBaterai: '2', regKristal: '1', note: 'STATUS: Normal & Berhasil' },
      ],
      realWorldCS:
        'Penerapan Nyata: Profesi Software Quality Assurance (QA) dan Cybersecurity Forensic Investigator yang memastikan kode aplikasi bank atau pesawat 100% bebas dari celah bug fatal.',
      pythonSnippets: [
        { label: 'Kode Rusak (Buggy Code)', code: '# BUG: Loop berlebih menyebabkan robot jatuh\nfor i in range(10):  # Salah batas!\n    kodi.maju()' },
        { label: 'Kode Bersih (Debugged Code)', code: '# PERBAIKAN: Batasi loop sesuai panjang lintasan\nfor i in range(4):\n    kodi.maju()\nkodi.ambil_kristal()' },
      ],
    },
  ];

  const currentTopic = topics.find((t) => t.id === selectedTopic) || topics[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display text-white">
                  Pusat Kurikulum Komputasi Siswa SD Kelas 6
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  Fase C · Kurikulum Merdeka
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pondasi ilmu komputer nyata: Alokasi RAM, Algoritma Iterasi, Struktur Data Antrean, Dekomposisi & Forensik Bug
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Tutup Jendela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="flex-1 flex flex-col md:grid md:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Topic Selector (4 Cols) */}
          <div className="md:col-span-4 p-3 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/50 overflow-y-auto space-y-1.5 shrink-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>6 Pilar Berpikir Komputasional:</span>
            </div>

            {topics.map((t) => {
              const ItemIcon = t.icon;
              const isSelected = t.id === selectedTopic;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedTopic(t.id);
                  }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-slate-800 border border-cyan-500/50 shadow-md text-white'
                      : 'hover:bg-slate-850 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${t.color}`}>
                    <ItemIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{t.title}</div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">{t.csConcept}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Concept Detail Deck (8 Cols) */}
          <div className="md:col-span-8 p-5 overflow-y-auto bg-slate-900 flex flex-col space-y-4">
            {/* Header of Active Concept */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  {currentTopic.csConcept}
                </span>
                <h3 className="text-lg font-bold text-white font-display mt-0.5">
                  {currentTopic.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {currentTopic.subtitle}
                </p>
              </div>
              <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${currentTopic.color}`}>
                <Zap className="w-3.5 h-3.5" />
                <span>{currentTopic.badge}</span>
              </div>
            </div>

            {/* Thematic Story Context */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-cyan-200">
              <span className="font-bold text-cyan-400 uppercase tracking-wider text-[10px] block mb-1">
                Konteks Misi Stasiun Aurora:
              </span>
              <p className="text-slate-300 leading-relaxed font-sans">
                {currentTopic.thematicStory}
              </p>
            </div>

            {/* In-depth CS Theory */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Teori Ilmu Komputer (Computer Science):</span>
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 font-sans">
                {currentTopic.csTheory}
              </p>
            </div>

            {/* Trace Table Demonstration (Penelusuran Memori) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tabel Penelusuran Memori (Trace Table):</span>
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">Metode Standar Olimpiade Informatika</span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px]">
                      <th className="py-1.5 px-3">Langkah</th>
                      <th className="py-1.5 px-3">Kode Program</th>
                      <th className="py-1.5 px-3">Reg. Baterai</th>
                      <th className="py-1.5 px-3">Reg. Kristal</th>
                      <th className="py-1.5 px-3">Catatan Tracing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTopic.traceTableExample.map((tr, idx) => (
                      <tr key={idx} className="border-b border-slate-900 text-slate-300 text-[11px] hover:bg-slate-900/40">
                        <td className="py-1.5 px-3 text-cyan-400">{tr.step}</td>
                        <td className="py-1.5 px-3 text-white font-bold">{tr.code}</td>
                        <td className="py-1.5 px-3 text-amber-300">{tr.regBaterai}</td>
                        <td className="py-1.5 px-3 text-emerald-300">{tr.regKristal}</td>
                        <td className="py-1.5 px-3 text-slate-400 font-sans">{tr.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Python Code Snippets */}
            <div>
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-mono">
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Implementasi Sintaks Python Standar:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentTopic.pythonSnippets.map((ex, i) => (
                  <div key={i} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="text-[11px] font-semibold text-slate-400 mb-1">
                      {ex.label}
                    </div>
                    <pre className="font-mono text-xs text-cyan-300 bg-slate-900 p-2.5 rounded border border-slate-800/60 overflow-x-auto whitespace-pre">
                      {ex.code}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Real World CS Application */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-900/40 text-xs text-emerald-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{currentTopic.realWorldCS}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/90 shrink-0 text-xs text-slate-400">
          <span className="hidden sm:inline">
            Disusun untuk Capaian Pembelajaran Informatika Fase C (SD Kelas 5 & 6).
          </span>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 ml-auto"
          >
            Terapkan di Lab Misi!
          </button>
        </div>
      </div>
    </div>
  );
};
