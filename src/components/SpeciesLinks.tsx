import { Link } from 'react-router-dom';
import type { Species } from '../lib/types';
import { Tile } from './ui';

/** Les plantes d’un calendrier renvoient vers leurs conseils de culture. */
export function SpeciesLinks({ list }: { list: Species[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {list.map(s => (
        <Link key={s.id} to={`/glossaire/${s.slug}`} className="squish inline-flex min-h-11 items-center gap-1.5 rounded-full bg-fond py-1 pl-1 pr-3 text-sm font-bold text-vert">
          <Tile slug={s.slug} w={30} h={30} size={26} round={999} />{s.name}
        </Link>
      ))}
    </div>
  );
}
