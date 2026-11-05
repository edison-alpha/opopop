# OPPERA Monorepo (React 19 + Rust Realtime Hub)

Platform kantor virtual 2D interaktif berbasis web untuk kolaborasi tim jarak jauh (*remote team*). Arsitektur proyek menggunakan struktur **Monorepo** dengan pemisahan tegas antara antarmuka pengguna SPA ultra-cepat (**Frontend React 19 + Vite 6**) dan backend realtime performa tinggi (**Backend Rust Axum + Tokio**) yang menerapkan prinsip **Clean Architecture**.

---

## 🏁 Panduan Memulai Cepat (Tutorial dari Awal)

Panduan langkah demi langkah ini dibuat agar teman Anda atau kontributor baru dapat mengkloning dan langsung menjalankan proyek ini di komputernya dari nol.

### 📋 1. Prasyarat yang Harus Di-install

Pastikan perangkat Anda sudah terpasang alat-alat berikut sebelum memulai:

| Alat | Versi Minimal | Link Download & Panduan |
| :--- | :--- | :--- |
| **Git** | Versi terbaru | [Download Git](https://git-scm.com/downloads) |
| **Node.js** | `v24` (atau `v20+`) | [Download Node.js](https://nodejs.org/) |
| **pnpm** | `v9+` | Install via terminal: `npm install -g pnpm` |
| **Rust & Cargo** | `1.80+` | Install via `rustup` di [rustup.rs](https://rustup.rs/) *(Windows memerlukan C++ Build Tools)* |

> [!TIP]
> **Verifikasi Instalasi:** Buka terminal baru dan pastikan perintah-perintah berikut berjalan:
> ```bash
> git --version
> node -v
> pnpm -v
> cargo --version
> ```

---

### 📥 2. Clone Repositori & Pindah ke Branch

Buka Terminal / Command Prompt / PowerShell, lalu jalankan:

```bash
# 1. Clone repositori dari GitHub
git clone https://github.com/edison-alpha/opopop.git

# 2. Masuk ke direktori proyek
cd opopop

# 3. Pindah ke branch fitur monorepo terbaru
git checkout feat/rust-monorepo
```

---

### 📦 3. Install Dependensi

Jalankan perintah berikut di root folder proyek:

```bash
pnpm install
```

---

### 🚀 4. Menjalankan Aplikasi

Tersedia **2 metode** untuk menjalankan proyek ini:

#### Metode A: Mode Pengembangan (Direkomendasikan saat Mengembangkan Fitur)
Metode ini mengaktifkan *Hot Module Replacement* (HMR) dari Vite sehingga perubahan kode React langsung tampil instan tanpa refresh.

Jalankan frontend dan backend bersama dari root project:

```bash
pnpm dev
```

Frontend tersedia di `http://localhost:3000/app`, backend di `http://localhost:3001`.
Jika OPPERA sudah aktif, `pnpm dev` menggunakan server yang ada tanpa membuat duplikat.
Jika baru frontend atau backend yang aktif, hanya proses yang belum aktif yang dijalankan.
Proses yang dimulai dalam satu sesi ikut dihentikan ketika salah satunya berhenti. Port frontend dikunci
ke 3000 agar aplikasi tidak berpindah alamat tanpa diketahui.

Untuk menjalankan keduanya secara terpisah, gunakan **2 tab terminal**:

* **Terminal 1 — Jalankan Backend Realtime Rust:**
  ```bash
  pnpm dev:server
  ```
  *(Backend Rust Axum akan aktif di `http://127.0.0.1:3001` melayani WebSocket realtime & signaling)*.

* **Terminal 2 — Jalankan Frontend React 19 (Vite):**
  ```bash
  pnpm dev:web
  ```
  *(Frontend Vite akan aktif di `http://localhost:3000`)*.

👉 **Buka browser Anda di:** **[http://localhost:3000](http://localhost:3000)**

---

#### Metode B: Mode Single Binary (Hanya 1 Perintah / Mode Produksi)
Server Rust Axum sudah dilengkapi static file server. Anda dapat mem-bundle React dan menjalankannya langsung dari binary Rust **tanpa membutuhkan runtime Node.js**:

```bash
# 1. Kompilasi bundle statis React 19
pnpm build:web

# 2. Kompilasi & jalankan binary Rust Axum
cargo run --release --manifest-path apps/server/Cargo.toml
```

👉 **Buka browser Anda langsung di:** **[http://localhost:3001](http://localhost:3001)**

---

### 🎮 5. Panduan Masuk & Bermain di Kantor Virtual

1. Buka URL **[http://localhost:3000/app](http://localhost:3000/app)** di browser (Chrome/Edge/Brave/Firefox).
2. **Langkah 1 (Avatar Editor):** Masukkan nama Anda di kolom *Your name*, pilih model rambut, baju, dan warna avatar sesuai selera, lalu klik **Next**.
3. **Langkah 2 (Media Check):** Anda dapat menguji mikrofon dan kamera (atau mematikannya dengan tombol bulat merah jika belum ingin menyalakan), lalu klik **Join the office**.
4. **Kontrol Keyboard:**
   - **Bergerak**: Gunakan tombol **W, A, S, D** atau **Tombol Panah**.
   - **Klik untuk Jalan**: Klik sembarang lantai, avatar akan otomatis mencari jalan (*smart pathfinding*).
   - **Emote Reaksi**: Tekan tombol angka **1 s/d 9** untuk memunculkan emoji di atas kepala avatar.
   - **Interaksi Audio Spasial**: Dekati avatar rekan kerja Anda (jarak < 3 petak), audio & video WebRTC P2P akan otomatis terhubung!
   - **Fitur Chat**: Klik ikon balon pesan di sisi kiri untuk membuka chat publik atau pesan privat (DM).
   - **Command Palette**: Tekan **Ctrl + K** untuk mencari orang, ruangan, atau fungsi cepat.
   - **Mode Bangun Kantor**: Klik tombol *Palu* di toolbar bawah untuk menambah meja, tanaman, partisi, atau ruangan baru.

---

### ⚠️ Troubleshooting (Solusi Masalah Umum)

- **Port 3000 atau 3001 sudah terpakai (`EADDRINUSE`)**:
  - Tutup aplikasi yang memakai port tersebut atau matikan prosesnya via terminal:
    - Di Windows PowerShell: `Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process`
    - Di Mac/Linux: `npx kill-port 3000 3001`
- **Error: `cargo` is not recognized**:
  - Anda belum merestart terminal setelah menginstall Rustup. Tutup semua jendela terminal dan buka kembali.
- **Izin Kamera & Mikrofon Diblokir**:
  - Klik ikon gembok / pengaturan situs di baris URL browser Anda, pilih *Allow* untuk Camera dan Microphone, lalu refresh halaman. Anda tetap bisa masuk ke kantor meski tanpa kamera/mic.
- **Masalah Dependency Lockfile**:
  - Jalankan: `pnpm install --trust-lockfile`

---

## 🏗️ Arsitektur Monorepo & Clean Architecture

```text
operra/
├── apps/
│   ├── web/                     # Frontend Pure React 19 + Vite 6 (SPA)
│   │   ├── index.html           # HTML Entry point
│   │   ├── vite.config.ts       # Vite configuration & WebSocket proxy (/ws -> :3001)
│   │   ├── public/              # Aset statis, font, icon
│   │   ├── scripts/             # Script build pembantu (build-icons.mjs)
│   │   ├── src/
│   │   │   ├── main.tsx         # React 19 DOM root & React Router DOM v7
│   │   │   ├── app/             # Komponen halaman & rute SPA
│   │   │   ├── office/          # Game Engine (Phaser 3), WebRTC mesh, state, audio
│   │   │   └── shared/          # Tipe protokol TypeScript (protocol.ts) & helper getEnv
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── server/                  # Backend Realtime Rust (Clean Architecture)
│       ├── Cargo.toml
│       └── src/
│           ├── domain/          # Enterprise Business Rules & Entities
│           │   ├── player.rs    # Entity PlayerState, AvatarLook, status, validasi patch
│           │   ├── map.rs       # Entity MapOp, AreaDef, validasi koordinat & sanitasi
│           │   ├── chat.rs      # Entity ChatMsg, Channel, pembatasan ukuran pesan
│           │   ├── meeting.rs   # Entity Meeting, NewMeeting, aturan prune 24 jam
│           │   └── mod.rs       # Re-export & unit tests domain
│           ├── application/     # Application Business Rules (Use Cases & Ports)
│           │   ├── repository.rs# Interface / Port trait `MapRepository`
│           │   ├── hub.rs       # Core application service `OfficeHub`
│           │   └── mod.rs
│           ├── infrastructure/  # Frameworks & Drivers / Adapters
│           │   ├── file_map_repository.rs # Implementasi disk persistence JSON (debounced)
│           │   └── mod.rs
│           ├── interfaces/      # Interface Adapters (Transport & Delivery)
│           │   ├── protocol.rs  # Serialisasi / deserialisasi pesan WebSocket (Serde)
│           │   ├── websocket.rs # Axum WebSocket connection handler & message loop
│           │   ├── http.rs      # Health check endpoint (/health)
│           │   └── mod.rs       # Axum Router assembly & Static File Server (ServeDir)
│           └── main.rs          # Composition Root & Dependency Injection
│
├── data/                        # File penyimpanan persisten denah kantor (map-state.json)
├── Cargo.toml                   # Root Cargo Workspace
├── pnpm-workspace.yaml          # Root pnpm Workspace
├── package.json                 # Skrip orkestrasi monorepo
└── README.md
```

---

## 🧪 Pengujian & Kompilasi

```bash
# Menjalankan unit tests domain Rust (Clean Architecture)
cargo test

# Pengecekan tipe TypeScript pada frontend React
pnpm typecheck

# Build bundle frontend Vite
pnpm build:web

# Build binary rilis backend Rust
pnpm build:server
```

---

## 🧪 Halaman Pengujian Developer

Tersedia beberapa rute preview untuk pengembangan dan debugging:
- `/dev/avatar`: Preview kustomisasi dan animasi avatar chibi.
- `/dev/build`: Preview posisi duduk dan panel pembangunan denah.
- `/dev/map`: Visualisasi peta kantor.
- `/offline`: Tampilan fallback koneksi terputus.
