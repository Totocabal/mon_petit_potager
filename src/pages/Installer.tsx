import { Link } from 'react-router-dom';
import { BackHeader, Page, Picto } from '../components/ui';

const steps: [string, React.ReactNode, React.ReactNode][] = [
  ['1', <>Dans Safari, touchez <b>Partager</b></>, <path d="M12 3v12M8 7l4-4 4 4M6 11v9h12v-9" />],
  ['2', <>Choisissez <b>Sur l’écran d’accueil</b></>, <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></>],
  ['3', <>Ouvrez <b>Potager</b> depuis l’icône et activez les alertes</>, <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>],
];

export default function Installer() {
  return (
    <Page>
      <BackHeader title="Installer l’app" kicker="Recevoir les alertes sur iPhone" />
      <p className="text-[15px] leading-snug text-[#3D4A3F]">Sur iPhone, les notifications ne marchent qu’une fois l’app ajoutée à l’écran d’accueil. Ça prend 20 secondes. Sur Android et ordinateur, rien à installer : activez simplement les alertes.</p>
      <div aria-hidden className="grid h-[190px] w-[210px] grid-cols-4 content-start gap-2.5 self-center rounded-[32px] bg-[#D3EAEE] p-[18px]">
        {Array.from({ length: 8 }, (_, i) => i === 5
          ? <span key={i} className="flex aspect-square items-center justify-center rounded-xl bg-vert shadow-[0_0_0_3px_#F6C445]"><Picto slug="tomate" size={32} /></span>
          : <span key={i} className="aspect-square rounded-xl bg-white/70" />)}
        <span className="col-start-2 -mt-1.5 whitespace-nowrap text-center text-[10px] font-extrabold text-[#1F4D5A]">Potager</span>
      </div>
      <ol className="flex flex-col gap-2.5">
        {steps.map(([n, text, icon]) => (
          <li key={n} className="flex items-center gap-3.5 rounded-[20px] bg-white px-3.5 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vert font-titre font-semibold text-white">{n}</span>
            <span className="flex-1 text-[15px] leading-snug">{text}</span>
            <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3F7DA0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
          </li>
        ))}
      </ol>
      <Link to="/alertes" className="flex min-h-14 items-center justify-center rounded-[20px] bg-vert font-titre text-lg font-semibold text-white">C’est fait, activer les alertes</Link>
      <Link to="/" className="flex min-h-11 items-center justify-center text-[15px] font-extrabold text-vert">Plus tard</Link>
    </Page>
  );
}
