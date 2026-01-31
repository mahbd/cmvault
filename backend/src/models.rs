use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct ApiToken {
    pub id: Uuid,
    pub label: String,
    pub token: String,
    pub user_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Command {
    pub id: Uuid,
    pub title: Option<String>,
    pub text: String,
    pub description: Option<String>,
    pub platform: String,
    pub visibility: String,
    pub favorite: bool,
    pub usage_count: i32,
    pub owner_token: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct CommandWithTags {
    pub id: Uuid,
    pub title: Option<String>,
    pub text: String,
    pub description: Option<String>,
    pub platform: String,
    pub visibility: String,
    pub favorite: bool,
    pub usage_count: i32,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct Page<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

#[derive(Debug, Deserialize)]
pub struct CommandPayload {
    pub title: Option<String>,
    pub text: String,
    pub description: Option<String>,
    pub platform: String,
    pub visibility: Option<String>,
    pub favorite: Option<bool>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct PromotePayload {
    pub title: Option<String>,
    pub description: Option<String>,
    pub platform: String,
    pub visibility: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct SuggestRequest {
    pub query: String,
    pub os: Option<String>,
    pub pwd: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LearnRequest {
    pub executed_command: String,
    pub os: Option<String>,
    pub pwd: Option<String>,
    pub ls_output: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct LearnedCommand {
    pub id: Uuid,
    pub content: String,
    pub os: Option<String>,
    pub pwd: Option<String>,
    pub ls_output: Option<String>,
    pub owner_token: Uuid,
    pub usage_count: i32,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct ExchangeTokenRequest {
    pub code: String,
}

#[derive(Debug, Serialize)]
pub struct ExchangeTokenResponse {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct DeviceCodeResponse {
    pub code: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub label: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub label: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SuggestionRow {
    pub text: String,
    // We don't return these to the client, but we use them for debugging/sorting if needed
    pub score: Option<f64>,
}
