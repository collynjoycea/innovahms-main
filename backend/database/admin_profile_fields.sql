-- Split admin name into first/last, add profile picture support
ALTER TABLE admins ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Best-effort backfill for existing rows: split the current "name" value
-- on the first space into first_name / last_name.
UPDATE admins
SET
    first_name = COALESCE(first_name, split_part(name, ' ', 1)),
    last_name = COALESCE(
        last_name,
        NULLIF(trim(substring(name from position(' ' in name) + 1)), '')
    )
WHERE first_name IS NULL OR last_name IS NULL;
