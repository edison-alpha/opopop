use crate::domain::MapOp;

pub trait MapRepository: Send + Sync + 'static {
    fn apply(&self, ops: Vec<MapOp>) -> impl std::future::Future<Output = Vec<MapOp>> + Send;
    fn snapshot(&self) -> impl std::future::Future<Output = Vec<MapOp>> + Send;
}
