-- Reversão de qa-03-profiles-instruction-locale.sql.
-- A coluna é aditiva e tem default. Dropar apaga o idioma gravado depois
-- do apply. Manter a coluna é mais seguro do que reverter.
-- Só descomente se a coluna foi criada por este arquivo e nenhuma linha
-- saiu do default 'pt-BR'.

-- alter table public.profiles drop column if exists instruction_locale;
