pub mod http;
pub mod protocol;
pub mod websocket;

use std::sync::Arc;
use axum::{routing::get, Router};
use tower_http::cors::CorsLayer;

use crate::application::{MapRepository, OfficeHub};

pub fn create_router<R: MapRepository>(hub: Arc<OfficeHub<R>>) -> Router {
    Router::new()
        .route("/ws", get(websocket::ws_handler::<R>))
        .route("/health", get(http::health_handler))
        .layer(CorsLayer::permissive())
        .with_state(hub)
}
