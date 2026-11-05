# OPPERA Monorepo (React 19 + Rust Realtime Hub)

Platform kantor virtual 2D interaktif berbasis web untuk kolaborasi tim jarak jauh (*remote team*). Arsitektur proyek menggunakan struktur **Monorepo** dengan pemisahan tegas antara antarmuka pengguna SPA ultra-cepat (**Frontend React 19 + Vite 6**) dan backend realtime performa tinggi (**Backend Rust Axum + Tokio**) yang menerapkan prinsip **Clean Architecture**.

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
│   │   │   └── shared/          # Tipe protokol TypeScript (protocol.ts)
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

## 🚀 Fitur Utama

- **Frontend React 19 + Vite 6**: Tanpa overhead SSR. Load instan, HMR kilat, rendering murni client-side untuk Phaser 3 canvas, WebRTC, dan Web Audio.
- **Backend Realtime Rust (Ultra-low Latency)**: Penanganan WebSocket, pergerakan avatar, chat, dan WebRTC signaling menggunakan Rust + Axum + Tokio dengan memory footprint sangat kecil (< 20 MB RAM).
- **Single-Binary Production Deployment**: Server Rust Axum dapat langsung menyajikan bundle static build frontend (`apps/web/dist`) via `tower-http/fs`. Tidak membutuhkan runtime Node.js di server produksi!
- **Audio & Video Spasial (Mesh WebRTC)**: Berjalan mendekati rekan kerja akan otomatis menghubungkan mic & webcam via WebRTC P2P. Menjauh akan otomatis memutuskan/memudarkan koneksi.
- **Ruang Rapat & Area Privat**: Ruangan dengan pintu dan batas area terisolasi, hanya orang di dalam ruangan yang dapat mendengar dan melihat satu sama lain.
- **Avatar Pixel-Art Kustom Prosedural**: Renderer avatar chibi prosedural berbasis canvas HTML5 tanpa dependensi file spritesheet raster eksternal.
- **Mode Bangun Kantor Kolaboratif**: Editor denah kantor real-time di browser dengan sinkronisasi instan ke server Rust dan penyimpanan persisten ke `data/map-state.json`.
- **Perekam Rapat Lokal**: Perekaman audio & video langsung di browser via MediaRecorder tanpa perlu backend encoding.
- **Audio Ambience Sintesis**: Musik latar dan *room tone* hangat yang disintesis secara prosedural menggunakan Web Audio API.

---

## 🛠️ Persyaratan Sistem

- **Node.js**: `v24+`
- **Rust & Cargo**: `1.80+`
- **Package Manager**: `pnpm` (disarankan)

---

## 💻 Cara Menjalankan

### 1. Instalasi Dependensi
Jalankan dari root direktori proyek:
```bash
pnpm install
```

### 2. Mode Pengembangan (Development)
Jalankan backend Rust dan frontend Vite secara berdampingan:

**Terminal 1 (Backend Rust):**
```bash
pnpm dev:server
# atau: cargo run --manifest-path apps/server/Cargo.toml
```
Server Rust akan aktif di `http://0.0.0.0:3001` dengan endpoint:
- `/ws` : WebSocket hub realtime.
- `/health` : Pemeriksaan status service JSON.

**Terminal 2 (Frontend React 19 + Vite):**
```bash
pnpm dev:web
# atau: pnpm dev
```
Buka browser di `http://localhost:3000`. Vite secara otomatis mem-proxy route `/ws` ke backend Rust pada port 3001.

---

### 3. Mode Produksi (Single Binary Deployment)
Anda dapat mem-bundle frontend ke `apps/web/dist` dan menyajikannya langsung melalui binary Rust:

```bash
# 1. Build bundle statis React 19
pnpm build:web

# 2. Build executable release Rust
pnpm build:server

# 3. Jalankan binary produksi
./target/release/server
```
Buka browser langsung di `http://localhost:3001`. Seluruh aplikasi web dan WebSocket berjalan mandiri dari satu binary Rust!

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
