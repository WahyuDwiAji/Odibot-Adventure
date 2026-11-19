import { LevelDefinition } from '../types/game';

export type FeatureGuideId =
  | 'JUMP'
  | 'TOGGLE_SWITCH'
  | 'REPEAT'
  | 'WHILE_VAR'
  | 'READ_LIST'
  | 'F1'
  | 'F2'
  | 'IF_COLOR'
  | 'IF_OBSTACLE'
  | 'IF_VAR'
  | 'IF_ELSE'
  | 'DEBUG_MODE';

export type FeatureSpotlightTarget =
  | 'f1-tab'
  | 'f2-tab'
  | 'workspace'
  | 'arena'
  | 'playback';

export interface FeatureGuideDefinition {
  id: FeatureGuideId;
  badge: string;
  title: string;
  summary: string;
  steps: string[];
  example?: string;
  tip: string;
  spotlightTarget: FeatureSpotlightTarget;
  mobileTab: 'ARENA' | 'CODE';
  accentColor: 'cyan' | 'emerald' | 'purple' | 'blue' | 'amber' | 'rose';
}

export const FEATURE_GUIDES: Record<FeatureGuideId, FeatureGuideDefinition> = {
  JUMP: {
    id: 'JUMP',
    badge: 'Fitur Baru · Gerak Vertikal',
    title: 'Cara Menggunakan Lompat Tebing',
    summary:
      'Platform di stasiun tidak selalu datar! Gunakan balok 🦘 Lompat Tebing untuk naik atau turun tebing dengan selisih ketinggian 1 meter (Z+1 / Z-1).',
    steps: [
      'Berhenti tepat di depan ubin tebing yang lebih tinggi (+1m) atau lebih rendah (-1m).',
      'Pasang balok 🦘 Lompat Tebing di palet Gerak (jangan memakai Maju 1 Petak karena Odibot akan menabrak!).',
      'Jika ingin turun kembali ke lantai dasar (Z=0), gunakan 🦘 Lompat Tebing sekali lagi.',
    ],
    example: 'Maju ➔ Lompat Tebing (naik Z=1) ➔ Ambil Kristal ➔ Lompat Tebing (turun Z=0)',
    tip: 'Lompat hanya bisa melewati beda tinggi 1 tingkat (+1m). Dinding +2m tidak dapat dilompati.',
    spotlightTarget: 'workspace',
    mobileTab: 'CODE',
    accentColor: 'blue',
  },

  TOGGLE_SWITCH: {
    id: 'TOGGLE_SWITCH',
    badge: 'Fitur Baru · Saklar & Laser',
    title: 'Cara Mematikan Gerbang Laser',
    summary:
      'Gerbang laser merah berbahaya akan menyengat Odibot jika dilewati saat aktif. Kamu harus menginjak dan menekan tombol saklar terlebih dahulu.',
    steps: [
      'Arahkan Odibot berjalan tepat ke atas ubin Saklar (ubin dengan bulatan tombol di tengah).',
      'Pasang balok ⚡ Saklar Laser tepat saat Odibot berada di atas ubin saklar tersebut.',
      'Setelah laser merah berubah padam (gelap), Odibot aman melewatinya menuju kristal dan portal!',
    ],
    example: 'Maju ke ubin Saklar ➔ ⚡ Saklar Laser ➔ Lanjutkan jalan melewati bekas laser',
    tip: 'Jangan menekan ⚡ Saklar Laser dua kali di tempat yang sama karena laser akan menyala kembali.',
    spotlightTarget: 'workspace',
    mobileTab: 'CODE',
    accentColor: 'amber',
  },

  REPEAT: {
    id: 'REPEAT',
    badge: 'Fitur Baru · Perulangan For',
    title: 'Cara Menggunakan Blok Ulangi (Loop)',
    summary:
      'Hemat jumlah balok dengan membungkus pola perintah yang berulang ke dalam blok 🔁 Ulangi (Loop).',
    steps: [
      'Klik balok ungu 🔁 Ulangi (Loop) di palet. Kotak loop akan menyala kuning (Mode Isi Blok aktif).',
      'Klik balok perintah di palet (misalnya Maju & Lompat) untuk memasukkannya ke dalam kotak loop, lalu atur angka jumlah ulangan dengan tombol - / +.',
      'Setelah isi loop selesai, tekan tombol kuning ✓ Selesai Isi agar balok berikutnya berada di luar loop.',
    ],
    example: 'Ulangi (2x) { Maju ➔ Lompat ➔ Ambil Kristal } lalu Maju ➔ Lompat',
    tip: 'Perhatikan bingkai kuning pada kotak loop! Selama masih aktif, balok yang diklik akan masuk ke dalam loop.',
    spotlightTarget: 'workspace',
    mobileTab: 'CODE',
    accentColor: 'purple',
  },

  WHILE_VAR: {
    id: 'WHILE_VAR',
    badge: 'Fitur Baru · Perulangan While',
    title: 'Cara Menggunakan Selama (While)',
    summary:
      'Blok 🔁 Selama (While) akan terus mengulang perintah di dalamnya selama syarat variabel (seperti sisa baterai) masih bernilai Benar.',
    steps: [
      'Klik balok 🔁 Selama (While) di palet. Atur operator (>, >=, ==, <) dan angka batasnya langsung pada kartu balok (misal: baterai > 0).',
      'Selama bingkai kuning aktif, masukkan balok perintah (misal Maju 1 Petak dan Ambil Kristal) ke dalam kotak loop.',
      'Klik ✓ Selesai Isi jika ingin menambah perintah lanjutan setelah perulangan berhenti.',
    ],
    example: 'Selama (baterai > 0) { Maju 1 Petak ➔ Ambil Kristal }',
    tip: 'Pastikan ada balok Maju 1 Petak di dalam loop agar nilai baterai berkurang dan perulangan dapat berhenti!',
    spotlightTarget: 'workspace',
    mobileTab: 'CODE',
    accentColor: 'purple',
  },

  READ_LIST: {
    id: 'READ_LIST',
    badge: 'Fitur Baru · Struktur Data List',
    title: 'Cara Menggunakan Baca List Rute',
    summary:
      'Misi ini menyediakan daftar instruksi siap pakai (Array/List) yang ditampilkan di HUD atas layar arena (misalnya daftar_rute=[MAJU, ...]).',
    steps: [
      'Baca urutan perintah yang tersimpan pada daftar di bilah atas Arena Robot.',
      'Klik balok 📋 Baca List Rute di palet untuk mengeksekusi seluruh isi daftar secara berurutan dari indeks [0] hingga akhir.',
      'Jika daftar hanya mengantar sebagian jalan atau membentuk pola berulang, sambung dengan perintah tambahan atau masukkan Baca List Rute ke dalam Loop!',
    ],
    example: 'Baca List Rute (daftar_rute) ➔ sambung gerakan lanjutan bila diperlukan',
    tip: 'Kamu bisa menaruh 📋 Baca List Rute di dalam blok 🔁 Ulangi atau 🔁 Selama untuk mengulang paket rute berkali-kali!',
    spotlightTarget: 'workspace',
    mobileTab: 'CODE',
    accentColor: 'blue',
  },

  F1: {
    id: 'F1',
    badge: 'Fitur Baru · Fungsi Modular',
    title: 'Cara Menggunakan Fungsi F1()',
    summary:
      'Fungsi F1() adalah tempat menyimpan "paket gerakan khusus" buatanmu sendiri agar bisa dipanggil berkali-kali tanpa menyusun ulang balok yang sama!',
    steps: [
      'Klik tab hijau F1 di bagian atas Workspace (di sebelah kanan tab Program Utama) untuk mengisi resep perintah fungsi.',
      'Susun pola gerakan yang berulang di dalam tab F1 (contoh: Lompat Tebing ➔ Ambil Kristal ➔ Lompat Tebing).',
      'Klik kembali tab Program Utama, lalu klik ⚙️ Panggil F1() di palet setiap kali kamu ingin menjalankan paket perintah F1 tersebut.',
    ],
    example: 'Tab F1: [Lompat ➔ Ambil ➔ Lompat]  |  Program Utama: [Panggil F1() ➔ Maju ➔ Panggil F1() ➔ Maju]',
    tip: 'Jangan memanggil Panggil F1() di dalam tab F1 sendiri agar tidak terjadi perulangan tanpa akhir (infinite recursion).',
    spotlightTarget: 'f1-tab',
    mobileTab: 'CODE',
    accentColor: 'emerald',
  },

  F2: {
    id: 'F2',
    badge: 'Fitur Baru · Subrutin Ganda',
    title: 'Cara Menggunakan Fungsi F2()',
    summary:
      'Sekarang kamu punya dua fungsi terpisah: F1 dan F2! Pisahkan tugas berbeda ke masing-masing tab agar program utamamu sangat ringkas dan rapi.',
    steps: [
      'Gunakan tab hijau F1 untuk satu tugas khusus (misalnya naik tebing & ambil kristal).',
      'Klik tab ungu F2 di atas Workspace untuk membuat tugas kedua yang berbeda (misalnya belok tikungan atau menyalakan saklar).',
      'Kembali ke tab Program Utama, lalu kombinasikan ⚙️ Panggil F1() dan ⚙️ Panggil F2() sesuai urutan lintasan.',
    ],
    example: 'F1 = Aksi Kristal Tebing · F2 = Manuver Saklar/Belokan · Utama = Panggil F1() & F2()',
    tip: 'Dengan membagi peran F1 dan F2, kamu cukup memperbaiki satu tab kecil jika suatu pola bermasalah.',
    spotlightTarget: 'f2-tab',
    mobileTab: 'CODE',
    accentColor: 'purple',
  },

  IF_COLOR: {
    id: 'IF_COLOR',
    badge: 'Fitur Baru · Sensor Spektrum',
    title: 'Cara Menggunakan Cek Warna',
    summary:
      'Blok 🎨 Cek Warna membaca warna ubin tepat di bawah kaki Odibot (Biru atau Kuning) dan hanya menjalankan aksi di dalamnya jika warnanya cocok.',
    steps: [
      'Klik balok 🎨 Cek Warna di palet. Klik tombol warna pada kartu balok (Ubin Biru / Ubin Kuning) untuk memilih target warna.',
      'Masukkan perintah yang ingin dijalankan saat warna cocok ke dalam kotak JIKA (misal: Ubin Biru ➔ Lompat, atau Ubin Kuning ➔ Ambil Kristal).',
      'Klik ✓ Selesai Isi setelah selesai mengisi blok kondisi, atau bungkus di dalam Loop agar sensor mengecek tiap langkah.',
    ],
    example: 'Jika di Ubin Biru { Lompat Tebing }',
    tip: 'Sensor Cek Warna memeriksa ubin tempat Odibot berdiri saat ini, bukan ubin di depannya.',
    spotlightTarget: 'workspace',
    mobileTab: 'CODE',
    accentColor: 'amber',
  },

  IF_OBSTACLE: {
    id: 'IF_OBSTACLE',
    badge: 'Fitur Baru · Radar Ultrasonik',
    title: 'Cara Menggunakan Jika Halangan',
    summary:
      'Blok 🚧 Jika Halangan menyalakan sensor depan Odibot untuk mendeteksi tebing yang menghalangi, laser aktif, atau tepi jurang tepat 1 langkah di depan.',
    steps: [
      'Klik balok 🚧 Jika Halangan di palet untuk menambahkannya ke susunan kode.',
      'Masukkan aksi penghindaran ke dalamnya (misal Putar Kanan atau Putar Kiri) saat jalur depan terhalang.',
      'Klik ✓ Selesai Isi, lalu letakkan Maju 1 Petak setelah blok kondisi (atau gabungkan dalam Loop) agar Odibot terus melaju di jalur aman.',
    ],
    example: 'Ulangi { Jika Halangan { Putar Kanan } ➔ Maju 1 Petak }',
    tip: 'Jika Halangan mendeteksi jurang, tebing berbeda tinggi, maupun laser menyala tepat di depan mata Odibot.',
    spotlightTarget: 'workspace',
    mobileTab: 'CODE',
    accentColor: 'amber',
  },

  IF_VAR: {
    id: 'IF_VAR',
    badge: 'Fitur Baru · Kondisi Variabel',
    title: 'Cara Menggunakan Jika Nilai (Variabel)',
    summary:
      'Blok ❓ Jika Nilai membandingkan isi variabel (seperti baterai) dengan angka tertentu untuk mengambil keputusan otomatis.',
    steps: [
      'Klik balok ❓ Jika Nilai di palet, lalu atur operator (<, >, ==, >=) dan angka pembanding pada kartu balok (misal baterai < 4).',
      'Masukkan perintah yang dijalankan saat syarat tersebut terpenuhi ke dalam kotak kondisinya.',
      'Kamu bisa menaruh ❓ Jika Nilai di dalam Cek Warna untuk membentuk syarat ganda Logika AND (Dua syarat harus benar sekaligus!).',
    ],
    example: 'Jika di Ubin Kuning { Ambil Kristal ➔ Jika (baterai < 4) { Putar Kanan } }',
    tip: 'Pantau angka baterai di HUD atas agar kamu tahu tepat berapa nilainya di setiap petak.',
    spotlightTarget: 'workspace',
    mobileTab: 'CODE',
    accentColor: 'amber',
  },

  IF_ELSE: {
    id: 'IF_ELSE',
    badge: 'Fitur Baru · Percabangan Dua Arah',
    title: 'Cara Menggunakan Cabang + Else',
    summary:
      'Selain menjalankan aksi saat syarat Benar (JIKA), kamu dapat menekan tombol + Else untuk menentukan aksi alternatif saat syarat bernilai Salah!',
    steps: [
      'Pada balok kondisi (🚧 Jika Halangan, 🎨 Cek Warna, atau ❓ Jika Nilai), klik tombol kecil + Else di sebelah kanan judul balok.',
      'Kotak baru berwarna ungu/oranye bertuliskan ELSE (Jika Tidak) akan muncul. Klik kotak tersebut (atau tombol + di dalamnya) untuk mulai mengisi.',
      'Masukkan aksi alternatif ke dalam cabang ELSE, lalu tekan ✓ Selesai Isi jika ingin menambah balok di bawahnya.',
    ],
    example: 'Jika Halangan { Putar Kanan ➔ Maju } ELSE { Maju ➔ Ambil Kristal }',
    tip: 'Dalam If-Else, hanya salah satu cabang (JIKA atau ELSE) yang dijalankan pada tiap pemeriksaan.',
    spotlightTarget: 'workspace',
    mobileTab: 'CODE',
    accentColor: 'amber',
  },

  DEBUG_MODE: {
    id: 'DEBUG_MODE',
    badge: 'Fitur Baru · Laboratorium Forensik',
    title: 'Cara Mengerjakan Misi Cari Bug (Debugging)',
    summary:
      'Kode di workspace sudah terisi, tetapi mengandung kesalahan logika (bug)! Tugasmu adalah melacak penyebab gagalnya lalu memperbaikinya.',
    steps: [
      'Tekan tombol Langkah Demi Langkah (atau 1 Langkah di HP) berulang kali untuk melihat gerak Odibot instruksi demi instruksi.',
      'Buka juga tab F1 / F2 (jika tersedia) dan Inspektor Memori & Trace di bawah arena untuk menemukan baris mana yang keliru arah, kurang perintah, atau salah angka.',
      'Ubah langsung balok yang salah (ganti putaran, ubah angka loop, sisipkan saklar, atau geser urutan ▲ ▼), lalu jalankan ulang sampai sukses!',
    ],
    example: 'Uji dengan 1 Langkah ➔ Temukan langkah yang jatuh/terlewat ➔ Perbaiki balok terkait',
    tip: 'Jika ingin mengembalikan susunan kode awal yang bermasalah, klik tombol Contoh Solusi.',
    spotlightTarget: 'playback',
    mobileTab: 'ARENA',
    accentColor: 'rose',
  },
};

/**
 * Mengembalikan daftar fitur relevan untuk level ini secara terurut (fitur utama sektor didahulukan).
 */
export function getLevelFeatureGuides(level: LevelDefinition): FeatureGuideDefinition[] {
  const orderedIds: FeatureGuideId[] = [];
  const pushUnique = (id: FeatureGuideId) => {
    if (!orderedIds.includes(id)) orderedIds.push(id);
  };

  // Prioritize sector headline features first so they appear immediately
  if (level.isDebuggingChallenge) pushUnique('DEBUG_MODE');
  if (level.allowF1) pushUnique('F1');
  if (level.allowF2) pushUnique('F2');

  const isIfElseLevel =
    level.id === 'lvl-5-11' ||
    level.id === 'lvl-5-12' ||
    level.id === 'lvl-5-13' ||
    level.id === 'lvl-5-14' ||
    level.hint.includes('+ Else');
  if (isIfElseLevel) pushUnique('IF_ELSE');

  if (level.allowedCommands.includes('READ_LIST')) pushUnique('READ_LIST');
  if (level.allowedCommands.includes('WHILE_VAR')) pushUnique('WHILE_VAR');
  if (level.allowedCommands.includes('REPEAT')) pushUnique('REPEAT');
  if (level.allowedCommands.includes('IF_COLOR')) pushUnique('IF_COLOR');
  if (level.allowedCommands.includes('IF_OBSTACLE')) pushUnique('IF_OBSTACLE');
  if (level.allowedCommands.includes('IF_VAR')) pushUnique('IF_VAR');
  if (level.allowedCommands.includes('TOGGLE_SWITCH')) pushUnique('TOGGLE_SWITCH');
  if (level.allowedCommands.includes('JUMP')) pushUnique('JUMP');

  return orderedIds.map((id) => FEATURE_GUIDES[id]);
}
