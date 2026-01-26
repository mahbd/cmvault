mod auth;
mod errors;
mod models;
mod routes;
mod state;

use std::env;

use actix_cors::Cors;
use actix_web::{middleware::Logger, web::Data, App, HttpServer};
use dotenvy::dotenv;
use log::info;
use sqlx::{postgres::PgPoolOptions, PgPool};
use uuid::Uuid;

use crate::state::AppState;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let database_url =
        env::var("DATABASE_URL").expect("DATABASE_URL must be set (postgres connection string)");
    let bind_address = env::var("BIND_ADDRESS").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    let admin_token = env::var("ADMIN_API_TOKEN").unwrap_or_else(|_| Uuid::new_v4().to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("failed to connect to database");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("failed to run migrations");

    ensure_admin_token(&pool, &admin_token)
        .await
        .expect("failed to ensure admin token");

    let state = Data::new(AppState { pool });

    info!("Starting server on {}", bind_address);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .app_data(state.clone())
            .service(routes::health)
            .service(routes::list_commands)
            .service(routes::create_command)
            .service(routes::delete_command)
            .service(routes::suggest_commands)
            .service(routes::learn_command)
            .service(routes::list_learned)
            .service(routes::promote_learned)
            .service(routes::create_device_code)
            .service(routes::exchange_token)
            .service(routes::register_user)
            .service(routes::login_user)
    })
    .bind(bind_address)?
    .run()
    .await
}

async fn ensure_admin_token(pool: &PgPool, token: &str) -> Result<(), sqlx::Error> {
    let existing = sqlx::query(r#"SELECT id FROM api_tokens WHERE token = $1 LIMIT 1"#)
        .bind(token)
        .fetch_optional(pool)
        .await?;

    if existing.is_none() {
        sqlx::query(
            r#"
            INSERT INTO api_tokens (id, label, token, user_id, created_at)
            VALUES ($1, $2, $3, NULL, now())
            "#,
        )
        .bind(Uuid::new_v4())
        .bind("Default Admin")
        .bind(token)
        .execute(pool)
        .await?;

        info!("Seeded default API token");
    }

    Ok(())
}
