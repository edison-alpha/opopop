use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Dir {
    Up,
    Down,
    Left,
    Right,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Available,
    Busy,
    Away,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvatarLook {
    pub skin: String,
    pub hair: String,
    #[serde(rename = "hairStyle")]
    pub hair_style: i32,
    pub shirt: String,
    pub pants: String,
    #[serde(rename = "facialHair", skip_serializing_if = "Option::is_none")]
    pub facial_hair: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jacket: Option<i32>,
    #[serde(rename = "jacketColor", skip_serializing_if = "Option::is_none")]
    pub jacket_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bottom: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shoes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hat: Option<i32>,
    #[serde(rename = "hatColor", skip_serializing_if = "Option::is_none")]
    pub hat_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub glasses: Option<i32>,
    #[serde(rename = "glassesColor", skip_serializing_if = "Option::is_none")]
    pub glasses_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other: Option<i32>,
    #[serde(rename = "otherColor", skip_serializing_if = "Option::is_none")]
    pub other_color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerState {
    pub id: String,
    pub name: String,
    pub look: AvatarLook,
    pub x: i32,
    pub y: i32,
    pub dir: Dir,
    pub status: Status,
    #[serde(rename = "statusText")]
    pub status_text: String,
    pub mic: bool,
    pub cam: bool,
    pub screen: bool,
    pub hand: bool,
    #[serde(rename = "lockedWith")]
    pub locked_with: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PlayerPatch {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub look: Option<AvatarLook>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<Status>,
    #[serde(rename = "statusText", skip_serializing_if = "Option::is_none")]
    pub status_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mic: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cam: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub screen: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hand: Option<bool>,
    #[serde(rename = "lockedWith", skip_serializing_if = "Option::is_none")]
    pub locked_with: Option<Vec<String>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChatScope {
    Channel,
    Nearby,
    Dm,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMsg {
    pub id: String,
    pub from: String,
    #[serde(rename = "fromName")]
    pub from_name: String,
    pub text: String,
    pub scope: ChatScope,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<bool>,
    pub ts: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub name: String,
    pub topic: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Meeting {
    pub id: String,
    pub title: String,
    pub room: String,
    pub start: f64,
    #[serde(rename = "durationMin")]
    pub duration_min: i32,
    #[serde(rename = "createdBy")]
    pub created_by: String,
    #[serde(rename = "createdByName")]
    pub created_by_name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewMeeting {
    pub title: String,
    pub room: String,
    pub start: f64,
    #[serde(rename = "durationMin")]
    pub duration_min: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AreaDef {
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub r#private: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meeting: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "k")]
pub enum MapOp {
    #[serde(rename = "obj")]
    Obj { x: i32, y: i32, o: Option<String> },
    #[serde(rename = "floor")]
    Floor { x: i32, y: i32, f: String },
    #[serde(rename = "area")]
    Area { area: AreaDef },
    #[serde(rename = "areaDel")]
    AreaDel { name: String },
    #[serde(rename = "reset")]
    Reset,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "t")]
pub enum ClientMsg {
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
pub enum ServerMsg {
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
