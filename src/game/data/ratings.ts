// Barème approximatif "style FIFA" pour L1 2022.
// Valeurs: moyenne d'effectif visée (± écart-type lors de la génération).
export function getTeamBaseOverall(teamName: string): number {
  const n = teamName.toLowerCase();
  const entries: Array<[RegExp, number]> = [
    [/paris|psg|saint germain/, 84],
    [/marseille|om/, 80],
    [/lyon|olympique lyonnais|\bol\b/, 79],
    [/monaco/, 79],
    [/rennes/, 78],
    [/nice/, 78],
    [/lens/, 77],
    [/lille|losc/, 77],
    [/nantes/, 75],
    [/strasbourg/, 74],
    [/montpellier/, 73],
    [/reims/, 73],
    [/toulouse/, 72],
    [/lorient/, 72],
    [/brest/, 72],
    [/clermont/, 71],
    [/angers/, 70],
    [/troyes|estac/, 70],
    [/auxerre/, 70],
    [/ajaccio/, 69],
  ];
  for (const [re, rating] of entries) {
    if (re.test(n)) return rating;
  }
  return 72; // défaut raisonnable
}


