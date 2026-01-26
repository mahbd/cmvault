use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Not found")]
    NotFound,
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Database error: {0}")]
    Db(#[from] sqlx::Error),
    #[error("Internal server error")]
    Internal,
}

impl ResponseError for ApiError {
    fn status_code(&self) -> StatusCode {
        match self {
            ApiError::Unauthorized => StatusCode::UNAUTHORIZED,
            ApiError::NotFound => StatusCode::NOT_FOUND,
            ApiError::BadRequest(_) => StatusCode::BAD_REQUEST,
            ApiError::Db(sqlx::Error::RowNotFound) => StatusCode::NOT_FOUND,
            ApiError::Db(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        let status = self.status_code();
        let message = self.to_string();
        HttpResponse::build(status).json(serde_json::json!({ "error": message }))
    }
}
