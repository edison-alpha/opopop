# OPPERA Monorepo (Next.js 15 + Rust Realtime Hub)

Platform kantor virtual 2D interaktif berbasis web untuk kolaborasi tim jarak jauh (*remote team*). Arsitektur proyek menggunakan struktur **Monorepo** dengan pemisahan tegas antara antarmuka pengguna (Frontend Next.js 15) dan backend realtime performa tinggi (Backend Rust Axum) yang menerapkan prinsip **Clean Architecture**.

---

## 🏗️ Arsitektur Monorepo & Clean Architecture

```text
operra/
├── apps/
│   ├── web/                     # Frontend Next.js 15 (Pure Client & UI)
│   │   ├── public/              # Aset statis, font, icon
│   │   ├── scripts/             # Script build pembantu (build-icons.mjs)
│   │   ├── src/
│   │   │   ├── app/             # Next.js App Router (Halaman & Rute)
│   │   │   ├── office/          # Game Engine (Phaser 3), WebRTC mesh, state, audio
│   │   │   └── shared/          # Tipe protokol TypeScript (protocol.ts)
│   │   ├── next.config.mjs      # Proxy rewrites /ws -> port 3001
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
│           │   └── mod.rs       # Axum Router assembly
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

- **Audio & Video Spasial (Mesh WebRTC)**: Berjalan mendekati rekan kerja akan otomatis menghubungkan mic & webcam via WebRTC P2P. Menjauh akan otomatis memutuskan/memudarkan koneksi.
- **Backend Realtime Rust (Ultra-low Latency)**: Penanganan WebSocket, pergerakan avatar, chat, dan WebRTC signaling menggunakan Rust + Axum + Tokio dengan memory footprint sangat kecil (< 20 MB RAM).
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

### 2. Menjalankan Server Rust (Backend)
Buka terminal 1:
```bash
pnpm dev:server
# atau: cargo run --manifest-path apps/server/Cargo.toml
```
Server Rust akan aktif di `http://0.0.0.0:3001` dengan endpoint:
- `/ws` : WebSocket hub realtime.
- `/health` : Pemeriksaan status service JSON.

### 3. Menjalankan Frontend Next.js
Buka terminal 2:
```bash
pnpm dev:web
# atau: pnpm dev
```
Buka browser di `http://localhost:3000`. Next.js secara otomatis mem-proxy route `/ws` ke backend Rust pada port 3001.

---

## 🧪 Pengujian & Kompilasi

```bash
# Menjalankan unit tests domain Rust
cargo test

# Pengecekan tipe TypeScript pada frontend
pnpm typecheck

# Build frontend Next.js
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
