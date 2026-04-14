-- Session expiry column (added for one-device policy with expiry validation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP WITH TIME ZONE;
