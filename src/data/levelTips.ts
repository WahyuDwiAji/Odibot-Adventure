import { LevelDefinition } from '../types/game';

export type LevelTipConceptId =
  | 'SEQUENTIAL_STATE'
  | 'FOR_LOOP'
  | 'WHILE_LOOP'
  | 'LISTS'
  | 'FUNCTIONS'
  | 'CONDITIONALS'
  | 'IF_ELSE'
  | 'DEBUGGING';

export interface LevelTipStep {
  stepTitle: string;
  instruction: string;
  codePreview?: string;
}

export interface LevelTipGuide {
  conceptId: LevelTipConceptId;
  conceptLabel: string;
  title: string;
  intro: string;
  failureDiagnosis?: string;
  accentColor: 'cyan' | 'purple' | 'blue' | 'emerald' | 'amber' | 'rose';
  steps: LevelTipStep[];
  commonMistakes: string[];
  levelHint: string;
  debugNote?: string;
}

function diagnoseFailureReason(reason?: string | null): string | undefined {
  if (!reason) return undefined;
  const lower = reason.toLowerCase();

  if (lower.includes('jurang') || lower.includes('jatuh')) {
    return 'Odibot keluar dari jalur atau masuk jurang. Hitung ulang jumlah langkah maju dan arah hadap sebelum berbelok.';
  }
  if (lower.includes('tebing') || lower.includes('dinding')) {
    return 'Ada perbedaan ketinggian lantai (+1m / -1m). Gunakan balok Lompat Tebing, bukan Maju 1 Petak.';
  }
  if (lower.includes('laser')) {
    return 'Odibot menyentuh gerbang laser aktif. Pastikan Odibot menginjak ubin Saklar dan menekan Saklar Laser terlebih dahulu.';
  }
  if (lower.includes('baterai') || lower.includes('energi')) {
    return 'Energi baterai habis di tengah perjalanan. Kurangi langkah memutar dan manfaatkan Loop atau Fungsi agar jalur lebih singkat.';
  }
  if (lower.includes('kristal')) {
    return 'Odibot sudah berjalan, tetapi masih ada kristal yang terlewat. Pastikan Odibot berhenti tepat di atas ubin kristal dan menjalankan Ambil Kristal.';
  }
  if (lower.includes('terminal emas') || lower.includes('tujuan')) {
    return 'Perintah selesai dijalankan sebelum Odibot mencapai ubin Terminal Emas. Tambahkan langkah terakhir atau periksa arah tujuan.';
  }
  if (lower.includes('rekursi') || lower.includes('infinite') || lower.includes('tak terbatas')) {
    return 'Program terjebak perulangan tanpa henti. Pastikan syarat While berubah atau Fungsi F1/F2 tidak memanggil dirinya sendiri terus-menerus.';
  }
  return reason;
}

export function detectLevelTipConcept(level: LevelDefinition): LevelTipConceptId {
  if (level.isDebuggingChallenge) {
    return 'DEBUGGING';
  }

  const isIfElseLevel =
    level.id === 'lvl-5-11' ||
    level.id === 'lvl-5-12' ||
    level.id === 'lvl-5-13' ||
    level.id === 'lvl-5-14' ||
    level.hint.includes('+ Else');
  if (isIfElseLevel) {
    return 'IF_ELSE';
  }

  if (level.allowF1 || level.allowF2) {
    return 'FUNCTIONS';
  }

  if (level.allowedCommands.includes('WHILE_VAR')) {
    return 'WHILE_LOOP';
  }

  if (level.allowedCommands.includes('REPEAT')) {
    return 'FOR_LOOP';
  }

  if (level.allowedCommands.includes('READ_LIST')) {
    return 'LISTS';
  }

  if (
    level.allowedCommands.includes('IF_COLOR') ||
    level.allowedCommands.includes('IF_OBSTACLE') ||
    level.allowedCommands.includes('IF_VAR')
  ) {
    return 'CONDITIONALS';
  }

  return 'SEQUENTIAL_STATE';
}

export function getLevelTipGuide(
  level: LevelDefinition,
  lastFailureReason?: string | null
): LevelTipGuide {
  const conceptId = detectLevelTipConcept(level);
  const failureDiagnosis = diagnoseFailureReason(lastFailureReason);

  switch (conceptId) {
    case 'FOR_LOOP':
      return {
        conceptId,
        conceptLabel: 'Perulangan (Loop)',
        title: 'Panduan Langkah demi Langkah: Konsep Perulangan (Loop)',
        intro:
          'Saat rute punya pola gerakan yang diulang berkali-kali, blok Ulangi (Loop) membuat program jauh lebih singkat dan mudah dicek.',
        failureDiagnosis,
        accentColor: 'purple',
        steps: [
          {
            stepTitle: 'Temukan Pola yang Berulang',
            instruction:
              'Perhatikan arena dari posisi awal Odibot menuju kristal dan Terminal Emas. Kelompokkan langkah yang persis sama berulang kali (misalnya maju 2x lalu ambil kristal).',
            codePreview: 'Pola berulang: [Maju ➔ Lompat ➔ Ambil Kristal]',
          },
          {
            stepTitle: 'Hitung Jumlah Pengulangan yang Tepat',
            instruction:
              'Hitung berapa kali pola tersebut muncul di lintasan (2x, 3x, atau 4x). Ingat: jika satu petak saja kelebihan, Odibot bisa menabrak atau jatuh ke jurang.',
            codePreview: 'Ulangi (3x) { ... }  // cukup 3 kali, bukan 4 kali',
          },
          {
            stepTitle: 'Isi Blok ke Dalam Kotak Loop & Tutup Mode Isi',
            instruction:
              'Klik Ulangi di palet, lalu tambahkan perintah selama bingkai kuning aktif. Setelah selesai mengisi loop, klik ✓ Selesai Isi agar perintah setelahnya diletakkan di luar loop.',
            codePreview: 'Ulangi (3x) { Maju ➔ Ambil } ➔ Maju ke Terminal',
          },
          {
            stepTitle: 'Uji dengan Mode 1 Langkah',
            instruction:
              'Tekan tombol Langkah Demi Langkah untuk melihat urutan putaran ke-1, ke-2, dan ke-3 agar langsung terlihat di iterasi mana posisi Odibot meleset.',
          },
        ],
        commonMistakes: [
          'Lupa menekan ✓ Selesai Isi sehingga langkah terakhir ikut terulang berkali-kali.',
          'Salah menghitung jumlah ulangan (Off-by-One: kurang 1 atau lebih 1 kali).',
          'Menaruh perintah belok di dalam loop padahal belokan hanya dibutuhkan sekali di ujung jalur.',
        ],
        levelHint: level.hint,
        debugNote: level.debugExplanation,
      };

    case 'WHILE_LOOP':
      return {
        conceptId,
        conceptLabel: 'Perulangan Bersyarat (While)',
        title: 'Panduan Langkah demi Langkah: Loop Bersyarat (While)',
        intro:
          'Berbeda dari Ulangi yang memakai angka pasti, loop Selama (While) berjalan terus selama syarat variabel masih benar.',
        failureDiagnosis,
        accentColor: 'purple',
        steps: [
          {
            stepTitle: 'Cek Nilai Awal Variabel di HUD Atas',
            instruction:
              'Lihat angka variabel (misal baterai=4) di bilah atas arena. Ingat bahwa setiap langkah Maju 1 Petak mengurangi nilai baterai sebesar 1.',
            codePreview: 'Awal: baterai = 4  ➔  4 kali Maju membuat baterai = 0',
          },
          {
            stepTitle: 'Pilih Syarat Berhenti yang Tepat',
            instruction:
              'Pada balok Selama, atur operator dan nilai batasnya (misalnya baterai > 0 atau baterai >= 2) sesuai titik di mana Odibot harus berhenti.',
            codePreview: 'Selama (baterai > 0) { ... }',
          },
          {
            stepTitle: 'Pastikan Ada Aksi Pengubah State di Dalam Loop',
            instruction:
              'Di dalam kotak Selama, sertakan perintah yang mengubah variabel (seperti Maju 1 Petak) agar suatu saat syaratnya menjadi Salah dan loop berhenti.',
            codePreview: 'Selama (baterai > 0) { Maju ➔ Ambil Kristal }',
          },
          {
            stepTitle: 'Tambahkan Aksi Lanjutan di Luar Loop',
            instruction:
              'Klik ✓ Selesai Isi setelah loop selesai, lalu tambahkan belokan, lompatan, atau jalan terakhir menuju Terminal Emas.',
          },
        ],
        commonMistakes: [
          'Syarat While salah tanda (> tertukar dengan >= atau <), menyebabkan sisa 1 langkah berlebih/kurang.',
          'Tidak ada perintah Maju di dalam loop sehingga kondisi tidak pernah berubah (infinite loop).',
          'Lupa keluar dari kotak loop sebelum menambah aksi menuju portal.',
        ],
        levelHint: level.hint,
        debugNote: level.debugExplanation,
      };

    case 'IF_ELSE':
      return {
        conceptId,
        conceptLabel: 'Percabangan If-Else',
        title: 'Panduan Langkah demi Langkah: Logika If-Else',
        intro:
          'Struktur If-Else memilih satu dari dua jalur tindakan secara otomatis: cabang JIKA saat syarat Benar, atau cabang ELSE saat syarat Salah.',
        failureDiagnosis,
        accentColor: 'amber',
        steps: [
          {
            stepTitle: 'Tentukan Kondisi Sensor yang Dicek',
            instruction:
              'Pasang balok kondisi (🚧 Jika Halangan atau 🎨 Cek Warna), lalu pilih warna atau jenis sensor yang sesuai dengan situasi di depan Odibot.',
            codePreview: 'Jika Halangan Di Depan  atau  Jika di Ubin Biru',
          },
          {
            stepTitle: 'Isi Aksi Cabang JIKA (Saat Syarat Benar)',
            instruction:
              'Masukkan aksi yang hanya boleh berjalan saat kondisi terpenuhi (contoh: jika ada halangan di depan, Putar Kanan; atau jika ubin biru, Lompat).',
            codePreview: 'JIKA (Halangan) { Putar Kanan ➔ Maju }',
          },
          {
            stepTitle: 'Aktifkan & Isi Cabang + Else (Saat Syarat Salah)',
            instruction:
              'Klik tombol + Else di pojok kanan balok kondisi, lalu klik area ELSE dan isi aksi alternatif ketika syarat TIDAK terpenuhi.',
            codePreview: 'ELSE { Maju 1 Petak ➔ Ambil Kristal }',
          },
          {
            stepTitle: 'Bungkus dengan Loop Jika Dicek Berkali-kali',
            instruction:
              'Jika sensor harus menilai setiap petak sepanjang lintasan, letakkan blok If-Else di dalam Ulangi atau Selama, lalu tekan ✓ Selesai Isi.',
          },
        ],
        commonMistakes: [
          'Menaruh aksi jalur normal di luar If-Else bukan di dalam cabang ELSE, sehingga tetap dijalankan meski kondisi Benar.',
          'Tertukar antara isi cabang JIKA dan isi cabang ELSE.',
          'Jumlah ulangan loop pembungkus belum sesuai dengan panjang lintasan.',
        ],
        levelHint: level.hint,
        debugNote: level.debugExplanation,
      };

    case 'CONDITIONALS':
      return {
        conceptId,
        conceptLabel: 'Logika Kondisi & Boolean',
        title: 'Panduan Langkah demi Langkah: Percabangan Kondisi (If)',
        intro:
          'Blok kondisi membuat Odibot "berpikir" dengan memeriksa warna ubin, halangan di depan, atau isi variabel sebelum bertindak.',
        failureDiagnosis,
        accentColor: 'amber',
        steps: [
          {
            stepTitle: 'Pahami Apa yang Dibaca Sensor',
            instruction:
              '🎨 Cek Warna memeriksa warna ubin tepat di bawah Odibot saat ini. 🚧 Jika Halangan memeriksa 1 petak di depan (jurang, tebing tinggi, atau laser). ❓ Jika Nilai membandingkan angka variabel.',
          },
          {
            stepTitle: 'Masukkan Aksi Bersyarat ke Dalam Blok JIKA',
            instruction:
              'Klik balok kondisi agar bingkai aktif menyala, lalu masukkan perintah yang hanya dijalankan ketika syarat tersebut terpenuhi.',
            codePreview: 'Jika di Ubin Kuning { Ambil Kristal }',
          },
          {
            stepTitle: 'Gabungkan 2 Kondisi Bersarang untuk Logika AND',
            instruction:
              'Jika misi butuh dua syarat benar sekaligus (misal di ubin warna DAN baterai < 4), taruh blok kondisi kedua di dalam blok kondisi pertama.',
            codePreview: 'Jika Ubin Kuning { Jika (baterai < 4) { Putar Kanan } }',
          },
          {
            stepTitle: 'Tutup Blok Kondisi & Cek Tiap Langkah',
            instruction:
              'Klik ✓ Selesai Isi agar perintah lanjutan berada di luar cabang JIKA, dan gunakan Langkah Demi Langkah untuk memantau kapan syarat bernilai Benar.',
          },
        ],
        commonMistakes: [
          'Mengira Cek Warna melihat petak di depan, padahal Cek Warna membaca ubin yang sedang diinjak.',
          'Lupa membungkus pemeriksaan kondisi dengan Ulangi saat melewati deretan beberapa ubin.',
          'Tidak menekan ✓ Selesai Isi sehingga Maju ikut terjebak di dalam kondisi.',
        ],
        levelHint: level.hint,
        debugNote: level.debugExplanation,
      };

    case 'FUNCTIONS':
      return {
        conceptId,
        conceptLabel: 'Fungsi Modular (F1 / F2)',
        title: 'Panduan Langkah demi Langkah: Membuat & Memanggil Fungsi',
        intro:
          'Fungsi F1() dan F2() menyimpan rangkaian perintah berulang sebagai satu paket modul agar Program Utama ringkas dan hemat balok.',
        failureDiagnosis,
        accentColor: 'emerald',
        steps: [
          {
            stepTitle: 'Identifikasi Sub-Tugas yang Berulang',
            instruction:
              'Cari pola aksi yang muncul lebih dari satu kali di arena (misalnya: naik tebing, ambil kristal, turun tebing, atau manuver di tikungan).',
          },
          {
            stepTitle: 'Susun Resep Perintah di Tab F1 (atau F2)',
            instruction:
              'Klik tab hijau F1 di bagian atas Workspace, lalu susun balok pola tersebut di sana. Jika ada dua pola berbeda, pisahkan pola kedua di tab F2.',
            codePreview: 'Tab F1: [Lompat ➔ Ambil Kristal ➔ Lompat]',
          },
          {
            stepTitle: 'Panggil Fungsi dari Tab Program Utama',
            instruction:
              'Klik kembali tab Program Utama, lalu tambahkan blok ⚙️ Panggil F1() (atau F2()) setiap kali pola itu dibutuhkan di rute utama.',
            codePreview: 'Program Utama: [Maju ➔ Panggil F1() ➔ Maju ➔ Panggil F1()]',
          },
          {
            stepTitle: 'Cek Arah Hadap Sebelum & Sesudah Fungsi',
            instruction:
              'Pastikan arah hadap Odibot saat memanggil F1 selalu konsisten dengan asumsi awal di dalam F1, dan hindari memanggil F1 di dalam F1 sendiri.',
          },
        ],
        commonMistakes: [
          'Mengisi Program Utama saja tanpa mengisi tab F1, atau mengisi tab F1 tetapi lupa memanggil ⚙️ Panggil F1() di Program Utama.',
          'Memasukkan Panggil F1() di dalam tab F1 sendiri sehingga memicu rekursi tanpa akhir.',
          'Arah hadap Odibot sebelum memanggil F1 kedua kalinya belum diputar ke posisi yang tepat.',
        ],
        levelHint: level.hint,
        debugNote: level.debugExplanation,
      };

    case 'LISTS':
      return {
        conceptId,
        conceptLabel: 'Struktur Data List (Array)',
        title: 'Panduan Langkah demi Langkah: Membaca Daftar Rute (List)',
        intro:
          'List menyimpan beberapa perintah berurutan mulai dari indeks [0]. Blok Baca List Rute menjalankan seluruh daftar tersebut secara otomatis.',
        failureDiagnosis,
        accentColor: 'blue',
        steps: [
          {
            stepTitle: 'Periksa Isi List di HUD Arena',
            instruction:
              'Lihat kotak biru di bagian atas layar Arena (misal daftar_rute=[MAJU, MAJU, AMBIL]) dan ikuti di pikiran ke petak mana Odibot akan berhenti setelah daftar habis.',
            codePreview: 'daftar_rute[0] ➔ daftar_rute[1] ➔ ... sampai akhir list',
          },
          {
            stepTitle: 'Pasang Blok Baca List Rute',
            instruction:
              'Masukkan balok 📋 Baca List Rute untuk mengeksekusi seluruh isi daftar sekaligus hanya dengan 1 balok!',
          },
          {
            stepTitle: 'Sambung Sisa Langkah atau Bungkus dalam Loop',
            instruction:
              'Jika daftar hanya membentuk satu segmen jalan yang berulang, taruh Baca List Rute di dalam blok Ulangi. Jika berbeda, sambung dengan perintah tambahan setelahnya.',
            codePreview: 'Ulangi (2x) { Baca List Rute }  atau  Baca List Rute ➔ Putar Kanan ➔ Maju',
          },
          {
            stepTitle: 'Lacak dengan Terminal Inspektor',
            instruction:
              'Jalankan Langkah Demi Langkah untuk melihat indeks array ke berapa yang sedang dieksekusi oleh Odibot.',
          },
        ],
        commonMistakes: [
          'Mengira Baca List Rute sudah langsung mengantar sampai Terminal Emas padahal masih perlu tambahan belok/maju/ambil kristal.',
          'Arah hadap Odibot saat memanggil Baca List Rute kedua kalinya keliru.',
          'Lupa menekan Saklar atau mengambil kristal yang berada di luar daftar rute.',
        ],
        levelHint: level.hint,
        debugNote: level.debugExplanation,
      };

    case 'DEBUGGING':
      return {
        conceptId,
        conceptLabel: 'Debugging & Trace Kode',
        title: 'Panduan Langkah demi Langkah: Menemukan & Memperbaiki Bug',
        intro:
          'Pada misi debugging, sebagian besar program sudah benar, tetapi ada 1–2 kesalahan kecil (bug). Tugasmu adalah melacak baris mana yang menyimpang.',
        failureDiagnosis,
        accentColor: 'rose',
        steps: [
          {
            stepTitle: 'Jalankan Mode 1 Langkah Saja',
            instruction:
              'Tekan tombol Langkah Demi Langkah (atau 1 Langkah di HP) berulang kali sambil memantau blok mana yang sedang disorot menyala.',
          },
          {
            stepTitle: 'Periksa Tab F1/F2 & Kondisi Tersembunyi',
            instruction:
              'Jika misi memakai fungsi atau loop, cek juga isi tab F1, tab F2, angka hitungan Ulangi, maupun cabang + Else karena bug sering bersembunyi di dalamnya.',
          },
          {
            stepTitle: 'Cocokkan Gejala dengan Jenis Bug',
            instruction:
              'Jika belok ke arah salah ➔ tukar Putar Kiri/Kanan. Jika jatuh 1 petak ➔ cek jumlah Ulangi. Jika tersengat laser ➔ sisipkan Saklar Laser. Jika berulang selamanya ➔ hapus panggilan rekursif.',
            codePreview: 'Tukar perintah salah  |  Ubah angka loop  |  Geser urutan ▲ ▼',
          },
          {
            stepTitle: 'Uji Ulang Setelah Satu Perbaikan',
            instruction:
              'Ubah satu bagian yang paling mencurigakan lalu uji kembali. Jika susunan kode terlanjur berantakan, tekan Contoh Solusi untuk memuat ulang kode awal misi.',
          },
        ],
        commonMistakes: [
          'Menghapus seluruh kode padahal hanya satu balok atau angka loop yang perlu diperbaiki.',
          'Tidak mengecek isi tab F1/F2 ketika bug terjadi di dalam fungsi.',
          'Lupa mengecek urutan kristal dan saklar laser.',
        ],
        levelHint: level.hint,
        debugNote: level.debugExplanation,
      };

    case 'SEQUENTIAL_STATE':
    default:
      return {
        conceptId,
        conceptLabel: 'Algoritma Sekuensial & State',
        title: 'Panduan Langkah demi Langkah: Urutan & Navigasi Dasar',
        intro:
          'Komputer menjalankan perintah satu per satu dari atas ke bawah secara persis. Satu arah belokan atau perintah yang tertukar akan menggeser tujuan akhir.',
        failureDiagnosis,
        accentColor: 'cyan',
        steps: [
          {
            stepTitle: 'Posisikan Diri Mengikuti Arah Hadap Odibot',
            instruction:
              'Perhatikan ke arah mana moncong/mata Odibot menghadap saat ini sebelum menentukan Putar Kiri atau Putar Kanan.',
          },
          {
            stepTitle: 'Cocokkan Perintah dengan Jenis Ubin',
            instruction:
              'Lantai datar = Maju 1 Petak. Beda tinggi ±1m = 🦘 Lompat Tebing. Di atas kristal = 💎 Ambil Kristal. Di atas saklar = ⚡ Saklar Laser.',
            codePreview: 'Maju ➔ Lompat Tebing ➔ Ambil Kristal ➔ Saklar Laser',
          },
          {
            stepTitle: 'Pastikan Semua Kristal Terambil Sebelum Portal',
            instruction:
              'Portal Terminal Emas hanya terbuka sempurna apabila seluruh kristal energi di arena sudah dikumpulkan (cek indikator 💎 di atas arena).',
          },
          {
            stepTitle: 'Lacak Kesalahan per Baris',
            instruction:
              'Gunakan tombol Langkah Demi Langkah untuk berhenti tepat di langkah sebelum kesalahan terjadi dan perbaiki balok pada posisi tersebut.',
          },
        ],
        commonMistakes: [
          'Tertukar antara Putar Kiri dan Putar Kanan menurut sudut pandang layar, bukan arah hadap Odibot.',
          'Memakai Maju 1 Petak saat naik/turun tebing alih-alih Lompat Tebing.',
          'Melewati ubin kristal atau saklar tanpa memasang perintah Ambil Kristal / Saklar Laser.',
        ],
        levelHint: level.hint,
        debugNote: level.debugExplanation,
      };
  }
}
