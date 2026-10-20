import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { symptomFor, treatmentItems } from './SpeciesSheet';

describe('treatmentItems', () => {
  it('une ligne par ravageur, avec son remède', () => {
    const r = treatmentItems("Mildiou : bouillie bordelaise en préventif, arroser au pied. Pucerons : savon noir dilué. Aleurodes : pièges jaunes englués.");
    expect(r).toEqual([
      { label: 'Mildiou', body: 'bouillie bordelaise en préventif, arroser au pied.' },
      { label: 'Pucerons', body: 'savon noir dilué.' },
      { label: 'Aleurodes', body: 'pièges jaunes englués.' }
    ]);
  });
  it('une phrase sans « : » reste telle quelle', () => {
    expect(treatmentItems('Pucerons : jet d’eau. Rotation de 4 ans.')[1]).toEqual({ label: null, body: 'Rotation de 4 ans.' });
  });
  it('un seul bloc sans point intermédiaire', () => {
    expect(treatmentItems('Limaces sur les jeunes pousses : ramassage le soir, phosphate ferrique.')).toEqual([{ label: 'Limaces sur les jeunes pousses', body: 'ramassage le soir, phosphate ferrique.' }]);
  });
  it('ne coupe pas sur « 48 h » ou un point suivi d’une minuscule', () => {
    const r = treatmentItems('Bruches : semences saines (48 h au congélateur). Pucerons : savon noir.');
    expect(r.map(x => x.label)).toEqual(['Bruches', 'Pucerons']);
  });
  it('associe un symptôme descriptif à chaque ravageur ou maladie du catalogue SQL', () => {
    const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/0013_traitements.sql'), 'utf8');
    const matches = [...sql.matchAll(/pests_treatment='((?:''|[^'])*)'/g)];
    expect(matches.length).toBeGreaterThan(50);
    for (const m of matches) {
      const text = m[1].replace(/''/g, "'");
      for (const item of treatmentItems(text)) {
        if (!item.label) continue;
        const symptom = symptomFor(item.label);
        expect(symptom, `Symptôme manquant pour "${item.label}"`).not.toBe(item.label);
        expect(symptom.length).toBeGreaterThan(15);
      }
    }
  });
});
