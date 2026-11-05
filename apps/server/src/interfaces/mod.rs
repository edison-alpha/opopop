pub mod http;
pub mod protocol;
pub mod websocket;

use std::path::Path;
use std::sync::Arc;
use axum::{routing::get, Router};
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};

use crate::application::{MapRepository, OfficeHub};

pub fn create_router<R: MapRepository>(hub: Arc<OfficeHub<R>>) -> Router {
    let mut router = Router::new()
        .route("/ws", get(websocket::ws_handler::<R>))
        .route("/health", get(http::health_handler));

    let static_dir = if Path::new("apps/web/dist").exists() {
        Some("apps/web/dist".to_string())
    } else if Path::new("../web/dist").exists() {
        Some("../web/dist".to_string())
    } else {
        None
    };

    if let Some(dir) = static_dir {
        let index_file = format!("{}/index.html", dir);
        let serve_service = ServeDir::new(&dir).fallback(ServeFile::new(&index_file));
        router = router.fallback_service(serve_service);
    }

    router
        .layer(CorsLayer::permissive())
        .with_state(hub)
}
