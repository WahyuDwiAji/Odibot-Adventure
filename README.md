# 🤖 Odibot Adventure: Petualangan Koding SD Kelas 6

Game edukasi interaktif untuk melatih logika berpikir komputasional, algoritma runtunan, perulangan, percabangan, fungsi, dan debugging bagi siswa SD kelas 6 (Kurikulum Merdeka).

---

## 🚀 Panduan Deploy Bebas Eror ke Vercel via GitHub

Sebelumnya, Vercel mengalami eror `ERESOLVE (dependency conflict)` karena versi `esbuild` bawaan template berkonflik dengan Vite 8 saat instalasi di server Vercel. 

Sekarang masalah tersebut sudah **100% diperbaiki**:
1. Menghapus ketergantungan konflik (`esbuild`, `express`, dll.) dari `package.json`.
2. Menambahkan file konfigurasi `.npmrc` (`legacy-peer-deps=true`).
3. Menambahkan file `vercel.json` dengan instruksi instalasi & rewrite SPA otomatis.
4. Membuat `package-lock.json` yang telah diaudit bersih (0 vulnerabilities).

---

### Langkah-langkah Deploy:

1. **Push pembaruan kode ini ke GitHub**:
   ```bash
   git add .
   git commit -m "fix: optimasi dependency & konfigurasi deploy vercel"
   git push origin main
   ```

2. **Buka Dashboard Vercel**:
   - Jika proyek **sudah ada** di Vercel:
     - Buka proyek Anda di Vercel, masuk ke tab **Deployments**.
     - Vercel akan otomatis melakukan build ulang dari commit terbaru, atau Anda bisa klik **"Redeploy"**.
   - Jika **baru pertama kali**:
     - Klik **"Add New..."** $\rightarrow$ **"Project"**.
     - Hubungkan akun GitHub Anda dan pilih repositori ini.
     - Vercel akan otomatis mendeteksi:
       - **Framework Preset**: `Vite`
       - **Install Command**: `npm install --legacy-peer-deps`
       - **Build Command**: `npm run build`
       - **Output Directory**: `dist`
     - Klik **"Deploy"**.

3. **Selesai!** Aplikasi akan selesai di-build dalam waktu $\approx 30$ detik dan menghasilkan link live yang aktif.
