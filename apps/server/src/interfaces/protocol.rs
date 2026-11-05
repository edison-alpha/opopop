use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::application::OutgoingMessage;
use crate::domain::*;

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "t")]
pub enum ClientWireMessage {
    #[serde(rename = "join")]
    Join {
        name: String,
        look: AvatarLook,
        x: f64,
        y: f64,
    },
    #[serde(rename = "move")]
    Move { x: f64, y: f64, dir: Dir },
    #[serde(rename = "chat")]
    Chat {
        text: Option<String>,
        scope: Option<ChatScope>,
        channel: Option<String>,
        recipients: Option<Vec<String>>,
        to: Option<String>,
        image: Option<String>,
    },
    #[serde(rename = "react")]
    React { emoji: String },
    #[serde(rename = "update")]
    Update { patch: PlayerPatch },
    #[serde(rename = "signal")]
    Signal { to: String, data: Value },
    #[serde(rename = "wave")]
    Wave { to: String },
    #[serde(rename = "meeting:create")]
    MeetingCreate { meeting: NewMeeting },
    #[serde(rename = "meeting:delete")]
    MeetingDelete { id: String },
    #[serde(rename = "channel:create")]
    ChannelCreate { name: String, topic: String },
    #[serde(rename = "map:edit")]
    MapEdit { ops: Vec<MapOp> },
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "t")]
pub enum ServerWireMessage {
    #[serde(rename = "welcome")]
    Welcome {
        id: String,
        players: Vec<PlayerState>,
        history: Vec<ChatMsg>,
        meetings: Vec<Meeting>,
        channels: Vec<Channel>,
        #[serde(rename = "mapOps", skip_serializing_if = "Option::is_none")]
        map_ops: Option<Vec<MapOp>>,
    },
    #[serde(rename = "map:edit")]
    MapEdit { ops: Vec<MapOp>, by: String },
    #[serde(rename = "joined")]
    Joined { player: PlayerState },
    #[serde(rename = "left")]
    Left { id: String },
    #[serde(rename = "moved")]
    Moved { id: String, x: i32, y: i32, dir: Dir },
    #[serde(rename = "updated")]
    Updated { id: String, patch: PlayerPatch },
    #[serde(rename = "chat")]
    Chat { msg: ChatMsg },
    #[serde(rename = "react")]
    React { id: String, emoji: String },
    #[serde(rename = "signal")]
    Signal { from: String, data: Value },
    #[serde(rename = "wave")]
    Wave { from: String },
    #[serde(rename = "meetings")]
    Meetings { meetings: Vec<Meeting> },
    #[serde(rename = "channels")]
    Channels { channels: Vec<Channel> },
}

impl From<OutgoingMessage> for ServerWireMessage {
    fn from(msg: OutgoingMessage) -> Self {
        match msg {
            OutgoingMessage::Welcome {
                id,
                players,
                history,
                meetings,
                channels,
                map_ops,
            } => ServerWireMessage::Welcome {
                id,
                players,
                history,
                meetings,
                channels,
                map_ops: Some(map_ops),
            },
            OutgoingMessage::Joined { player } => ServerWireMessage::Joined { player },
            OutgoingMessage::Left { id } => ServerWireMessage::Left { id },
            OutgoingMessage::Moved { id, x, y, dir } => ServerWireMessage::Moved { id, x, y, dir },
            OutgoingMessage::Updated { id, patch } => ServerWireMessage::Updated { id, patch },
            OutgoingMessage::Chat { msg } => ServerWireMessage::Chat { msg },
            OutgoingMessage::React { id, emoji } => ServerWireMessage::React { id, emoji },
            OutgoingMessage::MapEdit { ops, by } => ServerWireMessage::MapEdit { ops, by },
            OutgoingMessage::Signal { from, data } => ServerWireMessage::Signal { from, data },
            OutgoingMessage::Wave { from } => ServerWireMessage::Wave { from },
            OutgoingMessage::Meetings { meetings } => ServerWireMessage::Meetings { meetings },
            OutgoingMessage::Channels { channels } => ServerWireMessage::Channels { channels },
        }
    }
}
