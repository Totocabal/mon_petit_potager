import { meters } from '../lib/garden';
import { canStep, stepValue } from '../lib/stepper';

export function Stepper({ label, value, onChange, step, min, max, format = meters }: { label: string; value: number; onChange: (v: number) => void; step: number; min: number; max: number; format?: (v: number) => string }) {
  const btn = 'h-10 w-10 rounded-xl bg-vert-doux text-xl font-extrabold text-vert disabled:opacity-35';
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] bg-white px-3 py-2.5">
      <span className="text-[13px] font-extrabold text-gris">{label}</span>
      <div className="flex items-center justify-between">
        <button type="button" aria-label={`${label} : moins`} disabled={!canStep(value, -1, min, max)} onClick={() => onChange(stepValue(value, -1, step, min, max))} className={btn}>−</button>
        <output className="font-titre text-xl font-semibold">{format(value)}</output>
        <button type="button" aria-label={`${label} : plus`} disabled={!canStep(value, 1, min, max)} onClick={() => onChange(stepValue(value, 1, step, min, max))} className={btn}>+</button>
      </div>
    </div>
  );
}
