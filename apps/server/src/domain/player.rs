use serde::{Deserialize, Serialize};

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

impl PlayerState {
    pub fn new(id: String, name: String, look: AvatarLook, x: f64, y: f64) -> Self {
        let clean_name = name.chars().take(32).collect::<String>().trim().to_string();
        let final_name = if clean_name.is_empty() {
            "Guest".to_string()
        } else {
            clean_name
        };

        Self {
            id,
            name: final_name,
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
        }
    }

    pub fn set_position(&mut self, x: f64, y: f64, dir: Dir) {
        self.x = x.floor() as i32;
        self.y = y.floor() as i32;
        self.dir = dir;
    }

    pub fn apply_patch(&mut self, mut patch: PlayerPatch) -> PlayerPatch {
        if let Some(ref n) = patch.name {
            let cleaned = n.chars().take(32).collect::<String>().trim().to_string();
            patch.name = Some(if cleaned.is_empty() { self.name.clone() } else { cleaned });
            self.name = patch.name.clone().unwrap();
        }
        if let Some(ref st) = patch.status_text {
            let cleaned = st.chars().take(80).collect::<String>();
            patch.status_text = Some(cleaned.clone());
            self.status_text = cleaned;
        }
        if let Some(ref lw) = patch.locked_with {
            let cleaned: Vec<String> = lw.iter().take(50).cloned().collect();
            patch.locked_with = Some(cleaned.clone());
            self.locked_with = cleaned;
        }
        if let Some(s) = patch.status {
            self.status = s;
        }
        if let Some(m) = patch.mic {
            self.mic = m;
        }
        if let Some(c) = patch.cam {
            self.cam = c;
        }
        if let Some(s) = patch.screen {
            self.screen = s;
        }
        if let Some(h) = patch.hand {
            self.hand = h;
        }
        if let Some(ref l) = patch.look {
            self.look = l.clone();
        }
        patch
    }
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
