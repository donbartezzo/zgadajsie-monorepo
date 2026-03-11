-- Update existing cover image URLs from /assets/covers/ to /assets/covers/events/
UPDATE "CoverImage"
SET url = REPLACE(url, '/assets/covers/', '/assets/covers/events/')
WHERE url LIKE '%/assets/covers/%'
  AND url NOT LIKE '%/assets/covers/events/%';
