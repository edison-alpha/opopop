use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{Mutex, Notify};
use tracing::{error, info};

use crate::application::repository::MapRepository;
use crate::domain::{MapOp, MAX_ENTRIES};

struct FileMapInner {
    entries: HashMap<String, (usize, MapOp)>,
    order_seq: usize,
    file_path: PathBuf,
}

pub struct FileMapRepository {
    inner: Arc<Mutex<FileMapInner>>,
    save_notify: Arc<Notify>,
}

impl FileMapRepository {
    pub fn new(file_path: PathBuf) -> Self {
        let mut entries = HashMap::new();
        let mut order_seq = 0;

        if let Ok(content) = fs::read_to_string(&file_path) {
            if let Ok(raw_ops) = serde_json::from_str::<Vec<MapOp>>(&content) {
                for op in raw_ops {
                    if let Some(c) = op.sanitize() {
                        if !matches!(c, MapOp::Reset) {
                            let k = c.deduplication_key();
                            entries.insert(k, (order_seq, c));
                            order_seq += 1;
                        }
                    }
                }
                info!("Loaded {} map edits from {:?}", entries.len(), file_path);
            }
        }

        let inner = Arc::new(Mutex::new(FileMapInner {
            entries,
            order_seq,
            file_path,
        }));
        let save_notify = Arc::new(Notify::new());

        // Spawn background debounced file persistence worker
        let worker_inner = inner.clone();
        let worker_notify = save_notify.clone();
        tokio::spawn(async move {
            loop {
                worker_notify.notified().await;
                // Debounce for 1 second
                tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

                let (snapshot, path) = {
                    let guard = worker_inner.lock().await;
                    let mut all: Vec<_> = guard.entries.values().cloned().collect();
                    all.sort_by(|a, b| a.1.execution_rank().cmp(&b.1.execution_rank()).then_with(|| a.0.cmp(&b.0)));
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
}

impl MapRepository for FileMapRepository {
    async fn apply(&self, ops: Vec<MapOp>) -> Vec<MapOp> {
        let mut guard = self.inner.lock().await;
        let mut applied = Vec::new();

        for op in ops {
            if matches!(op, MapOp::Reset) {
                guard.entries.clear();
                applied.push(op);
                continue;
            }

            let k = op.deduplication_key();
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

    async fn snapshot(&self) -> Vec<MapOp> {
        let guard = self.inner.lock().await;
        let mut all: Vec<_> = guard.entries.values().cloned().collect();
        all.sort_by(|a, b| a.1.execution_rank().cmp(&b.1.execution_rank()).then_with(|| a.0.cmp(&b.0)));
        all.into_iter().map(|(_, op)| op).collect()
    }
}
