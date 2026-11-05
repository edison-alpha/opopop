use std::sync::Arc;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use tracing::info;
use uuid::Uuid;

use crate::application::{MapRepository, OfficeHub};
use crate::interfaces::protocol::{ClientWireMessage, ServerWireMessage};

pub async fn ws_handler<R: MapRepository>(
    ws: WebSocketUpgrade,
    State(hub): State<Arc<OfficeHub<R>>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, hub))
}

async fn handle_socket<R: MapRepository>(socket: WebSocket, hub: Arc<OfficeHub<R>>) {
    let player_id: String = Uuid::new_v4()
        .to_string()
        .chars()
        .take(8)
        .collect();

    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel();

    hub.register_peer(player_id.clone(), tx).await;
    info!("Peer connected: {}", player_id);

    // Outgoing messages task
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let wire_msg: ServerWireMessage = msg.into();
            if let Ok(json) = serde_json::to_string(&wire_msg) {
                if ws_sender.send(Message::Text(json.into())).await.is_err() {
                    break;
                }
            }
        }
    });

    // Incoming messages loop
    let mut joined = false;
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => {
                if let Ok(client_msg) = serde_json::from_str::<ClientWireMessage>(&text) {
                    match client_msg {
                        ClientWireMessage::Join { name, look, x, y } => {
                            if !joined {
                                joined = true;
                                hub.handle_join(&player_id, name, look, x, y).await;
                            }
                        }
                        ClientWireMessage::Move { x, y, dir } => {
                            if joined {
                                hub.handle_move(&player_id, x, y, dir).await;
                            }
                        }
                        ClientWireMessage::Update { patch } => {
                            if joined {
                                hub.handle_update(&player_id, patch).await;
                            }
                        }
                        ClientWireMessage::Chat {
                            text,
                            scope,
                            channel,
                            recipients,
                            to,
                            image,
                        } => {
                            if joined {
                                hub.handle_chat(&player_id, text, scope, channel, recipients, to, image).await;
                            }
                        }
                        ClientWireMessage::ChannelCreate { name, topic } => {
                            if joined {
                                hub.handle_channel_create(name, topic).await;
                            }
                        }
                        ClientWireMessage::React { emoji } => {
                            if joined {
                                hub.handle_react(&player_id, emoji).await;
                            }
                        }
                        ClientWireMessage::MapEdit { ops } => {
                            if joined {
                                hub.handle_map_edit(&player_id, ops).await;
                            }
                        }
                        ClientWireMessage::Signal { to, data } => {
                            if joined {
                                hub.handle_signal(&player_id, to, data).await;
                            }
                        }
                        ClientWireMessage::Wave { to } => {
                            if joined {
                                hub.handle_wave(&player_id, to).await;
                            }
                        }
                        ClientWireMessage::MeetingCreate { meeting } => {
                            if joined {
                                hub.handle_meeting_create(&player_id, meeting).await;
                            }
                        }
                        ClientWireMessage::MeetingDelete { id } => {
                            if joined {
                                hub.handle_meeting_delete(&player_id, id).await;
                            }
                        }
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    send_task.abort();
    hub.unregister_peer(&player_id, joined).await;
}
