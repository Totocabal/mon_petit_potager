import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import App from './App';
import { ToastProvider } from './components/ui';
import './index.css';
import { registerWorker } from './lib/push';
import { initNative, isNative } from './lib/native';
import { supabase } from './lib/supabase';
import { CACHE_KEY, outbox } from './lib/offline';

// Le service worker ne sert qu'au site web (notifications web) ; l'app native a son propre fonctionnement
if (isNative) initNative(); else registerWorker();

// Hors ligne : les données déjà vues sont gardées sur l'appareil (7 jours) ; une requête hors ligne se contente du cache, une écriture échoue vite avec un message clair
const WEEK = 7 * 24 * 3600_000;
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, gcTime: WEEK, networkMode: 'offlineFirst' }, mutations: { networkMode: 'always' } } });
const persister = createSyncStoragePersister({ storage: window.localStorage, key: CACHE_KEY, throttleTime: 1000 });

// À la déconnexion, rien ne doit rester sur l'appareil : données gardées et modifications en attente
supabase.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') {
    queryClient.clear(); outbox.clear();
    try { localStorage.removeItem(CACHE_KEY); } catch { /* stockage indisponible */ }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: WEEK, buster: 'v2', dehydrateOptions: { shouldDehydrateQuery: q => q.state.status === 'success' } }}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>
);
