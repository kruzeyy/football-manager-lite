export type StadiumInfo = {
  name: string;
  imagePath: string; // chemin local sous /public
};

// Mapping heuristique par nom d'équipe (contient) -> stade
// On couvre les principaux clubs de L1 récentes; sinon on renvoie null.
const STADIUM_MAP: Array<{ match: RegExp; stadium: StadiumInfo }> = [
  // PSG
  { match: /(paris\s*saint\s*germain|paris sg|psg|paris\b)/i, stadium: { name: 'Parc des Princes', imagePath: '/stadiums/parc_des_princes19.jpg' } },
  // OM
  { match: /(marseille|om|olympique\s+de\s+marseille)/i, stadium: { name: 'Stade Vélodrome', imagePath: '/stadiums/stade_velodrome56.jpg' } },
  // OL
  { match: /(lyon|olympique\s+lyonnais|\bol\b)/i, stadium: { name: 'Groupama Stadium', imagePath: '/stadiums/parc_ol06.jpg' } },
  // LOSC Lille
  { match: /(lille|losc)/i, stadium: { name: 'Decathlon Arena – Stade Pierre-Mauroy', imagePath: '/stadiums/grand_stade_lille15.jpg' } },
  // RC Lens
  { match: /(lens|rc\s*lens|rcl)/i, stadium: { name: 'Stade Bollaert-Delelis', imagePath: '/stadiums/stade_felix_bollaert30.jpg' } },
  // AS Monaco
  { match: /(monaco|as\s*monaco)/i, stadium: { name: 'Stade Louis-II', imagePath: '/stadiums/stade_louis_ii11.jpg' } },
  // Stade Rennais
  { match: /(rennes|stade\s+rennais)/i, stadium: { name: 'Roazhon Park', imagePath: '/stadiums/stade_route_de_lorient18.jpg' } },
  // OGC Nice
  { match: /(nice|ogc\s*nice)/i, stadium: { name: 'Allianz Riviera', imagePath: '/stadiums/allianz_riviera36.jpg' } },
  // FC Nantes
  { match: /(nantes|fc\s*nantes)/i, stadium: { name: 'Stade de la Beaujoire', imagePath: '/stadiums/stade_de_la_beaujoire21.jpg' } },
  // Stade de Reims
  { match: /(reims|stade\s+de\s+reims)/i, stadium: { name: 'Stade Auguste-Delaune', imagePath: '/stadiums/stade_auguste_delaune19.jpg' } },
  // Montpellier HSC
  { match: /(montpellier|mhsc)/i, stadium: { name: 'Stade de la Mosson', imagePath: '/stadiums/stade_de_la_mosso28.jpg' } },
  // RC Strasbourg
  { match: /(strasbourg|rcsa)/i, stadium: { name: 'Stade de la Meinau', imagePath: '/stadiums/stade_de_la_meinau22.jpg' } },
  // Toulouse FC
  { match: /(toulouse|tfc)/i, stadium: { name: 'Stadium de Toulouse', imagePath: '/stadiums/stade_de_toulouse10.jpg' } },
  // FC Lorient
  { match: /(lorient|fc\s*lorient)/i, stadium: { name: 'Stade du Moustoir', imagePath: '/stadiums/stade_yves_allainmat10.jpg' } },
  // Clermont Foot
  { match: /(clermont|clermont\s*foot)/i, stadium: { name: 'Stade Gabriel-Montpied', imagePath: '/stadiums/stade_gabriel_montpied07.jpg' } },
  // Stade Brestois 29
  { match: /(brest|stade\s*brestois|sb29)/i, stadium: { name: 'Stade Francis-Le Blé', imagePath: '/stadiums/stade_francis_le_ble09.jpg' } },
  // Angers SCO
  { match: /(angers|angers\s*sco|sco)/i, stadium: { name: 'Stade Raymond-Kopa', imagePath: '/stadiums/stade_raymond_kopa_angers05.jpg' } },
  // ESTAC Troyes
  { match: /(troyes|estac)/i, stadium: { name: "Stade de l'Aube", imagePath: '/stadiums/stade_de_laube25.jpg' } },
  // AC Ajaccio
  { match: /(ajaccio|ac\s*ajaccio)/i, stadium: { name: 'Stade François-Coty', imagePath: '/stadiums/stade_francois_coty03.jpg' } },
  // AJ Auxerre
  { match: /(auxerre|aj\s*auxerre)/i, stadium: { name: "Stade de l'Abbé-Deschamps", imagePath: '/stadiums/stade_de_abbe_deschamps03.jpg' } },
];

export function getStadiumForTeam(teamName: string): StadiumInfo | null {
  for (const entry of STADIUM_MAP) {
    if (entry.match.test(teamName)) return entry.stadium;
  }
  return null;
}


