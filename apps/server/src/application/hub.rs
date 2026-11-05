use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;
use tracing::info;

use crate::application::repository::MapRepository;
use crate::domain::*;

fn current_time_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[derive(Clone)]
pub enum OutgoingMessage {
    Welcome {
        id: String,
        players: Vec<PlayerState>,
        history: Vec<ChatMsg>,
        meetings: Vec<Meeting>,
        channels: Vec<Channel>,
        map_ops: Vec<MapOp>,
    },
    Joined {
        player: PlayerState,
    },
    Left {
        id: String,
    },
    Moved {
        id: String,
        x: i32,
        y: i32,
        dir: Dir,
    },
    Updated {
        id: String,
        patch: PlayerPatch,
    },
    Chat {
        msg: ChatMsg,
    },
    React {
        id: String,
        emoji: String,
    },
    MapEdit {
        ops: Vec<MapOp>,
        by: String,
    },
    Signal {
        from: String,
        data: serde_json::Value,
    },
    Wave {
        from: String,
    },
    Meetings {
        meetings: Vec<Meeting>,
    },
    Channels {
        channels: Vec<Channel>,
    },
}

pub struct HubData {
    pub players: HashMap<String, PlayerState>,
    pub sockets: HashMap<String, mpsc::UnboundedSender<OutgoingMessage>>,
    pub channels: Vec<Channel>,
    pub history: HashMap<String, Vec<ChatMsg>>,
    pub meetings: Vec<Meeting>,
}

pub struct OfficeHub<R: MapRepository> {
    data: RwLock<HubData>,
    map_repo: Arc<R>,
}

impl<R: MapRepository> OfficeHub<R> {
    pub fn new(map_repo: Arc<R>) -> Self {
        let channels = vec![
            Channel {
                name: "general".to_string(),
                topic: "Share company-wide updates, wins, announcements".to_string(),
            },
            Channel {
                name: "social".to_string(),
                topic: "Hang out, share photos, and get to know each other".to_string(),
            },
        ];
        let mut history = HashMap::new();
        for c in &channels {
            history.insert(c.name.clone(), Vec::new());
        }

        Self {
            data: RwLock::new(HubData {
                players: HashMap::new(),
                sockets: HashMap::new(),
                channels,
                history,
                meetings: Vec::new(),
            }),
            map_repo,
        }
    }

    pub async fn register_peer(&self, id: String, tx: mpsc::UnboundedSender<OutgoingMessage>) {
        let mut guard = self.data.write().await;
        guard.sockets.insert(id, tx);
    }

    pub async fn unregister_peer(&self, id: &str, joined: bool) {
        let mut guard = self.data.write().await;
        guard.sockets.remove(id);
        if joined {
            guard.players.remove(id);
            Self::broadcast_internal(&guard, OutgoingMessage::Left { id: id.to_string() }, None);
            info!("Player {} left the office", id);
        }
    }

    pub async fn handle_join(
        &self,
        player_id: &str,
        name: String,
        role: String,
        look: AvatarLook,
        x: f64,
        y: f64,
    ) {
        let mut player = PlayerState::new(player_id.to_string(), name, look, x, y);
        player.apply_patch(PlayerPatch { role: Some(role), ..Default::default() });
        let join_msg = ChatMsg {
            id: Uuid::new_v4().to_string(),
            from: player_id.to_string(),
            from_name: player.name.clone(),
            text: format!("{} joined", player.name),
            scope: ChatScope::Channel,
            channel: Some("general".to_string()),
            to: None,
            image: None,
            system: Some(true),
            ts: current_time_ms(),
        };

        let map_ops = self.map_repo.snapshot().await;

        let (welcome, joined_event, chat_event) = {
            let mut guard = self.data.write().await;
            guard.players.insert(player_id.to_string(), player.clone());

            // Prune meetings
            let now = current_time_ms() as f64;
            let cutoff = now - 24.0 * 3600_000.0;
            guard.meetings.retain(|m| m.start + (m.duration_min as f64 * 60_000.0) > cutoff);
            guard.meetings.sort_by(|a, b| a.start.partial_cmp(&b.start).unwrap_or(std::cmp::Ordering::Equal));

            // Push join message to general history
            if let Some(list) = guard.history.get_mut("general") {
                list.push(join_msg.clone());
                if list.len() > HISTORY_PER_CHANNEL {
                    list.remove(0);
                }
            }

            let mut all_hist: Vec<ChatMsg> = guard.history.values().flatten().cloned().collect();
            all_hist.sort_by_key(|m| m.ts);

            let welcome = OutgoingMessage::Welcome {
                id: player_id.to_string(),
                players: guard.players.values().cloned().collect(),
                history: all_hist,
                meetings: guard.meetings.clone(),
                channels: guard.channels.clone(),
                map_ops,
            };

            (
                welcome,
                OutgoingMessage::Joined { player },
                OutgoingMessage::Chat { msg: join_msg },
            )
        };

        let guard = self.data.read().await;
        Self::send_internal(&guard, player_id, welcome);
        Self::broadcast_internal(&guard, joined_event, Some(player_id));
        Self::broadcast_internal(&guard, chat_event, Some(player_id));
    }

    pub async fn handle_move(&self, player_id: &str, x: f64, y: f64, dir: Dir) {
        let msg = {
            let mut guard = self.data.write().await;
            if let Some(player) = guard.players.get_mut(player_id) {
                player.set_position(x, y, dir);
                Some(OutgoingMessage::Moved {
                    id: player_id.to_string(),
                    x: player.x,
                    y: player.y,
                    dir,
                })
            } else {
                None
            }
        };

        if let Some(msg) = msg {
            let guard = self.data.read().await;
            Self::broadcast_internal(&guard, msg, Some(player_id));
        }
    }

    pub async fn handle_update(&self, player_id: &str, patch: PlayerPatch) {
        let msg = {
            let mut guard = self.data.write().await;
            if let Some(player) = guard.players.get_mut(player_id) {
                let sanitized_patch = player.apply_patch(patch);
                Some(OutgoingMessage::Updated {
                    id: player_id.to_string(),
                    patch: sanitized_patch,
                })
            } else {
                None
            }
        };

        if let Some(msg) = msg {
            let guard = self.data.read().await;
            Self::broadcast_internal(&guard, msg, Some(player_id));
        }
    }

    pub async fn handle_chat(
        &self,
        player_id: &str,
        text: Option<String>,
        scope: Option<ChatScope>,
        channel: Option<String>,
        recipients: Option<Vec<String>>,
        to: Option<String>,
        image: Option<String>,
    ) {
        let clean_text = text
            .unwrap_or_default()
            .chars()
            .take(MAX_TEXT)
            .collect::<String>()
            .trim()
            .to_string();

        let clean_image = image.and_then(|img| {
            if img.starts_with("data:image/") && img.len() <= MAX_IMAGE {
                Some(img)
            } else {
                None
            }
        });

        if clean_text.is_empty() && clean_image.is_none() {
            return;
        }

        let chat_scope = match scope {
            Some(ChatScope::Nearby) => ChatScope::Nearby,
            Some(ChatScope::Dm) => ChatScope::Dm,
            _ => ChatScope::Channel,
        };

        let guard = self.data.read().await;
        let sender_name = match guard.players.get(player_id) {
            Some(p) => p.name.clone(),
            None => return,
        };
        drop(guard);

        let mut chat = ChatMsg {
            id: Uuid::new_v4().to_string(),
            from: player_id.to_string(),
            from_name: sender_name,
            text: clean_text,
            scope: chat_scope,
            channel: None,
            to: None,
            image: clean_image,
            system: None,
            ts: current_time_ms(),
        };

        match chat_scope {
            ChatScope::Channel => {
                let ch_name = Channel::sanitize_name(&channel.unwrap_or_default());
                let mut guard = self.data.write().await;
                if !guard.history.contains_key(&ch_name) {
                    return;
                }
                chat.channel = Some(ch_name.clone());
                if let Some(list) = guard.history.get_mut(&ch_name) {
                    list.push(chat.clone());
                    if list.len() > HISTORY_PER_CHANNEL {
                        list.remove(0);
                    }
                }
                Self::broadcast_internal(&guard, OutgoingMessage::Chat { msg: chat }, None);
            }
            ChatScope::Dm => {
                if let Some(target_id) = to {
                    let guard = self.data.read().await;
                    if guard.players.contains_key(&target_id) {
                        chat.to = Some(target_id.clone());
                        let msg = OutgoingMessage::Chat { msg: chat };
                        Self::send_internal(&guard, player_id, msg.clone());
                        if target_id != player_id {
                            Self::send_internal(&guard, &target_id, msg);
                        }
                    }
                }
            }
            ChatScope::Nearby => {
                let mut targets: HashSet<String> = recipients.unwrap_or_default().into_iter().collect();
                targets.insert(player_id.to_string());
                let guard = self.data.read().await;
                let msg = OutgoingMessage::Chat { msg: chat };
                for t in targets {
                    Self::send_internal(&guard, &t, msg.clone());
                }
            }
        }
    }

    pub async fn handle_channel_create(&self, name: String, topic: String) {
        let clean_name = Channel::sanitize_name(&name);
        let mut guard = self.data.write().await;
        if clean_name.is_empty()
            || guard.history.contains_key(&clean_name)
            || guard.channels.len() >= MAX_CHANNELS
        {
            return;
        }
        let clean_topic = topic.chars().take(140).collect::<String>();
        guard.channels.push(Channel {
            name: clean_name.clone(),
            topic: clean_topic,
        });
        guard.history.insert(clean_name, Vec::new());
        let channels_clone = guard.channels.clone();
        Self::broadcast_internal(&guard, OutgoingMessage::Channels { channels: channels_clone }, None);
    }

    pub async fn handle_react(&self, player_id: &str, emoji: String) {
        let clean_emoji = emoji.chars().take(8).collect::<String>();
        let guard = self.data.read().await;
        Self::broadcast_internal(
            &guard,
            OutgoingMessage::React {
                id: player_id.to_string(),
                emoji: clean_emoji,
            },
            None,
        );
    }

    pub async fn handle_map_edit(&self, player_id: &str, ops: Vec<MapOp>) {
        let cleaned: Vec<MapOp> = ops.into_iter().take(5000).filter_map(|o| o.sanitize()).collect();
        let applied = self.map_repo.apply(cleaned).await;
        if !applied.is_empty() {
            let guard = self.data.read().await;
            Self::broadcast_internal(
                &guard,
                OutgoingMessage::MapEdit {
                    ops: applied,
                    by: player_id.to_string(),
                },
                Some(player_id),
            );
        }
    }

    pub async fn handle_signal(&self, player_id: &str, to: String, data: serde_json::Value) {
        let guard = self.data.read().await;
        Self::send_internal(
            &guard,
            &to,
            OutgoingMessage::Signal {
                from: player_id.to_string(),
                data,
            },
        );
    }

    pub async fn handle_wave(&self, player_id: &str, to: String) {
        let guard = self.data.read().await;
        Self::send_internal(&guard, &to, OutgoingMessage::Wave { from: player_id.to_string() });
    }

    pub async fn handle_meeting_create(&self, player_id: &str, new_meeting: NewMeeting) {
        let mut guard = self.data.write().await;
        if guard.meetings.len() >= MAX_MEETINGS {
            return;
        }
        let creator_name = guard
            .players
            .get(player_id)
            .map(|p| p.name.clone())
            .unwrap_or_else(|| "Guest".to_string());

        if let Some(meeting) = new_meeting.sanitize(player_id.to_string(), creator_name) {
            guard.meetings.push(meeting);
            let meetings_clone = guard.meetings.clone();
            Self::broadcast_internal(&guard, OutgoingMessage::Meetings { meetings: meetings_clone }, None);
        }
    }

    pub async fn handle_meeting_delete(&self, player_id: &str, meeting_id: String) {
        let mut guard = self.data.write().await;
        let before = guard.meetings.len();
        guard.meetings.retain(|m| !(m.id == meeting_id && m.created_by == player_id));
        if guard.meetings.len() != before {
            let meetings_clone = guard.meetings.clone();
            Self::broadcast_internal(&guard, OutgoingMessage::Meetings { meetings: meetings_clone }, None);
        }
    }

    fn send_internal(guard: &HubData, id: &str, msg: OutgoingMessage) {
        if let Some(tx) = guard.sockets.get(id) {
            let _ = tx.send(msg);
        }
    }

    fn broadcast_internal(guard: &HubData, msg: OutgoingMessage, except: Option<&str>) {
        for (id, tx) in &guard.sockets {
            if except != Some(id.as_str()) {
                let _ = tx.send(msg.clone());
            }
        }
    }
}
