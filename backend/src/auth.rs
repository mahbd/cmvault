use actix_web::http::header::AUTHORIZATION;
use actix_web::HttpRequest;
use sqlx::PgPool;

use crate::errors::ApiError;
use crate::models::ApiToken;

pub async fn optional_token(
    req: &HttpRequest,
    pool: &PgPool,
) -> Result<Option<ApiToken>, ApiError> {
    let header = match req.headers().get(AUTHORIZATION) {
        Some(h) => h.to_str().map_err(|_| ApiError::Unauthorized)?,
        None => return Ok(None),
    };

    let token_value = header
        .strip_prefix("Bearer ")
        .ok_or(ApiError::Unauthorized)?
        .trim();

    let token = sqlx::query_as::<_, ApiToken>(
        r#"SELECT id, label, token, user_id, created_at FROM api_tokens WHERE token = $1"#,
    )
    .bind(token_value)
    .fetch_optional(pool)
    .await?;

    Ok(token)
}

pub async fn require_token(req: &HttpRequest, pool: &PgPool) -> Result<ApiToken, ApiError> {
    match optional_token(req, pool).await? {
        Some(token) => Ok(token),
        None => Err(ApiError::Unauthorized),
    }
}
