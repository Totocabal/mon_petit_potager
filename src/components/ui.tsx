import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { SPTINT } from '../lib/garden';

export function Picto({ slug, size = 40, className = '' }: { slug: string; size?: number; className?: string }) {
  return <img src={`/pictos/${slug}.svg`} alt="" width={size} height={size} className={className} draggable={false} />;
}

export function Tile({ slug, w = 48, h = 48, size = 40, round = 15 }: { slug: string; w?: number; h?: number; size?: number; round?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center" style={{ width: w, height: h, borderRadius: round, background: SPTINT[slug] ?? '#E1EFD6' }}>
      <Picto slug={slug} size={size} />
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
  { to: '/profil', label: 'Profil', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-4 4.5-6 8-6s6.5 2 8 6' }
];
export function BottomNav() {
  return (
    <nav aria-label="Navigation principale" className="fixed bottom-[calc(14px+env(safe-area-inset-bottom))] left-1/2 z-20 flex h-[72px] w-[min(408px,calc(100%-24px))] -translate-x-1/2 items-center justify-around rounded-[28px] bg-white px-2 shadow-[0_8px_24px_rgba(46,107,63,0.16)]">
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `flex min-w-[70px] flex-col items-center gap-0.5 rounded-[20px] py-2 text-xs ${isActive ? 'bg-vert-doux font-extrabold text-vert' : 'font-bold text-gris'}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.d} /></svg>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Page({ children, nav = false }: { children: ReactNode; nav?: boolean }) {
  return <main className={`mx-auto flex min-h-full max-w-[440px] flex-col gap-4 overflow-x-clip px-4 pt-5 ${nav ? 'pb-32' : 'pb-40'}`}>{children}</main>;
}

export function Sheet({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <>
      <div className="h-80" aria-hidden="true" />
      <div role="dialog" aria-label={title} className="fixed bottom-0 left-1/2 z-30 flex max-h-[70%] w-[min(440px,100%)] -translate-x-1/2 flex-col gap-3 overflow-y-auto rounded-t-[30px] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5 shadow-[0_-10px_28px_rgba(46,107,63,0.16)]">
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
  return <button {...rest} className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[20px] px-4 font-titre text-[17px] font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${v} ${className}`}>{children}</button>;
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
      {msg && <div role="status" className="fixed left-1/2 top-[calc(16px+env(safe-area-inset-top))] z-50 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-2xl bg-encre px-4 py-3 text-sm font-bold text-white shadow-lg">{msg}</div>}
    </ToastCtx.Provider>
  );
}

export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return <div className="flex min-h-[60vh] items-center justify-center font-bold text-gris">{label}</div>;
}
