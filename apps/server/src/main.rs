use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

mod domain;
mod application;
mod infrastructure;
mod interfaces;

use application::OfficeHub;
use infrastructure::FileMapRepository;
use interfaces::create_router;

fn resolve_data_path() -> PathBuf {
    if Path::new("data").exists() {
        PathBuf::from("data/map-state.json")
    } else if Path::new("../../data").exists() {
        PathBuf::from("../../data/map-state.json")
    } else {
        PathBuf::from("../data/map-state.json")
    }
}

#[tokio::main]
async fn main() {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber).unwrap();

    let data_path = resolve_data_path();
    info!("Initializing MapRepository at: {:?}", data_path);

    let map_repo = Arc::new(FileMapRepository::new(data_path));
    let hub = Arc::new(OfficeHub::new(map_repo));
    let app = create_router(hub);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => listener,
        Err(error) => {
            if error.kind() == std::io::ErrorKind::AddrInUse {
                eprintln!("Port {port} is already in use. Run pnpm dev to reuse the existing OPPERA server, or stop the process using that port.");
            } else {
                eprintln!("Could not bind OPPERA to {addr}: {error}");
            }
            std::process::exit(1);
        }
    };
    info!("OPPERA Realtime Hub running on http://{}", addr);
    if let Err(error) = axum::serve(listener, app).await {
        eprintln!("OPPERA server stopped: {error}");
        std::process::exit(1);
    }
}
