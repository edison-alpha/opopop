use serde::{Deserialize, Serialize};

pub const MAX_COORD: i32 = 500;
pub const MAX_ENTRIES: usize = 60_000;

fn is_valid_id(s: &str) -> bool {
    !s.is_empty() && s.len() <= 24 && s.chars().all(|c| c.is_ascii_alphabetic())
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

impl AreaDef {
    pub fn sanitize(mut self) -> Option<Self> {
        let name = self.name.trim();
        if name.is_empty() {
            return None;
        }
        self.name = name.chars().take(40).collect();
        if self.x < 0 || self.x >= MAX_COORD || self.y < 0 || self.y >= MAX_COORD {
            return None;
        }
        if self.w <= 0 || self.w > 120 || self.h <= 0 || self.h > 120 {
            return None;
        }
        if self.label.is_none() {
            self.label = Some(true);
        }
        Some(self)
    }
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

impl MapOp {
    pub fn sanitize(self) -> Option<Self> {
        match self {
            MapOp::Obj { x, y, o } => {
                if x < 0 || x >= MAX_COORD || y < 0 || y >= MAX_COORD {
                    return None;
                }
                if let Some(ref obj_id) = o {
                    if !is_valid_id(obj_id) {
                        return None;
                    }
                }
                Some(MapOp::Obj { x, y, o })
            }
            MapOp::Floor { x, y, f } => {
                if x < 0 || x >= MAX_COORD || y < 0 || y >= MAX_COORD {
                    return None;
                }
                if !is_valid_id(&f) {
                    return None;
                }
                Some(MapOp::Floor { x, y, f })
            }
            MapOp::Area { area } => area.sanitize().map(|a| MapOp::Area { area: a }),
            MapOp::AreaDel { name } => {
                let trimmed = name.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(MapOp::AreaDel {
                        name: trimmed.chars().take(40).collect(),
                    })
                }
            }
            MapOp::Reset => Some(MapOp::Reset),
        }
    }

    pub fn deduplication_key(&self) -> String {
        match self {
            MapOp::Obj { x, y, .. } => format!("o:{},{}", x, y),
            MapOp::Floor { x, y, .. } => format!("f:{},{}", x, y),
            MapOp::Area { area } => format!("a:{}", area.name),
            MapOp::AreaDel { name } => format!("a:{}", name),
            MapOp::Reset => "reset".to_string(),
        }
    }

    pub fn execution_rank(&self) -> u8 {
        match self {
            MapOp::Floor { .. } => 0,
            MapOp::Obj { .. } => 1,
            _ => 2,
        }
    }
}
