use serde::{Deserialize, Serialize};

pub const MAX_MEETINGS: usize = 200;

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

impl NewMeeting {
    pub fn sanitize(self, creator_id: String, creator_name: String) -> Option<Meeting> {
        let title = self.title.chars().take(80).collect::<String>().trim().to_string();
        if title.is_empty() {
            return None;
        }
        let duration_min = self.duration_min.unwrap_or(30).clamp(5, 480);
        let room = self.room.chars().take(40).collect::<String>();
        let description = self
            .description
            .unwrap_or_default()
            .chars()
            .take(500)
            .collect::<String>();

        Some(Meeting {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            room,
            start: self.start,
            duration_min,
            description,
            created_by: creator_id,
            created_by_name: creator_name,
        })
    }
}
