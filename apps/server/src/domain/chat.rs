use serde::{Deserialize, Serialize};

pub const HISTORY_PER_CHANNEL: usize = 300;
pub const MAX_TEXT: usize = 4000;
pub const MAX_IMAGE: usize = 600_000;
pub const MAX_CHANNELS: usize = 50;

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

impl Channel {
    pub fn sanitize_name(raw: &str) -> String {
        let lower = raw.chars().take(40).collect::<String>().to_lowercase();
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
}
