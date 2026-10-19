-- Bucket public pour l'APK de test : lecture par lien, écriture réservée à la clé secrète (aucune politique d'insertion)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('apk', 'apk', true, 104857600, array['application/vnd.android.package-archive'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
