/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /** Adresse publique du site (liens d'invitation) ; obligatoire pour l'app native */
  readonly VITE_SITE_URL?: string;
}
