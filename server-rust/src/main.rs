use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::{mpsc, RwLock};
use tower_http::cors::CorsLayer;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;
use uuid::Uuid;

mod map_state;
mod protocol;
mod realtime;

use map_state::MapState;
use protocol::ClientMsg;
use realtime::{handle_client_message, handle_disconnect, HubState, SharedHub};

#[tokio::main]
async fn main() {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber).unwrap();

    // Map persistence file path
    let map_file = PathBuf::from("../data/map-state.json");
    let map_state = MapState::new(map_file);
    let hub_state = Arc::new(RwLock::new(HubState::new(map_state)));

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(health_handler))
        .layer(CorsLayer::permissive())
        .with_state(hub_state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("OPPERA Rust Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "oppera-rust-server"
    }))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(hub): State<SharedHub>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, hub))
}

async fn handle_socket(socket: WebSocket, hub: SharedHub) {
    let player_id: String = Uuid::new_v4()
        .to_string()
        .chars()
        .take(8)
        .collect();

    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel();

    {
        let mut state = hub.write().await;
        state.sockets.insert(player_id.clone(), tx);
    }
    info!("Client connected: {}", player_id);

    // Outgoing messages task
    let send_task = tokio::spawn(async move {
        while let Some(server_msg) = rx.recv().await {
            if let Ok(json) = serde_json::to_string(&server_msg) {
                if ws_sender.send(Message::Text(json.into())).await.is_err() {
                    break;
                }
            }
        }
    });

    // Incoming messages task
    let mut joined = false;
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => {
                match serde_json::from_str::<ClientMsg>(&text) {
                    Ok(client_msg) => {
                        handle_client_message(&hub, &player_id, &mut joined, client_msg).await;
                    }
                    Err(_e) => {
                        // ignore malformed message
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    send_task.abort();
    handle_disconnect(&hub, &player_id, joined).await;
}
