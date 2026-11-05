use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;
use tracing::info;

use crate::map_state::{clean_op, MapState};
use crate::protocol::*;

const HISTORY_PER_CHANNEL: usize = 300;
const MAX_TEXT: usize = 4000;
const MAX_IMAGE: usize = 600_000;
const MAX_MEETINGS: usize = 200;
const MAX_CHANNELS: usize = 50;

fn clamp_str(s: &str, n: usize) -> String {
    s.chars().take(n).collect()
}

fn channel_name(s: &str) -> String {
    let lower = clamp_str(s, 40).to_lowercase();
    let trimmed = lower.trim();
    let mut result = String::new();
    let mut prev_space = false;
    for c in trimmed.chars() {
        if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
            result.push(c);
            prev_space = false;
        } else if c.is_whitespace() {
            if !prev_space {
                result.push('-');
                prev_space = true;
            }
        }
    }
    result
}

fn current_time_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub struct HubState {
    pub players: HashMap<String, PlayerState>,
    pub sockets: HashMap<String, mpsc::UnboundedSender<ServerMsg>>,
    pub channels: Vec<Channel>,
    pub history: HashMap<String, Vec<ChatMsg>>,
    pub meetings: Vec<Meeting>,
    pub map: MapState,
}

impl HubState {
    pub fn new(map: MapState) -> Self {
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
            players: HashMap::new(),
            sockets: HashMap::new(),
            channels,
            history,
            meetings: Vec::new(),
            map,
        }
    }

    pub fn push_history(&mut self, m: ChatMsg) {
        if let Some(ref ch) = m.channel {
            let list = self.history.entry(ch.clone()).or_default();
            list.push(m);
            if list.len() > HISTORY_PER_CHANNEL {
                list.remove(0);
            }
        }
    }

    pub fn all_history(&self) -> Vec<ChatMsg> {
        let mut all: Vec<ChatMsg> = self.history.values().flatten().cloned().collect();
        all.sort_by_key(|m| m.ts);
        all
    }

    pub fn prune_meetings(&mut self) {
        let now = current_time_ms() as f64;
        let cutoff = now - 24.0 * 3600_000.0;
        self.meetings.retain(|m| m.start + (m.duration_min as f64 * 60_000.0) > cutoff);
        self.meetings.sort_by(|a, b| a.start.partial_cmp(&b.start).unwrap_or(std::cmp::Ordering::Equal));
    }

    pub fn send_to(&self, id: &str, msg: ServerMsg) {
        if let Some(tx) = self.sockets.get(id) {
            let _ = tx.send(msg);
        }
    }

    pub fn broadcast(&self, msg: ServerMsg, except: Option<&str>) {
        for (id, tx) in &self.sockets {
            if except != Some(id.as_str()) {
                let _ = tx.send(msg.clone());
            }
        }
    }
}

pub type SharedHub = Arc<RwLock<HubState>>;

pub async fn handle_client_message(
    hub: &SharedHub,
    player_id: &str,
    joined: &mut bool,
    msg: ClientMsg,
) {
    match msg {
        ClientMsg::Join { name, look, x, y } => {
            if *joined {
                return;
            }
            *joined = true;

            let clean_name = clamp_str(&name, 32).trim().to_string();
            let final_name = if clean_name.is_empty() {
                "Guest".to_string()
            } else {
                clean_name
            };

            let player = PlayerState {
                id: player_id.to_string(),
                name: final_name.clone(),
                look,
                x: x.floor() as i32,
                y: y.floor() as i32,
                dir: Dir::Down,
                status: Status::Available,
                status_text: String::new(),
                mic: false,
                cam: false,
                screen: false,
                hand: false,
                locked_with: Vec::new(),
            };

            let (welcome_msg, join_player_msg, join_chat_msg) = {
                let mut state = hub.write().await;
                state.players.insert(player_id.to_string(), player.clone());
                state.prune_meetings();

                let join_msg = ChatMsg {
                    id: Uuid::new_v4().to_string(),
                    from: player_id.to_string(),
                    from_name: final_name,
                    text: format!("{} joined", player.name),
                    scope: ChatScope::Channel,
                    channel: Some("general".to_string()),
                    to: None,
                    image: None,
                    system: Some(true),
                    ts: current_time_ms(),
                };
                state.push_history(join_msg.clone());

                let map_ops = state.map.snapshot().await;
                let welcome = ServerMsg::Welcome {
                    id: player_id.to_string(),
                    players: state.players.values().cloned().collect(),
                    history: state.all_history(),
                    meetings: state.meetings.clone(),
                    channels: state.channels.clone(),
                    map_ops: Some(map_ops),
                };

                (welcome, ServerMsg::Joined { player }, ServerMsg::Chat { msg: join_msg })
            };

            let state = hub.read().await;
            state.send_to(player_id, welcome_msg);
            state.broadcast(join_player_msg, Some(player_id));
            state.broadcast(join_chat_msg, Some(player_id));
        }

        ClientMsg::Move { x, y, dir } => {
            if !*joined {
                return;
            }
            let moved_msg = {
                let mut state = hub.write().await;
                if let Some(me) = state.players.get_mut(player_id) {
                    me.x = x.floor() as i32;
                    me.y = y.floor() as i32;
                    me.dir = dir;
                    Some(ServerMsg::Moved {
                        id: player_id.to_string(),
                        x: me.x,
                        y: me.y,
                        dir: me.dir,
                    })
                } else {
                    None
                }
            };
            if let Some(msg) = moved_msg {
                let state = hub.read().await;
                state.broadcast(msg, Some(player_id));
            }
        }

        ClientMsg::Update { mut patch } => {
            if !*joined {
                return;
            }
            let updated_msg = {
                let mut state = hub.write().await;
                if let Some(me) = state.players.get_mut(player_id) {
                    if let Some(ref n) = patch.name {
                        let cleaned = clamp_str(n, 32).trim().to_string();
                        patch.name = Some(if cleaned.is_empty() { me.name.clone() } else { cleaned });
                        me.name = patch.name.clone().unwrap();
                    }
                    if let Some(ref st) = patch.status_text {
                        let cleaned = clamp_str(st, 80);
                        patch.status_text = Some(cleaned.clone());
                        me.status_text = cleaned;
                    }
                    if let Some(ref lw) = patch.locked_with {
                        let cleaned: Vec<String> = lw.iter().take(50).cloned().collect();
                        patch.locked_with = Some(cleaned.clone());
                        me.locked_with = cleaned;
                    }
                    if let Some(s) = patch.status {
                        me.status = s;
                    }
                    if let Some(m) = patch.mic {
                        me.mic = m;
                    }
                    if let Some(c) = patch.cam {
                        me.cam = c;
                    }
                    if let Some(s) = patch.screen {
                        me.screen = s;
                    }
                    if let Some(h) = patch.hand {
                        me.hand = h;
                    }
                    if let Some(ref l) = patch.look {
                        me.look = l.clone();
                    }
                    Some(ServerMsg::Updated {
                        id: player_id.to_string(),
                        patch,
                    })
                } else {
                    None
                }
            };
            if let Some(msg) = updated_msg {
                let state = hub.read().await;
                state.broadcast(msg, Some(player_id));
            }
        }

        ClientMsg::Chat {
            text,
            scope,
            channel,
            recipients,
            to,
            image,
        } => {
            if !*joined {
                return;
            }
            let text_val = text.unwrap_or_default();
            let clean_text = clamp_str(&text_val, MAX_TEXT).trim().to_string();

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

            let state_read = hub.read().await;
            let sender_name = match state_read.players.get(player_id) {
                Some(p) => p.name.clone(),
                None => return,
            };
            drop(state_read);

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
                    let ch_raw = channel.unwrap_or_default();
                    let ch_name = channel_name(&ch_raw);
                    let mut state = hub.write().await;
                    if !state.history.contains_key(&ch_name) {
                        return;
                    }
                    chat.channel = Some(ch_name);
                    state.push_history(chat.clone());
                    state.broadcast(ServerMsg::Chat { msg: chat }, None);
                }
                ChatScope::Dm => {
                    if let Some(target_id) = to {
                        let state = hub.read().await;
                        if state.players.contains_key(&target_id) {
                            chat.to = Some(target_id.clone());
                            let msg = ServerMsg::Chat { msg: chat };
                            state.send_to(player_id, msg.clone());
                            if target_id != player_id {
                                state.send_to(&target_id, msg);
                            }
                        }
                    }
                }
                ChatScope::Nearby => {
                    let mut targets: HashSet<String> = recipients.unwrap_or_default().into_iter().collect();
                    targets.insert(player_id.to_string());
                    let state = hub.read().await;
                    let msg = ServerMsg::Chat { msg: chat };
                    for t in targets {
                        state.send_to(&t, msg.clone());
                    }
                }
            }
        }

        ClientMsg::ChannelCreate { name, topic } => {
            if !*joined {
                return;
            }
            let c_name = channel_name(&name);
            let mut state = hub.write().await;
            if c_name.is_empty() || state.history.contains_key(&c_name) || state.channels.len() >= MAX_CHANNELS {
                return;
            }
            state.channels.push(Channel {
                name: c_name.clone(),
                topic: clamp_str(&topic, 140),
            });
            state.history.insert(c_name, Vec::new());
            let channels_clone = state.channels.clone();
            state.broadcast(ServerMsg::Channels { channels: channels_clone }, None);
        }

        ClientMsg::React { emoji } => {
            if !*joined {
                return;
            }
            let state = hub.read().await;
            state.broadcast(
                ServerMsg::React {
                    id: player_id.to_string(),
                    emoji: clamp_str(&emoji, 8),
                },
                None,
            );
        }

        ClientMsg::MapEdit { ops } => {
            if !*joined {
                return;
            }
            let cleaned: Vec<MapOp> = ops.into_iter().take(5000).filter_map(clean_op).collect();
            let map_clone = {
                let state = hub.read().await;
                state.map.clone()
            };
            let applied = map_clone.apply(cleaned).await;
            if !applied.is_empty() {
                let state = hub.read().await;
                state.broadcast(
                    ServerMsg::MapEdit {
                        ops: applied,
                        by: player_id.to_string(),
                    },
                    Some(player_id),
                );
            }
        }

        ClientMsg::Signal { to, data } => {
            if !*joined {
                return;
            }
            let state = hub.read().await;
            state.send_to(
                &to,
                ServerMsg::Signal {
                    from: player_id.to_string(),
                    data,
                },
            );
        }

        ClientMsg::Wave { to } => {
            if !*joined {
                return;
            }
            let state = hub.read().await;
            state.send_to(&to, ServerMsg::Wave { from: player_id.to_string() });
        }

        ClientMsg::MeetingCreate { meeting } => {
            if !*joined {
                return;
            }
            let title = clamp_str(&meeting.title, 80).trim().to_string();
            if title.is_empty() {
                return;
            }
            let duration_min = meeting
                .duration_min
                .unwrap_or(30)
                .clamp(5, 480);

            let mut state = hub.write().await;
            state.prune_meetings();
            if state.meetings.len() >= MAX_MEETINGS {
                return;
            }
            let creator_name = state
                .players
                .get(player_id)
                .map(|p| p.name.clone())
                .unwrap_or_else(|| "Guest".to_string());

            state.meetings.push(Meeting {
                id: Uuid::new_v4().to_string(),
                title,
                room: clamp_str(&meeting.room, 40),
                start: meeting.start,
                duration_min,
                description: clamp_str(&meeting.description.unwrap_or_default(), 500),
                created_by: player_id.to_string(),
                created_by_name: creator_name,
            });
            state.prune_meetings();
            let meetings_clone = state.meetings.clone();
            state.broadcast(ServerMsg::Meetings { meetings: meetings_clone }, None);
        }

        ClientMsg::MeetingDelete { id } => {
            if !*joined {
                return;
            }
            let mut state = hub.write().await;
            let before = state.meetings.len();
            state.meetings.retain(|m| !(m.id == id && m.created_by == player_id));
            if state.meetings.len() != before {
                let meetings_clone = state.meetings.clone();
                state.broadcast(ServerMsg::Meetings { meetings: meetings_clone }, None);
            }
        }
    }
}

pub async fn handle_disconnect(hub: &SharedHub, player_id: &str, joined: bool) {
    let mut state = hub.write().await;
    state.sockets.remove(player_id);
    if joined {
        state.players.remove(player_id);
        state.broadcast(ServerMsg::Left { id: player_id.to_string() }, None);
        info!("Player {} disconnected", player_id);
    }
}
