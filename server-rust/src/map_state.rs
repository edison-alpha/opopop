use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{Mutex, Notify};
use tracing::{error, info};

use crate::protocol::{AreaDef, MapOp};

const MAX_COORD: i32 = 500;
const MAX_ENTRIES: usize = 60_000;

fn is_valid_id(s: &str) -> bool {
    s.len() >= 1 && s.len() <= 24 && s.chars().all(|c| c.is_ascii_alphabetic())
}

fn clean_area(mut a: AreaDef) -> Option<AreaDef> {
    let name = a.name.trim();
    if name.is_empty() {
        return None;
    }
    let name = name.chars().take(40).collect::<String>();
    if a.x < 0 || a.x >= MAX_COORD || a.y < 0 || a.y >= MAX_COORD {
        return None;
    }
    if a.w <= 0 || a.w > 120 || a.h <= 0 || a.h > 120 {
        return None;
    }
    a.name = name;
    if a.label.is_none() {
        a.label = Some(true);
    }
    Some(a)
}

pub fn clean_op(op: MapOp) -> Option<MapOp> {
    match op {
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
        MapOp::Area { area } => clean_area(area).map(|a| MapOp::Area { area: a }),
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

fn key_of(op: &MapOp) -> String {
    match op {
        MapOp::Obj { x, y, .. } => format!("o:{},{}", x, y),
        MapOp::Floor { x, y, .. } => format!("f:{},{}", x, y),
        MapOp::Area { area } => format!("a:{}", area.name),
        MapOp::AreaDel { name } => format!("a:{}", name),
        MapOp::Reset => "reset".to_string(),
    }
}

pub struct MapStateInner {
    // Preserve insertion order for ordered snapshot
    entries: HashMap<String, (usize, MapOp)>,
    order_seq: usize,
    file_path: PathBuf,
}

#[derive(Clone)]
pub struct MapState {
    inner: Arc<Mutex<MapStateInner>>,
    save_notify: Arc<Notify>,
}

impl MapState {
    pub fn new(file_path: PathBuf) -> Self {
        let mut entries = HashMap::new();
        let mut order_seq = 0;

        if let Ok(content) = fs::read_to_string(&file_path) {
            if let Ok(raw_ops) = serde_json::from_str::<Vec<MapOp>>(&content) {
                for op in raw_ops {
                    if let Some(c) = clean_op(op) {
                        if !matches!(c, MapOp::Reset) {
                            let k = key_of(&c);
                            entries.insert(k, (order_seq, c));
                            order_seq += 1;
                        }
                    }
                }
                info!("Loaded {} map edits from {:?}", entries.len(), file_path);
            }
        }

        let inner = Arc::new(Mutex::new(MapStateInner {
            entries,
            order_seq,
            file_path,
        }));
        let save_notify = Arc::new(Notify::new());

        // Spawn background debounced file saver
        let saver_inner = inner.clone();
        let saver_notify = save_notify.clone();
        tokio::spawn(async move {
            loop {
                saver_notify.notified().await;
                // Debounce 1 second
                tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

                let (snapshot, path) = {
                    let guard = saver_inner.lock().await;
                    let mut all: Vec<_> = guard.entries.values().cloned().collect();
                    let rank = |op: &MapOp| match op {
                        MapOp::Floor { .. } => 0,
                        MapOp::Obj { .. } => 1,
                        _ => 2,
                    };
                    all.sort_by(|a, b| rank(&a.1).cmp(&rank(&b.1)).then_with(|| a.0.cmp(&b.0)));
                    let ops: Vec<MapOp> = all.into_iter().map(|(_, op)| op).collect();
                    (ops, guard.file_path.clone())
                };

                if let Some(parent) = path.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                if let Ok(json) = serde_json::to_string_pretty(&snapshot) {
                    if let Err(e) = fs::write(&path, json) {
                        error!("Failed to persist map state to {:?}: {}", path, e);
                    } else {
                        info!("Persisted {} map edits to {:?}", snapshot.len(), path);
                    }
                }
            }
        });

        Self { inner, save_notify }
    }

    pub async fn apply(&self, ops: Vec<MapOp>) -> Vec<MapOp> {
        let mut guard = self.inner.lock().await;
        let mut applied = Vec::new();

        for op in ops {
            if matches!(op, MapOp::Reset) {
                guard.entries.clear();
                applied.push(op);
                continue;
            }

            let k = key_of(&op);
            if !guard.entries.contains_key(&k) && guard.entries.len() >= MAX_ENTRIES {
                break;
            }

            guard.order_seq += 1;
            let seq = guard.order_seq;
            guard.entries.insert(k, (seq, op.clone()));
            applied.push(op);
        }

        if !applied.is_empty() {
            self.save_notify.notify_one();
        }

        applied
    }

    pub async fn snapshot(&self) -> Vec<MapOp> {
        let guard = self.inner.lock().await;
        let mut all: Vec<_> = guard.entries.values().cloned().collect();
        let rank = |op: &MapOp| match op {
            MapOp::Floor { .. } => 0,
            MapOp::Obj { .. } => 1,
            _ => 2,
        };
        all.sort_by(|a, b| rank(&a.1).cmp(&rank(&b.1)).then_with(|| a.0.cmp(&b.0)));
        all.into_iter().map(|(_, op)| op).collect()
    }
}
