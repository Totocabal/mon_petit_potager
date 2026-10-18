import { meters } from '../lib/garden';

export function Stepper({ label, value, onChange, step, min, max, format = meters }: { label: string; value: number; onChange: (v: number) => void; step: number; min: number; max: number; format?: (v: number) => string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] bg-white px-3 py-2.5">
      <span className="text-[13px] font-extrabold text-gris">{label}</span>
      <div className="flex items-center justify-between">
        <button type="button" aria-label={`${label} : moins`} onClick={() => onChange(Math.max(min, value - step))} className="h-10 w-10 rounded-xl bg-vert-doux text-xl font-extrabold text-vert">−</button>
        <output className="font-titre text-xl font-semibold">{format(value)}</output>
        <button type="button" aria-label={`${label} : plus`} onClick={() => onChange(Math.min(max, value + step))} className="h-10 w-10 rounded-xl bg-vert-doux text-xl font-extrabold text-vert">+</button>
      </div>
    </div>
  );
}
