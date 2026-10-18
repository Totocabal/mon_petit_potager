import { Route, Routes } from 'react-router-dom';
import { useCurrentGarden, useSession } from './lib/data';
import { AppProvider } from './lib/app';
import { Loading } from './components/ui';
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
import ProfilePage from './pages/Profile';

export default function App() {
  const session = useSession();
  if (session === undefined) return <Loading />;
  if (!session) return <Login />;
  return <Signed session={session} />;
}

function Signed({ session }: { session: NonNullable<ReturnType<typeof useSession>> }) {
  const { loading, garden, gardens, select } = useCurrentGarden();
  if (loading) return <Loading />;
  if (!garden) return <Onboarding onCreated={select} />;
  return (
    <AppProvider session={session} garden={garden} gardens={gardens} selectGarden={select}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/potager" element={<Terrain />} />
        <Route path="/potager/nouvelle-zone" element={<NewZone />} />
        <Route path="/zones/:zoneId" element={<ZonePage />} />
        <Route path="/zones/:zoneId/blocs/:bx/:by" element={<BlocPage />} />
        <Route path="/zones/:zoneId/planter" element={<AddPlant />} />
        <Route path="/plantes/:plantingId" element={<PlantPage />} />
        <Route path="/calendrier" element={<Calendar />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </AppProvider>
  );
}
