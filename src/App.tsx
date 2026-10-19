import { Route, Routes, useLocation } from 'react-router-dom';
import { useCurrentGarden, useSession } from './lib/data';
import { AppProvider } from './lib/app';
import { Loading, SideNav } from './components/ui';
import { ReminderSync } from './components/ReminderSync';
import { isNative } from './lib/native';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Terrain from './pages/Terrain';
import ZonePage from './pages/Zone';
import BlocPage from './pages/Bloc';
import NewZone from './pages/NewZone';
import AddPlant from './pages/AddPlant';
import PlantPage from './pages/Plant';
import Calendar from './pages/Calendar';
import Generate from './pages/Generate';
import InvitePage from './pages/Invite';
import AcceptInvite, { INVITE_KEY } from './pages/AcceptInvite';
import Alerts from './pages/Alerts';
import Installer from './pages/Installer';
import Tasks from './pages/Tasks';
import ProfilePage from './pages/Profile';
import Glossary from './pages/Glossary';
import WeatherPage from './pages/Weather';
import SpeciesSheet from './pages/SpeciesSheet';

export default function App() {
  const session = useSession();
  if (session === undefined) return <Loading full />;
  if (!session) return <LoggedOut />;
  return <Signed session={session} />;
}

const INVITE_PATH = /^\/invitation\/([0-9a-f-]{36})\/?$/i;

/** Un lien d'invitation ouvert sans être connecté : on le garde le temps de la connexion. */
function LoggedOut() {
  const { pathname } = useLocation();
  const token = INVITE_PATH.exec(pathname)?.[1];
  if (token) { try { localStorage.setItem(INVITE_KEY, token); } catch { /* ignoré */ } }
  return <Login invite={!!token || !!safeGet(INVITE_KEY)} />;
}
const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

function Signed({ session }: { session: NonNullable<ReturnType<typeof useSession>> }) {
  const { loading, garden, gardens, select } = useCurrentGarden();
  const { pathname } = useLocation();
  const pending = INVITE_PATH.exec(pathname)?.[1] ?? safeGet(INVITE_KEY);
  if (pending) return <AcceptInvite token={pending} onJoined={select} />;
  if (loading) return <Loading full />;
  if (!garden) return <Onboarding onCreated={select} />;
  return (
    <AppProvider session={session} garden={garden} gardens={gardens} selectGarden={select}>
      <SideNav />
      {isNative && <ReminderSync />}
      <div className="min-h-full lg:pl-[284px]">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/potager" element={<Terrain />} />
        <Route path="/potager/nouvelle-zone" element={<NewZone />} />
        <Route path="/zones/:zoneId" element={<ZonePage />} />
        <Route path="/zones/:zoneId/blocs/:bx/:by" element={<BlocPage />} />
        <Route path="/zones/:zoneId/generer" element={<Generate />} />
        <Route path="/zones/:zoneId/planter" element={<AddPlant />} />
        <Route path="/plantes/:plantingId" element={<PlantPage />} />
        <Route path="/calendrier" element={<Calendar />} />
        <Route path="/meteo" element={<WeatherPage />} />
        <Route path="/glossaire" element={<Glossary />} />
        <Route path="/glossaire/:slug" element={<SpeciesSheet />} />
        <Route path="/inviter" element={<InvitePage />} />
        <Route path="/alertes" element={<Alerts />} />
        <Route path="/installer" element={<Installer />} />
        <Route path="/taches" element={<Tasks />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="*" element={<Home />} />
      </Routes>
      </div>
    </AppProvider>
  );
}
