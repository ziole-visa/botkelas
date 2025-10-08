# 🤖 Bot Kelas

Bot Kelas adalah bot WhatsApp open-source berbasis **Node.js** yang dirancang untuk membantu aktivitas akademik seperti absen, tugas, catatan, kas, hingga pengingat harian.

## ✨ Fitur Utama
- 📅 Absen otomatis dan catatan kehadiran
- 📝 Pengingat tugas & PR
- 💰 Manajemen kas kelas
- 🧑‍🏫 Jadwal piket otomatis
- 🧩 Event & reminder harian
- ⚙️ Sistem owner dan premium role
- 🌐 Open Source (FLOSS)

## ⚙️ Instalasi

### 1️⃣ Clone repository
```bash
git clone https://github.com/username/botkelas.git
cd botkelas
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Jalankan bot
```bash
node main.js
```

### 4️⃣ Scan QR Code
Saat pertama dijalankan, bot akan menampilkan QR code di terminal.
Scan dengan WhatsApp kamu untuk koneksi.

---

## 📁 Struktur Folder

```plaintext
├── main.js                # Entry point utama
├── index.js               # Router dan handler tambahan
├── package.json           # Info project dan dependency
├── settings.json          # Konfigurasi bot
├── start/lib/             # Library internal (converter, myfunction, color, dll)
├── start/lib/database/    # Data owner & premium
├── data/                  # Data dinamis (absen, kas, event, catatan, dsb)
└── mutedGroups.json       # Daftar grup yang dibisukan
```

---

## ⚙️ Konfigurasi (settings.json)

Edit `settings.json` untuk ubah nama bot, owner, prefix, atau mode.

```json
{
  "owner": ["628xxxxxxx"],
  "botName": "Bot Kelas",
  "ownerName": "Ziole",
  "prefix": ".",
  "mode": "public"
}
```

---

## 🧩 Command Utama

| Command | Fungsi |
|----------|--------|
| `.absen` | Melakukan absen harian |
| `.pr` | Menambahkan atau melihat tugas |
| `.kas` | Menampilkan dan update kas |
| `.piket` | Melihat jadwal piket |
| `.event` | Menambahkan event atau jadwal kegiatan |
| `.catatan` | Menyimpan catatan pribadi |
| `.owner` | Menampilkan info pemilik bot |

---

## 🚀 Deployment

Bot Kelas bisa dijalankan di berbagai platform:
- Replit
- Heroku
- Vercel (untuk web dokumentasi)
- VPS / Linux Server (direkomendasikan)

---

## 🧠 Tentang Developer

**Dibuat oleh:** [Ziole](https://github.com/ziole-visa)  
**Project:** bot kelas node.js  
**nonprofit project** 

---

## 📜 Lisensi

Project ini dirilis di bawah lisensi **FLOSS (Free/Libre and Open Source Software)**  
Kamu bebas menggunakan, memodifikasi, dan menyebarkan ulang dengan tetap menyertakan kredit developer asli.

> 💡 *Kontribusi sangat diterima! Kirim pull request untuk menambahkan fitur baru atau memperbaiki bug.*

---

terimakasih telah menggunakan bot saya dan saya sangat mengapresiasi segala bentuk dukungan yang anda berikan 
sampai jumpa di projek selanjutnya byeeee
