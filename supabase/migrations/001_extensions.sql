-- 001_extensions.sql
-- Extensions required by the schema:
--   pgcrypto   -> gen_random_uuid() for primary keys
--   btree_gist -> allows btree operators (uuid =) inside GiST exclusion constraints
--   pg_trgm    -> trigram indexes for server-side patient/provider name search

create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create extension if not exists pg_trgm;