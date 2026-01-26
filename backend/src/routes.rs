use std::collections::HashMap;

use actix_web::{
    delete, get, post,
    web::{self, Data},
    HttpRequest, HttpResponse,
};
use argon2::{password_hash::SaltString, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use chrono::{Duration, Utc};
use rand::{distributions::Uniform, Rng};
use rand_core::OsRng;
use sqlx::{PgPool, QueryBuilder, Row};
use uuid::Uuid;

use crate::{
    auth,
    errors::ApiError,
    models::{
        AuthResponse, Command, CommandPayload, CommandWithTags, DeviceCodeResponse,
        ExchangeTokenRequest, ExchangeTokenResponse, HealthResponse, LearnRequest, LearnedCommand,
        LoginRequest, PromotePayload, RegisterRequest, SuggestRequest,
    },
    state::AppState,
};

#[get("/health")]
pub async fn health() -> HttpResponse {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

#[post("/api/register")]
pub async fn register_user(
    state: Data<AppState>,
    payload: web::Json<RegisterRequest>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let email = payload.email.trim().to_lowercase();
    if email.is_empty() || payload.password.len() < 8 {
        return Err(ApiError::BadRequest(
            "email required and password must be at least 8 characters".into(),
        ));
    }

    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|_| ApiError::Internal)?
        .to_string();

    let user_id = Uuid::new_v4();
    let token_id = Uuid::new_v4();
    let token_value = Uuid::new_v4().to_string();
    let label = payload
        .label
        .clone()
        .unwrap_or_else(|| "Default Token".to_string());

    let mut tx = pool.begin().await?;
    sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash, created_at)
        VALUES ($1, $2, $3, now())
        "#,
    )
    .bind(user_id)
    .bind(&email)
    .bind(&password_hash)
    .execute(&mut *tx)
    .await
    .map_err(|err| match err {
        sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
            ApiError::BadRequest("email already registered".into())
        }
        other => ApiError::Db(other),
    })?;

    sqlx::query(
        r#"
        INSERT INTO api_tokens (id, label, token, user_id, created_at)
        VALUES ($1, $2, $3, $4, now())
        "#,
    )
    .bind(token_id)
    .bind(&label)
    .bind(&token_value)
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(HttpResponse::Created().json(AuthResponse {
        token: token_value,
        user_id,
    }))
}

#[post("/api/login")]
pub async fn login_user(
    state: Data<AppState>,
    payload: web::Json<LoginRequest>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let email = payload.email.trim().to_lowercase();

    let row = sqlx::query(r#"SELECT id, password_hash FROM users WHERE email = $1"#)
        .bind(&email)
        .fetch_optional(pool)
        .await?;

    let row = row.ok_or(ApiError::Unauthorized)?;
    let user_id: Uuid = row.try_get("id").unwrap();
    let password_hash: String = row.try_get("password_hash").unwrap();

    let parsed_hash = PasswordHash::new(&password_hash).map_err(|_| ApiError::Unauthorized)?;
    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| ApiError::Unauthorized)?;

    let token_id = Uuid::new_v4();
    let token_value = Uuid::new_v4().to_string();
    let label = payload
        .label
        .clone()
        .unwrap_or_else(|| "Login Token".to_string());

    sqlx::query(
        r#"
        INSERT INTO api_tokens (id, label, token, user_id, created_at)
        VALUES ($1, $2, $3, $4, now())
        "#,
    )
    .bind(token_id)
    .bind(&label)
    .bind(&token_value)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(HttpResponse::Ok().json(AuthResponse {
        token: token_value,
        user_id,
    }))
}

#[derive(Debug, serde::Deserialize)]
pub struct CommandQuery {
    pub q: Option<String>,
    pub tag: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[get("/api/commands")]
pub async fn list_commands(
    state: Data<AppState>,
    req: HttpRequest,
    query: web::Query<CommandQuery>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let token = auth::optional_token(&req, pool).await?;
    let limit = query.limit.unwrap_or(20).clamp(1, 200);
    let offset = query.offset.unwrap_or(0).max(0);

    let mut builder = QueryBuilder::new(
        r#"
        SELECT id, title, text, description, platform, visibility, favorite, usage_count, owner_token, created_at, updated_at
        FROM commands
        WHERE 1=1
    "#,
    );

    if let Some(t) = token.as_ref() {
        builder.push(" AND (owner_token = ");
        builder.push_bind(t.id);
        builder.push(" OR visibility = 'PUBLIC')");
    } else {
        builder.push(" AND visibility = 'PUBLIC'");
    }

    if let Some(filter) = &query.q {
        builder.push(" AND text ILIKE ");
        builder.push_bind(format!("%{filter}%"));
    }

    if let Some(tag_filter) = &query.tag {
        builder.push(
            " AND EXISTS (SELECT 1 FROM command_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.command_id = commands.id AND t.name ILIKE ",
        );
        builder.push_bind(format!("%{tag_filter}%"));
        builder.push(")");
    }

    builder.push(" ORDER BY created_at DESC");
    builder.push(" LIMIT ");
    builder.push_bind(limit);
    builder.push(" OFFSET ");
    builder.push_bind(offset);

    let commands: Vec<Command> = builder.build_query_as().fetch_all(pool).await?;

    let mut count_builder = QueryBuilder::new(
        r#"
        SELECT count(*) as total
        FROM commands
        WHERE 1=1
    "#,
    );

    if let Some(t) = token.as_ref() {
        count_builder.push(" AND (owner_token = ");
        count_builder.push_bind(t.id);
        count_builder.push(" OR visibility = 'PUBLIC')");
    } else {
        count_builder.push(" AND visibility = 'PUBLIC'");
    }

    if let Some(filter) = &query.q {
        count_builder.push(" AND text ILIKE ");
        count_builder.push_bind(format!("%{filter}%"));
    }

    if let Some(tag_filter) = &query.tag {
        count_builder.push(
            " AND EXISTS (SELECT 1 FROM command_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.command_id = commands.id AND t.name ILIKE ",
        );
        count_builder.push_bind(format!("%{tag_filter}%"));
        count_builder.push(")");
    }

    let total_row = count_builder.build().fetch_one(pool).await?;
    let total: i64 = total_row.try_get("total").unwrap_or(0);

    let ids: Vec<Uuid> = commands.iter().map(|c| c.id).collect();
    let tags = load_tags(pool, &ids).await?;

    let merged: Vec<CommandWithTags> = commands
        .into_iter()
        .map(|c| CommandWithTags {
            id: c.id,
            title: c.title,
            text: c.text,
            description: c.description,
            platform: c.platform,
            visibility: c.visibility,
            favorite: c.favorite,
            usage_count: c.usage_count,
            tags: tags.get(&c.id).cloned().unwrap_or_default(),
            created_at: c.created_at,
        })
        .collect();

    Ok(HttpResponse::Ok().json(crate::models::Page {
        items: merged,
        total,
        limit,
        offset,
    }))
}

#[post("/api/commands")]
pub async fn create_command(
    state: Data<AppState>,
    req: HttpRequest,
    payload: web::Json<CommandPayload>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let token = auth::require_token(&req, pool).await?;

    let visibility = payload
        .visibility
        .clone()
        .unwrap_or_else(|| "PRIVATE".to_string());

    if visibility != "PUBLIC" && visibility != "PRIVATE" {
        return Err(ApiError::BadRequest(
            "visibility must be PUBLIC or PRIVATE".into(),
        ));
    }

    let command_id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO commands (
            id, title, text, description, platform, visibility, favorite, usage_count, owner_token, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10
        )
        "#,
    )
    .bind(command_id)
    .bind(&payload.title)
    .bind(&payload.text)
    .bind(&payload.description)
    .bind(&payload.platform)
    .bind(&visibility)
    .bind(payload.favorite.unwrap_or(false))
    .bind(0_i32)
    .bind(token.id)
    .bind(now)
    .execute(pool)
    .await?;

    if let Some(tags) = &payload.tags {
        for name in tags {
            let tag_id = sqlx::query(
                r#"
                INSERT INTO tags (id, name, owner_token)
                VALUES ($1, $2, $3)
                ON CONFLICT (owner_token, name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(name)
            .bind(token.id)
            .fetch_one(pool)
            .await?
            .get::<Uuid, _>("id");

            sqlx::query(
                "INSERT INTO command_tags (command_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(command_id)
            .bind(tag_id)
            .execute(pool)
            .await?;
        }
    }

    let tags = load_tags(pool, &[command_id]).await?;

    let response = CommandWithTags {
        id: command_id,
        title: payload.title.clone(),
        text: payload.text.clone(),
        description: payload.description.clone(),
        platform: payload.platform.clone(),
        visibility,
        favorite: payload.favorite.unwrap_or(false),
        usage_count: 0,
        tags: tags.get(&command_id).cloned().unwrap_or_default(),
        created_at: now,
    };

    Ok(HttpResponse::Created().json(response))
}

#[delete("/api/commands/{id}")]
pub async fn delete_command(
    state: Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let token = auth::require_token(&req, pool).await?;
    let command_id = path.into_inner();

    let result = sqlx::query("DELETE FROM commands WHERE id = $1 AND owner_token = $2")
        .bind(command_id)
        .bind(token.id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }

    Ok(HttpResponse::NoContent().finish())
}

#[post("/api/suggest")]
pub async fn suggest_commands(
    state: Data<AppState>,
    req: HttpRequest,
    payload: web::Json<SuggestRequest>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let token = auth::optional_token(&req, pool).await?;
    let term = format!("%{}%", payload.query);
    // Optional contextual fields are accepted for future relevance scoring.
    let _ = (&payload.os, &payload.pwd);

    let rows = if let Some(tok) = token.as_ref() {
        sqlx::query(
            r#"
            SELECT text
            FROM commands
            WHERE (owner_token = $1 OR visibility = 'PUBLIC')
              AND text ILIKE $2
            ORDER BY usage_count DESC, created_at DESC
            LIMIT 10
            "#,
        )
        .bind(tok.id)
        .bind(&term)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query(
            r#"
            SELECT text
            FROM commands
            WHERE visibility = 'PUBLIC' AND text ILIKE $1
            ORDER BY usage_count DESC, created_at DESC
            LIMIT 10
            "#,
        )
        .bind(&term)
        .fetch_all(pool)
        .await?
    };

    let suggestions: Vec<String> = rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>("text").ok())
        .collect();

    Ok(HttpResponse::Ok().json(suggestions))
}

#[post("/api/learn")]
pub async fn learn_command(
    state: Data<AppState>,
    req: HttpRequest,
    payload: web::Json<LearnRequest>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let token = auth::require_token(&req, pool).await?;
    let content = payload.executed_command.trim();

    if content.is_empty() {
        return Err(ApiError::BadRequest("executed_command is required".into()));
    }

    let existing = sqlx::query(
        r#"SELECT id, usage_count FROM learned_commands WHERE owner_token = $1 AND content = $2"#,
    )
    .bind(token.id)
    .bind(content)
    .fetch_optional(pool)
    .await?;

    if let Some(row) = existing {
        let usage = row.try_get::<i32, _>("usage_count").unwrap_or(1) + 1;
        let id: Uuid = row.try_get("id").unwrap();
        sqlx::query("UPDATE learned_commands SET usage_count = $1 WHERE id = $2")
            .bind(usage)
            .bind(id)
            .execute(pool)
            .await?;
    } else {
        sqlx::query(
            r#"
            INSERT INTO learned_commands (id, content, os, pwd, ls_output, owner_token, usage_count, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(content)
        .bind(&payload.os)
        .bind(&payload.pwd)
        .bind(&payload.ls_output)
        .bind(token.id)
        .bind(1_i32)
        .bind(Utc::now())
        .execute(pool)
        .await?;
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

#[get("/api/learned")]
pub async fn list_learned(
    state: Data<AppState>,
    req: HttpRequest,
    query: web::Query<CommandQuery>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let token = auth::require_token(&req, pool).await?;
    let limit = query.limit.unwrap_or(20).clamp(1, 200);
    let offset = query.offset.unwrap_or(0).max(0);

    let rows = sqlx::query_as::<_, LearnedCommand>(
        r#"
        SELECT id, content, os, pwd, ls_output, owner_token, usage_count, created_at
        FROM learned_commands
        WHERE owner_token = $1
        ORDER BY usage_count DESC, created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(token.id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total_row =
        sqlx::query(r#"SELECT count(*) as total FROM learned_commands WHERE owner_token = $1"#)
            .bind(token.id)
            .fetch_one(pool)
            .await?;
    let total: i64 = total_row.try_get("total").unwrap_or(0);

    Ok(HttpResponse::Ok().json(crate::models::Page {
        items: rows,
        total,
        limit,
        offset,
    }))
}

#[post("/api/learned/{id}/promote")]
pub async fn promote_learned(
    state: Data<AppState>,
    req: HttpRequest,
    path: web::Path<Uuid>,
    payload: web::Json<PromotePayload>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let token = auth::require_token(&req, pool).await?;
    let learned_id = path.into_inner();

    let learned = sqlx::query_as::<_, LearnedCommand>(
        r#"
        SELECT id, content, os, pwd, ls_output, owner_token, usage_count, created_at
        FROM learned_commands
        WHERE id = $1 AND owner_token = $2
        "#,
    )
    .bind(learned_id)
    .bind(token.id)
    .fetch_optional(pool)
    .await?;

    let learned = learned.ok_or(ApiError::NotFound)?;

    let visibility = payload
        .visibility
        .clone()
        .unwrap_or_else(|| "PRIVATE".to_string());

    if visibility != "PUBLIC" && visibility != "PRIVATE" {
        return Err(ApiError::BadRequest(
            "visibility must be PUBLIC or PRIVATE".into(),
        ));
    }

    let command_id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO commands (
            id, title, text, description, platform, visibility, favorite, usage_count, owner_token, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, false, $7, $8, $9, $9
        )
        "#,
    )
    .bind(command_id)
    .bind(&payload.title)
    .bind(&learned.content)
    .bind(&payload.description)
    .bind(&payload.platform)
    .bind(&visibility)
    .bind(learned.usage_count)
    .bind(token.id)
    .bind(now)
    .execute(pool)
    .await?;

    if let Some(tags) = &payload.tags {
        for name in tags {
            let tag_id = sqlx::query(
                r#"
                INSERT INTO tags (id, name, owner_token)
                VALUES ($1, $2, $3)
                ON CONFLICT (owner_token, name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(name)
            .bind(token.id)
            .fetch_one(pool)
            .await?
            .get::<Uuid, _>("id");

            sqlx::query(
                "INSERT INTO command_tags (command_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(command_id)
            .bind(tag_id)
            .execute(pool)
            .await?;
        }
    }

    Ok(HttpResponse::Created().finish())
}

#[post("/api/device-codes")]
pub async fn create_device_code(
    state: Data<AppState>,
    req: HttpRequest,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let token = auth::require_token(&req, pool).await?;
    let expires_at = Utc::now() + Duration::minutes(10);

    let code = loop {
        let candidate = generate_code();
        let exists = sqlx::query("SELECT 1 as one FROM device_codes WHERE code = $1")
            .bind(&candidate)
            .fetch_optional(pool)
            .await?;

        if exists.is_none() {
            break candidate;
        }
    };

    sqlx::query(
        r#"
        INSERT INTO device_codes (code, token_id, expires_at, consumed)
        VALUES ($1, $2, $3, false)
        "#,
    )
    .bind(&code)
    .bind(token.id)
    .bind(expires_at)
    .execute(pool)
    .await?;

    Ok(HttpResponse::Ok().json(DeviceCodeResponse { code, expires_at }))
}

#[post("/api/exchange-token")]
pub async fn exchange_token(
    state: Data<AppState>,
    payload: web::Json<ExchangeTokenRequest>,
) -> Result<HttpResponse, ApiError> {
    let pool = &state.pool;
    let now = Utc::now();

    let code_row = sqlx::query(
        r#"
        SELECT token_id, expires_at, consumed
        FROM device_codes
        WHERE code = $1
        "#,
    )
    .bind(&payload.code)
    .fetch_optional(pool)
    .await?;

    let code_row = code_row.ok_or(ApiError::NotFound)?;

    let consumed: bool = code_row.try_get("consumed").unwrap_or(false);
    let expires_at: chrono::DateTime<Utc> = code_row.try_get("expires_at").unwrap();
    let token_id: Uuid = code_row.try_get("token_id").unwrap();

    if consumed {
        return Err(ApiError::BadRequest("code already used".into()));
    }

    if expires_at < now {
        return Err(ApiError::BadRequest("code expired".into()));
    }

    let token = sqlx::query_as::<_, crate::models::ApiToken>(
        r#"
        SELECT id, label, token, user_id, created_at
        FROM api_tokens
        WHERE id = $1
        "#,
    )
    .bind(token_id)
    .fetch_one(pool)
    .await?;

    sqlx::query("UPDATE device_codes SET consumed = TRUE WHERE code = $1")
        .bind(&payload.code)
        .execute(pool)
        .await?;

    Ok(HttpResponse::Ok().json(ExchangeTokenResponse { token: token.token }))
}

async fn load_tags(pool: &PgPool, ids: &[Uuid]) -> Result<HashMap<Uuid, Vec<String>>, ApiError> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }

    let id_list: Vec<Uuid> = ids.to_vec();

    let rows = sqlx::query(
        r#"
        SELECT ct.command_id, t.name
        FROM command_tags ct
        JOIN tags t ON t.id = ct.tag_id
        WHERE ct.command_id = ANY($1)
        "#,
    )
    .bind(&id_list)
    .fetch_all(pool)
    .await?;

    let mut map: HashMap<Uuid, Vec<String>> = HashMap::new();
    for row in rows {
        let command_id: Uuid = row.try_get("command_id").unwrap();
        let name: String = row.try_get("name").unwrap();
        map.entry(command_id).or_default().push(name);
    }

    Ok(map)
}

fn generate_code() -> String {
    let mut rng = rand::thread_rng();
    let digits = Uniform::new_inclusive(0u8, 9u8);
    (0..6).map(|_| rng.sample(&digits).to_string()).collect()
}
