import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { SPTINT } from '../lib/garden';

export function Picto({ slug, size = 40, className = '' }: { slug: string; size?: number; className?: string }) {
  return <img src={`/pictos/${slug}.svg`} alt="" width={size} height={size} className={className} draggable={false} />;
}

export function Tile({ slug, w = 48, h = 48, size = 40, round = 15, hop = false }: { slug: string; w?: number; h?: number; size?: number; round?: number; hop?: boolean }) {
  return (
    <span className="flex shrink-0 items-center justify-center" style={{ width: w, height: h, borderRadius: round, background: SPTINT[slug] ?? '#E1EFD6' }}>
      <Picto slug={slug} size={size} className={hop ? 'picto-hop' : ''} />
    </span>
  );
}

export function BackHeader({ title, kicker, right }: { title: string; kicker?: string; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="flex items-center gap-3 pt-2">
      <button onClick={() => nav(-1)} aria-label="Retour" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-vert shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <div className="min-w-0 flex-1">
        {kicker && <p className="truncate text-xs font-extrabold text-gris">{kicker}</p>}
        <h1 className="truncate font-titre text-[26px] font-semibold text-vert">{title}</h1>
      </div>
      {right}
    </div>
  );
}

const tabs = [
  { to: '/', label: 'Accueil', d: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5' },
  { to: '/potager', label: 'Potager', d: 'M12 20v-8M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 10c0-3 2-5 6-5 0 3-2 5-6 5zM5 20h14' },
  { to: '/calendrier', label: 'Calendrier', d: 'M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM8 3v4M16 3v4M4 10h16' },
  { to: '/glossaire', label: 'Glossaire', d: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6' },
  { to: '/profil', label: 'Profil', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-4 4.5-6 8-6s6.5 2 8 6' }
];
const sideTabs = [
  tabs[0],
  { ...tabs[1], label: 'Mon potager' },
  tabs[2],
  tabs[3],
  { to: '/alertes', label: 'Alertes d’arrosage', d: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4' },
  tabs[4]
];

/** Navigation latérale, affichée à la place de la barre du bas sur grand écran. */
export function SideNav() {
  return (
    <aside className="hidden lg:fixed lg:bottom-6 lg:left-6 lg:top-6 lg:z-20 lg:flex lg:w-[236px] lg:flex-col lg:gap-6 lg:overflow-y-auto lg:rounded-[28px] lg:bg-white lg:px-[18px] lg:py-6">
      <div className="flex items-center gap-3 px-1.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-vert text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20v-8M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 10c0-3 2-5 6-5 0 3-2 5-6 5z" /></svg>
        </span>
        <span className="font-titre text-xl font-semibold leading-[1.1] text-vert">Mon petit potager</span>
      </div>
      <nav aria-label="Navigation principale" className="flex flex-col gap-1.5">
        {sideTabs.map(t => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] ${isActive ? 'bg-vert-doux font-extrabold text-vert' : 'font-bold text-[#3D4A3F] hover:bg-fond'}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.d} /></svg>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function BottomNav() {
  return (
    <nav aria-label="Navigation principale" className="lg:hidden fixed bottom-[calc(14px+env(safe-area-inset-bottom))] left-1/2 z-20 flex h-[72px] w-[min(408px,calc(100%-24px))] -translate-x-1/2 items-center justify-around rounded-[28px] bg-white px-2 shadow-[0_8px_24px_rgba(46,107,63,0.16)]">
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `flex min-w-[62px] flex-col items-center gap-0.5 rounded-[20px] py-2 text-xs ${isActive ? 'nav-hop bg-vert-doux font-extrabold text-vert' : 'font-bold text-gris'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.d} /></svg>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Page({ children, nav = false, wide = false }: { children: ReactNode; nav?: boolean; wide?: boolean }) {
  return <main className={`rise-in relative mx-auto flex min-h-full max-w-[440px] flex-col gap-4 overflow-x-clip px-4 pt-5 lg:gap-5 lg:px-8 lg:pb-12 lg:pt-8 ${wide ? 'lg:max-w-[1180px]' : 'lg:max-w-[760px]'} ${nav ? 'pb-32' : 'pb-40'}`}>{children}</main>;
}

export function Sheet({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <>
      <div className="h-80" aria-hidden="true" />
      <div role="dialog" aria-label={title} className="sheet-up fixed bottom-0 left-1/2 z-30 flex max-h-[70%] w-[min(440px,100%)] -translate-x-1/2 flex-col lg:left-[calc(50%+142px)] lg:w-[min(520px,calc(100%-332px))] gap-3 overflow-y-auto rounded-t-[30px] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-10px_28px_rgba(46,107,63,0.16)]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-titre text-[22px] font-semibold text-vert">{title}</h2>
          <button onClick={onClose} className="min-h-11 px-1 font-extrabold text-vert">Fermer</button>
        </div>
        {children}
      </div>
    </>
  );
}

export function Btn({ children, variant = 'plein', className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'plein' | 'contour' | 'doux' | 'eau' | 'danger' }) {
  const v = {
    plein: 'bg-vert text-white',
    contour: 'bg-white text-vert shadow-[inset_0_0_0_2px_#2E6B3F]',
    doux: 'bg-vert-doux text-vert',
    eau: 'bg-eau text-white',
    danger: 'bg-alerte text-white'
  }[variant];
  return <button {...rest} className={`squish flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[20px] px-4 font-titre text-[17px] font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${v} ${className}`}>{children}</button>;
}

export function Note({ tone, children }: { tone: 'bon' | 'mauvais' | 'neutre'; children: ReactNode }) {
  const c = { bon: 'bg-vert-doux text-vert-fonce', mauvais: 'bg-alerte-doux text-[#6B2418]', neutre: 'bg-[#F3EDE1] text-soleil-encre' }[tone];
  return <p className={`rounded-2xl px-3 py-2.5 text-[13px] font-bold leading-snug ${c}`}>{children}</p>;
}

/* ---------- toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div role="status" className="toast-in fixed left-1/2 top-[calc(16px+env(safe-area-inset-top))] z-50 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-2xl bg-encre px-4 py-3 text-sm font-bold text-white shadow-lg">{msg}</div>}
    </ToastCtx.Provider>
  );
}

export function Loading({ label = 'Chargement…', full = false }: { label?: string; full?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-4 ${full ? 'min-h-[100dvh]' : 'min-h-[60vh]'}`}>
      <div className="pt-8">
        <img src="/pictos/tomate.svg" alt="" width={88} height={88} className="loader-tomato" draggable={false} />
        <span className="loader-shadow" aria-hidden="true" />
      </div>
      <p className="font-titre text-lg font-semibold text-vert">{label.replace(/…$/, '')}<span className="loader-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>
    </div>
  );
}
