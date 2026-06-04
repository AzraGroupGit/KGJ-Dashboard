# 📘 Panduan Pengguna Sistem BMS-OPR-PRD

> Dokumen ini berisi panduan langkah demi langkah untuk semua pengguna sistem.
> Dibuat khusus untuk pengguna non-teknis — menggunakan bahasa sederhana.

---

## Daftar Isi

1. [Apa itu Sistem Ini?](#1-apa-itu-sistem-ini)
2. [Cara Login](#2-cara-login)
3. [Daftar Pengguna & Tugas Masing-Masing](#3-daftar-pengguna--tugas-masing-masing)
4. [Panduan untuk Staff Operasional (CS & Marketing)](#5-panduan-untuk-staff-operasional-cs--marketing)
5. [Panduan untuk Staff Produksi (Pekerja Workshop)](#6-panduan-untuk-staff-produksi-pekerja-workshop)
6. [Panduan untuk Supervisor](#7-panduan-untuk-supervisor)
7. [Alur Order dari Awal sampai Selesai](#8-alur-order-dari-awal-sampai-selesai)
8. [Istilah-Istilah Penting](#9-istilah-istilah-penting)

---

## 1. Apa itu Sistem Ini?

Sistem ini adalah **aplikasi web** untuk mengelola pesanan cincin — dari pelanggan datang, sampai cincin selesai dan dikirim.

### Manfaat untuk Anda:

| Jika Anda seorang... | Sistem ini membantu... |
|----------------------|------------------------|
| **Customer Service** | Mencatat pesanan dengan lengkap, melihat riwayat pelanggan |
| **Staff Produksi** | Melihat spesifikasi cincin, mencatat hasil kerja, tahu deadline |
| **Supervisor** | Menyetujui hasil kerja, memantau semua order, melihat kinerja tim |
| **Admin** | Melihat laporan, mengelola akun, analisis produksi |

### Yang Anda butuhkan:
- **HP atau komputer** yang terhubung internet
- **Browser** (Chrome, Firefox, atau Safari)
- **Akun** yang sudah dibuatkan oleh supervisor/atasan

---

## 2. Cara Login

Ada **2 cara login** tergantung peran Anda:

### A. Login untuk Staff Operasional (CS, Marketing, Superadmin)

**Via halaman login form:**
1. Buka alamat website yang sudah diberikan
2. Anda akan melihat halaman **Login**
3. Pilih peran Anda di dropdown (Customer Service / Marketing / Superadmin)
4. Masukkan **Email** dan **Password** yang sudah diberikan
5. Klik tombol **Masuk**
6. Anda akan masuk ke halaman dashboard sesuai peran Anda

> Jika lupa password, hubungi atasan atau superadmin.

### B. Login untuk Staff Produksi (Pekerja Workshop)

**Via QR Code:**
1. Buka halaman `/workshop/login` di HP Anda
2. Kamera akan terbuka (atau minta scan QR code)
3. Arahkan kamera ke **QR Code** yang ada di meja kerja Anda
4. Otomatis masuk ke halaman kerja Anda

**Via PIN (cadangan):**
1. Buka halaman `/workshop/login` di HP
2. Pilih **Masuk dengan PIN**
3. Ketik **Nama** Anda di kolom pencarian
4. Klik nama Anda
5. Masukkan **6 digit PIN** Anda
6. Klik **Masuk**

> Jika belum punya PIN, minta supervisor untuk membuatkannya.

---

## 3. Daftar Pengguna & Tugas Masing-Masing

Berikut adalah **semua pengguna** yang ada di sistem ini — siapa mereka, apa tugasnya, dan bagaimana cara loginnya.

| No | Nama Peran | Bagian | Tugas Utama | Cara Login |
|----|-----------|--------|-------------|------------|
| 1 | **Superadmin** | IT / Admin | Mengelola semua akun, melihat laporan, mengatur sistem | Form (Email + Password) |
| 2 | **Customer Service (CS)** | Operasional | Mencatat pesanan baru, menghubungi pelanggan, konfirmasi | Form (Email + Password) |
| 3 | **Marketing** | Operasional | Mencatat pesanan dari hasil marketing | Form (Email + Password) |
| 4 | **Operational Supervisor** | Operasional | Menyetujui tahap awal produksi, memantau pesanan | Form (Email + Password) |
| 5 | **Production Supervisor** | Produksi | Menyetujui tahap akhir produksi (finishing) | Form (Email + Password) |
| 6 | **Pekerja Racik Bahan** | Produksi | Menimbang & mencampur bahan emas | QR Code / PIN |
| 7 | **Pekerja Lebur** | Produksi | Melebur bahan emas | QR Code / PIN |
| 8 | **Pekerja Pembentukan** | Produksi | Membentuk cincin | QR Code / PIN |
| 9 | **Pekerja Microsetting** | Produksi | Memasang batu / microsetting | QR Code / PIN |
| 10 | **Pekerja Pemolesan** | Produksi | Memoles awal cincin | QR Code / PIN |
| 11 | **Pekerja Cek Kadar** | Produksi | Mengecek kadar emas | QR Code / PIN |
| 12 | **Pekerja QC (Quality Control)** | Produksi | Memeriksa kualitas hasil kerja | QR Code / PIN |
| 13 | **Pekerja Laser** | Produksi | Mengukir dengan laser | QR Code / PIN |
| 14 | **Pekerja Finishing** | Produksi | Menyelesaikan akhir cincin | QR Code / PIN |
| 15 | **Pekerja Packing** | Operasional | Mengemas cincin yang siap dikirim | QR Code / PIN |
| 16 | **Pekerja Pengiriman** | Operasional | Mengirim cincin ke pelanggan | QR Code / PIN |

> **Catatan:** Pekerja nomor 6-16 login menggunakan **QR Code** atau **PIN** di halaman workshop (`/workshop/login`).
> Supervisor dan staff kantor (nomor 1-5) login menggunakan **Email + Password** di halaman login (`/login`).

### Siapa yang Melakukan Apa? — Berdasarkan Tahap

Setiap pesanan melewati beberapa tahap. Berikut siapa yang mengerjakan setiap tahap:

| Tahap Ke | Nama Tahap | Dikerjakan Oleh |
|:--------:|------------|-----------------|
| 1 | Penerimaan Order | Customer Service |
| 2 | Approval Penerimaan | Operational Supervisor |
| 3 | Racik Bahan | Pekerja Racik Bahan |
| 4 | Approval Racik Bahan | Operational Supervisor |
| 5 | Lebur Bahan | Pekerja Lebur |
| 6 | Pembentukan Cincin | Pekerja Pembentukan |
| 7 | Micro Setting | Pekerja Microsetting |
| 8 | Pemolesan Awal | Pekerja Pemolesan |
| 9 | Cek Kadar | Pekerja Cek Kadar |
| 10 | QC Awal | Pekerja QC |
| 11 | Approval QC Awal | Operational Supervisor |
| 12 | Laser Engraving | Pekerja Laser |
| 13 | Finishing | Pekerja Finishing |
| 14 | Approval Produksi | **Production Supervisor** |
| 15 | QC Akhir | Pekerja QC |
| 16 | Approval QC Akhir | Operational Supervisor |
| 17 | Konfirmasi Customer Care | Customer Service |
| 18 | Packing | Pekerja Packing |
| 19 | Pengiriman | Pekerja Pengiriman |
| 20 | ✅ Selesai | — |

---

## 5. Panduan untuk Staff Operasional (CS & Marketing)

### A. Mencatat Pesanan Baru (Input Order)

**Langkah-langkah:**

1. **Login** sebagai Customer Service
2. Di halaman dashboard, klik menu **Input Order** (di sisi kiri)
3. Anda akan melihat **form pesanan** — isi data berikut:

   **Data Pelanggan:**
   - Nama customer
   - Nomor WA
   - Email (opsional)
   - Instagram (opsional)

   **Detail Cincin Pria (jika ada):**
   - Ukuran cincin
   - Jenis cincin
   - Model / Bentuk
   - Microsetting (pilih dari daftar)
   - Detail Laser
   - Detail Finishing
   - Gramasi (berat emas)
   - Ukiran (tulisan di dalam cincin)

   **Detail Cincin Wanita (jika ada):**
   - Sama seperti di atas

   **Informasi Lain:**
   - Acara (events pernikahan/tunangan)
   - Deadline (batas waktu jadi)
   - Harga dan DP
   - Kategori
   - Transfer ke bank apa
   - Pengiriman (diambil/dikirim)
   - Alamat pengiriman (jika dikirim)
   - Upload gambar referensi (jika ada)

4. Setelah semua terisi, klik **Simpan**
5. Pesanan akan tersimpan dengan status **"Menunggu Approval Supervisor"**

> 💡 **Tips:** Semakin lengkap data yang diisi, semakin mudah staff produksi mengerjakannya.

### B. Melihat Daftar Pelanggan

1. Klik menu **Pelanggan** di sisi kiri
2. Anda akan melihat daftar semua pelanggan yang pernah order
3. Klik salah satu untuk melihat riwayat pesanannya

### C. Konfirmasi ke Pelanggan (Tahap Konfirmasi)

Ketika pesanan sudah sampai di tahap **Konfirmasi** (cincin sudah jadi):
1. Buka menu **Pelanggan** atau buka detail order
2. Cari order dengan status **"Konfirmasi Customer Care"**
3. Hubungi pelanggan via WA untuk memberi tahu bahwa cincin sudah siap
4. Catat hasil konfirmasi di sistem

---

## 6. Panduan untuk Staff Produksi (Pekerja Workshop)

### A. Login di Meja Kerja

1. Scan **QR Code** yang ada di meja kerja Anda (atau login PIN seperti di atas)
2. Anda akan masuk ke halaman **Workshop Input**

### B. Memulai Pekerjaan

Di halaman workshop, Anda akan melihat:

- **Nama Anda** di bagian atas (sudah login sebagai siapa)
- **Daftar pesanan** yang harus dikerjakan
- Setiap pesanan menunjukkan:
  - Nomor order
  - Nama customer
  - **Tahap** yang harus dikerjakan (contoh: "Racik Bahan", "Lebur Bahan")
  - **Batas waktu** (hijau = aman, merah = terlambat)

### C. Melihat Detail Pesanan

1. Klik salah satu pesanan
2. Akan muncul **kartu order** yang berisi:
   - Semua spesifikasi cincin (ukuran, jenis, ukiran, dll)
   - Gambar referensi (jika ada)
   - Batas waktu pengerjaan
3. Baca spesifikasi dengan teliti sebelum mulai bekerja

### D. Menyelesaikan Satu Tahap (Submit)

1. Setelah selesai mengerjakan satu tahap, klik **Submit / Selesai**
2. Isi data sesuai yang diminta (misalnya: hasil timbangan, catatan)
3. Klik **Kirim**
4. Pesanan akan otomatis masuk ke **antrian approval supervisor**
5. Anda bisa lanjut ke pesanan berikutnya

> ⚠️ **Penting:** Jika supervisor **menolak** hasil kerja Anda, pesanan akan kembali ke daftar Anda dengan status **"Rework"**. Perbaiki dan kirim ulang.

### E. Memahami Deadline / Batas Waktu

- **Hijau** = Anda masih punya banyak waktu
- **Kuning** = Waktu tersisa sedikit
- **Merah** = Anda sudah terlambat dari target

Usahakan selalu di warna **hijau**!

### F. Mengganti PIN

1. Di halaman workshop, klik **Pengaturan PIN**
2. Masukkan PIN baru (6 digit angka)
3. Konfirmasi PIN baru
4. Simpan

---

## 7. Panduan untuk Supervisor

### A. Login

1. Buka halaman login
2. Pilih **Operational Supervisor** atau **Production Supervisor**
3. Masukkan email dan password

### B. Menyetujui atau Menolak Hasil Kerja (Approval)

Ini adalah tugas utama supervisor. Begini caranya:

1. Setelah login, buka menu **Approval** di sisi kiri
2. Anda akan melihat daftar **pesanan yang menunggu approval**
3. Setiap kartu menunjukkan:
   - Nomor dan nama customer
   - Tahap yang perlu disetujui (contoh: "Approval Racik Bahan")
   - Data yang dikirim oleh pekerja
   - Siapa pekerjanya

**Untuk menyetujui:**
1. Klik tombol **Setujui** (warna hijau)
2. Pesanan akan lanjut ke tahap berikutnya

**Untuk menolak (rework):**
1. Klik tombol **Tolak** (warna merah)
2. Tulis **alasan** mengapa ditolak (wajib diisi)
3. Klik **Konfirmasi Tolak**
4. Pesanan akan kembali ke pekerja untuk diperbaiki

> 💡 **Tips:** Kasih alasan yang jelas saat menolak agar pekerja tahu apa yang harus diperbaiki.

### C. Memantau Semua Pesanan (Monitoring)

1. Klik menu **Monitoring**
2. Anda akan melihat **semua pesanan** yang sedang berjalan
3. Filter berdasarkan:
   - **Tahap** (lihat pesanan di tahap tertentu)
   - **Status** (berjalan / menunggu approval / selesai)
4. Klik salah satu pesanan untuk melihat **riwayat lengkap**:
   - Kapan pesanan masuk
   - Siapa saja yang sudah mengerjakan
   - Apakah pernah ditolak
   - Semua catatan approval

### D. Melihat Hambatan Produksi (Bottleneck)

1. Klik menu **Bottleneck**
2. Anda akan melihat **tahap mana yang paling lama** menunggu
3. Warna merah = tahap yang paling menghambat
4. Gunakan info ini untuk mengambil tindakan

### E. Mengelola Akun Pekerja

1. Klik menu **Akun**
2. Anda bisa:
   - **Tambah pekerja baru** (isi nama, role, password)
   - **Reset password** pekerja
   - **Nonaktifkan** akun pekerja yang sudah keluar

### F. Membuat QR Code untuk Meja Kerja

1. Klik menu **QR Code**
2. Klik **Buat QR Code Baru**
3. Pilih **Role** (jabatan) untuk meja kerja ini
4. Isi **Nama Workstation** (contoh: "Meja Racik 1", "Mesin Laser")
5. Klik **Buat**
6. QR Code akan muncul — **download** dan tempel di meja kerja

---

## 8. Alur Order dari Awal Sampai Selesai

Berikut adalah perjalanan satu pesanan dari awal sampai akhir:

```
TAHAP 1 — CS Mencatat Pesanan
╔══════════════════════════════════════╗
║  Customer Service input data order   ║
║  di website → Status: IN PROGRESS    ║
╚══════════════════════════════════════╝
                    │
                    ▼
TAHAP 2 — Supervisor Operational Menyetujui
╔══════════════════════════════════════╗
║  Supervisor cek data order           ║
║  ✅ SETUJU → lanjut ke produksi      ║
║  ❌ TOLAK → CS perbaiki data        ║
╚══════════════════════════════════════╝
                    │
                    ▼
TAHAP 3 — Produksi (Tahap 1)
╔══════════════════════════════════════╗
║  Pekerja Racik Bahan → Selesai       ║
║  → Supervisor cek & setujui          ║
║    ✅ Setuju → lanjut                ║
║    ❌ Tolak → perbaiki              ║
╚══════════════════════════════════════╝
                    │
                    ▼
TAHAP 4 — Produksi (Tahap 2-7)
╔══════════════════════════════════════╗
║  Lebur Bahan                         ║
║  → Pembentukan Cincin                ║
║  → Micro Setting                     ║
║  → Pemolesan Awal                    ║
║  → Cek Kadar                         ║
║  → QC Awal                           ║
║  → Supervisor setujui QC             ║
╚══════════════════════════════════════╝
                    │
                    ▼
TAHAP 5 — Produksi (Tahap 8-10)
╔══════════════════════════════════════╗
║  Laser Engraving                     ║
║  → Finishing                         ║
║  → Supervisor Produksi setujui       ║
╚══════════════════════════════════════╝
                    │
                    ▼
TAHAP 6 — QC Akhir & Pengiriman
╔══════════════════════════════════════╗
║  QC Akhir → Supervisor setujui      ║
║  → CS konfirmasi ke customer        ║
║  → Packing                           ║
║  → Pengiriman                        ║
║  ✅ SELESAI                          ║
╚══════════════════════════════════════╝
```

### Ringkasan 22 Tahap:

| No | Nama Tahap | Dikerjakan Oleh | Wajib Approval? |
|----|-----------|----------------|:---:|
| 1 | Penerimaan Order | Customer Service | |
| 2 | ✅ Approval Penerimaan Order | Supervisor Operational | ✅ |
| 3 | Racik Bahan | Pekerja Produksi | |
| 4 | ✅ Approval Racik Bahan | Supervisor Operational | ✅ |
| 5 | Lebur Bahan | Pekerja Produksi | |
| 6 | Pembentukan Cincin | Pekerja Produksi | |
| 7 | Micro Setting | Pekerja Produksi | |
| 8 | Pemolesan Awal | Pekerja Produksi | |
| 9 | Cek Kadar | Pekerja Produksi | |
| 10 | QC Awal | Pekerja QC | |
| 11 | ✅ Approval QC Awal | Supervisor Operational | ✅ |
| 12 | Laser Engraving | Pekerja Produksi | |
| 13 | Finishing | Pekerja Produksi | |
| 14 | ✅ Approval Produksi | **Supervisor Produksi** | ✅ |
| 15 | QC Akhir | Pekerja QC | |
| 16 | ✅ Approval QC Akhir | Supervisor Operational | ✅ |
| 17 | Konfirmasi Customer Care | Customer Service | |
| 18 | Packing | Pekerja Packing | |
| 19 | Pengiriman | Pekerja Pengiriman | |
| 20 | ✅ Selesai | | |

---

## 9. Istilah-Istilah Penting

| Istilah | Arti |
|---------|------|
| **Order / Pesanan** | Pesanan cincin dari pelanggan |
| **Customer / Pelanggan** | Orang yang memesan cincin |
| **CS / Customer Service** | Staff yang menerima dan mencatat pesanan |
| **Supervisor** | Atasan yang menyetujui hasil kerja |
| **Approval** | Proses menyetujui atau menolak hasil kerja |
| **Setujui / Approve** | Menyetujui → lanjut ke tahap berikutnya |
| **Tolak / Reject** | Menolak → dikembalikan untuk diperbaiki |
| **Rework** | Perbaikan (pesanan kembali ke pekerja) |
| **Stage / Tahap** | Langkah dalam proses produksi (total 22) |
| **Submit** | Mengirim hasil pekerjaan |
| **Deadline** | Batas waktu selesai |
| **Workstation** | Meja / tempat kerja dengan QR code |
| **QR Code** | Kode kotak-kotak yang di-scan untuk login |
| **PIN** | Kode rahasia 6 angka untuk login (cadangan) |
| **Bottleneck** | Tahap yang paling lambat / menghambat |
| **QC / Quality Control** | Pengecekan kualitas |
| **Timeline** | Riwayat lengkap perjalanan pesanan |

---

## Catatan Penting

### Jika mengalami masalah:
1. **Tidak bisa login** → Hubungi supervisor atau superadmin
2. **Data salah** → Hubungi CS untuk memperbaiki data pesanan
3. **Lupa password** → Minta reset ke superadmin
4. **Lupa PIN** → Minta supervisor untuk reset PIN
5. **Website error / tidak bisa dibuka** → Laporkan ke tim IT

### Tips penggunaan:
- Gunakan **Google Chrome** untuk hasil terbaik
- Pastikan koneksi internet stabil
- Logout setelah selesai menggunakan (terutama di komputer bersama)
- Simpan PIN di tempat aman, jangan berikan ke orang lain

---

*Dokumen ini dibuat untuk memudahkan semua pengguna dalam menggunakan sistem BMS-OPR-PRD.*
*Jika ada pertanyaan, silakan hubungi superadmin atau tim pengembang.*
