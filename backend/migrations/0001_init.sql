 -- API tokens
 CREATE TABLE IF NOT EXISTS api_tokens (
     id UUID PRIMARY KEY,
     label TEXT NOT NULL,
     token TEXT NOT NULL UNIQUE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 );

 -- Core commands
 CREATE TABLE IF NOT EXISTS commands (
     id UUID PRIMARY KEY,
     title TEXT,
     text TEXT NOT NULL,
     description TEXT,
     platform TEXT NOT NULL,
     visibility TEXT NOT NULL DEFAULT 'PRIVATE',
     favorite BOOLEAN NOT NULL DEFAULT FALSE,
     usage_count INTEGER NOT NULL DEFAULT 0,
     owner_token UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 );

 CREATE TABLE IF NOT EXISTS tags (
     id UUID PRIMARY KEY,
     name TEXT NOT NULL,
     owner_token UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
     UNIQUE(owner_token, name)
 );

 CREATE TABLE IF NOT EXISTS command_tags (
     command_id UUID NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
     tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
     PRIMARY KEY(command_id, tag_id)
 );

 CREATE TABLE IF NOT EXISTS learned_commands (
     id UUID PRIMARY KEY,
     content TEXT NOT NULL,
     os TEXT,
     pwd TEXT,
     ls_output TEXT,
     owner_token UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
     usage_count INTEGER NOT NULL DEFAULT 1,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 );

 CREATE TABLE IF NOT EXISTS device_codes (
     code TEXT PRIMARY KEY,
     token_id UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
     expires_at TIMESTAMPTZ NOT NULL,
     consumed BOOLEAN NOT NULL DEFAULT FALSE
 );
