// Les dates de l'app sont en heure locale : on fixe le fuseau pour que les tests (changement d'heure compris) soient identiques partout.
export default function setup() {
  process.env.TZ = 'Europe/Paris';
}
