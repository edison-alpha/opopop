# OPPERA (oppera-web)

OPPERA adalah platform kantor virtual 2D interaktif berbasis web untuk kolaborasi tim jarak jauh (*remote team*). Pengguna dapat berinteraksi secara spasial menggunakan avatar pixel-art, mengobrol secara otomatis saat mendekat (proximity audio/video), masuk ke ruang rapat privat, serta mengubah denah kantor secara real-time (*collaborative build mode*).

---

## 🚀 Fitur Utama

- **Audio & Video Spasial (Mesh WebRTC)**: Berjalan mendekati rekan kerja akan otomatis menghubungkan mic & webcam via WebRTC P2P. Menjauh akan otomatis memutuskan/memudarkan koneksi.
- **Ruang Rapat & Area Privat**: Ruangan dengan pintu dan batas area terisolasi, hanya orang di dalam ruangan yang dapat mendengar dan melihat satu sama lain.
- **Avatar Pixel-Art Kustom**: Renderer avatar chibi prosedural berbasis canvas HTML5 tanpa dependensi file spritesheet eksternal (warna kulit, rambut, pakaian, topi, kacamata, dan aksesoris).
- **Mode Bangun Kantor (Build Mode)**: Editor peta kolaboratif langsung di browser untuk menaruh lantai, furnitur, tanaman, dan membuat ruangan baru. Perubahan tersinkronisasi secara real-time dan disimpan ke disk (`data/map-state.json`).
- **Perekam Rapat Lokal**: Perekaman audio & video langsung di browser via MediaRecorder tanpa perlu backend rendering, menghasilkan file `.webm`.
- **Audio Ambience Ter-sintesis**: Musik latar dan *room tone* hangat yang disintesis secara prosedural menggunakan Web Audio API tanpa file audio statis.
- **Chat & Saluran Komunikasi**: Dukungan multi-channel (`#general`, `#social`), chat jarak dekat (*nearby*), dan *direct message* (DM) dengan dukungan preview gambar & markdown.
- **Command Palette (`Ctrl+K` / `Cmd+K`)**: Akses cepat pencarian rekan, toggle media (mic/kamera/layar), ganti status, dan navigasi ruangan.

---

## 🛠️ Tech Stack & Kebutuhan Sistem

- **Node.js**: `v24+`
- **Rust**: `1.80+` (untuk backend Rust berkinerja tinggi)
- **Package Manager**: `pnpm` (disarankan)
- **Frontend Framework**: Next.js 15, React 18 / 19, TypeScript
- **Game Engine**: Phaser 3 (Canvas 2D renderer)
- **Backend Hub**:
  - **Node.js Server**: HTTP + WebSocket (`ws`) via `server.ts`
  - **Rust Server (Opsional)**: Axum + Tokio WebSocket Hub di `server-rust/`
- **P2P Networking**: WebRTC Mesh dengan Google STUN (`stun:stun.l.google.com:19302`)

---

## 📦 Struktur Direktori

```text
├── data/                  # Penyimpanan persisten (map-state.json)
├── public/                # Asset publik, font, dan icon
├── scripts/               # Helper script build (misal: build-icons.mjs)
├── server.ts              # Server Node.js bawaan: HTTP + WebSocket (/ws)
├── server-rust/           # Backend realtime performa tinggi berbasis Rust (Axum + Tokio)
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs        # Axum HTTP & WebSocket upgrade router
│       ├── protocol.rs    # Wire protocol tipe ClientMsg & ServerMsg (Serde)
│       ├── realtime.rs    # State hub, chat, dan WebRTC signaling
│       └── map_state.rs   # Validasi op peta & disk persistence
└── src/
    ├── app/               # Next.js App Router (halaman landing, app, dev tools)
    ├── office/            # Logika klien kantor virtual
    │   ├── game/          # Engine Phaser, peta, avatar, dan pixel primitives
    │   ├── net/           # WebRTC mesh (rtc.ts) & WebSocket client (socket.ts)
    │   ├── ui/            # Komponen UI React (modal, chat, dock, build panel)
    │   ├── ambient.ts     # Synthesizer Web Audio API
    │   ├── recorder.ts    # Perekam rapat lokal
    │   └── store.ts       # Global state management
    ├── server/            # Server TypeScript asli
    └── shared/            # Tipe data & wire protocol bersama
```

---

## 💻 Cara Menjalankan

### 1. Instalasi Dependensi Frontend
```bash
pnpm install
```

### 2. Opsi A: Menjalankan Server Bawaan (Node.js)
Menjalankan Next.js dan WebSocket Hub TypeScript dalam satu proses:
```bash
pnpm dev
```
Buka browser di `http://localhost:3000`.

### 3. Opsi B: Menjalankan Server Rust (High Performance)
Buka 2 terminal:

**Terminal 1 (Backend Rust di Port 3001):**
```bash
pnpm dev:rust
# atau: cd server-rust && cargo run
```

**Terminal 2 (Frontend Next.js di Port 3000):**
```bash
pnpm dev:next
```
> Next.js secara otomatis mem-proxy route `/ws` ke backend Rust (`http://127.0.0.1:3001/ws`). Atau Anda dapat mengatur `NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws`.

---

### Pengecekan & Build

```bash
# Typecheck TypeScript
pnpm typecheck

# Build frontend Next.js
pnpm build

# Build binary release Rust server
pnpm build:rust
```

---

## 🧪 Halaman Pengujian Developer

Tersedia beberapa rute preview untuk pengembangan dan debugging:
- `/dev/avatar`: Preview kustomisasi dan animasi avatar chibi.
- `/dev/build`: Preview posisi duduk dan panel pembangunan denah.
- `/dev/map`: Visualisasi peta kantor.
- `/offline`: Tampilan fallback koneksi terputus.
