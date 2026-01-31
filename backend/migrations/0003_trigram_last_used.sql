-- Enable the pg_trgm extension for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add last_used_at column to commands table
ALTER TABLE commands
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Add last_used_at column to learned_commands table
ALTER TABLE learned_commands
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Initialize last_used_at with created_at for existing records
UPDATE commands SET last_used_at = created_at WHERE last_used_at IS NULL;
UPDATE learned_commands SET last_used_at = created_at WHERE last_used_at IS NULL;

-- Create trigram indexes for faster fuzzy text search
CREATE INDEX IF NOT EXISTS idx_commands_text_trgm ON commands USING gin (text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_commands_title_trgm ON commands USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_commands_description_trgm ON commands USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_learned_commands_content_trgm ON learned_commands USING gin (content gin_trgm_ops);

-- Create index on last_used_at for efficient sorting
CREATE INDEX IF NOT EXISTS idx_commands_last_used_at ON commands (last_used_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_learned_commands_last_used_at ON learned_commands (last_used_at DESC NULLS LAST);