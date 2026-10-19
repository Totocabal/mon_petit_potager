// Envoie l'APK de test dans le bucket public « apk » de Supabase et affiche son lien.
// Usage : npm run android:publish   (ou node scripts/publish-apk.mjs après android:debug)
// Demande SUPABASE_SECRET_KEY dans .env.local (clé secrète du projet : Project Settings > API Keys). Ne jamais la commiter.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const env = { ...process.env };
for (const f of ['.env.local', '.env']) {
  const p = resolve(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
const apk = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
const name = 'mon-petit-potager-debug.apk';

if (!url) throw new Error('VITE_SUPABASE_URL manquante (.env.local).');
if (!key) throw new Error('SUPABASE_SECRET_KEY manquante dans .env.local : copiez la clé secrète du projet (Project Settings > API Keys).');
if (!existsSync(apk)) throw new Error('APK introuvable : lancez d’abord « npm run android:debug ».');

const res = await fetch(`${url}/storage/v1/object/apk/${name}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/vnd.android.package-archive', 'x-upsert': 'true', 'Cache-Control': 'max-age=60' },
  body: readFileSync(apk)
});
if (!res.ok) throw new Error(`Envoi refusé (${res.status}) : ${await res.text()}`);

const kb = Math.round(statSync(apk).size / 1024);
console.log(`APK envoyé (${kb} Ko).`);
console.log(`${url}/storage/v1/object/public/apk/${name}?v=${Date.now()}`);
