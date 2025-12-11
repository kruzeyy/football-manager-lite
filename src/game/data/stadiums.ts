export type StadiumInfo = {
  name: string;
  imageUrl: string; // URL de l'image (depuis API ou service externe)
  capacity?: number | null; // capacité du stade (depuis API)
  city?: string | null; // ville du stade (depuis API)
  address?: string | null; // adresse du stade (depuis API)
};

// Mapping heuristique par nom d'équipe (contient) -> nom du stade (fallback si API ne retourne pas de stade)
// Les images seront générées automatiquement depuis Unsplash
const STADIUM_NAME_MAP: Array<{ match: RegExp; stadiumName: string; city?: string }> = [
  // Ligue 1
  { match: /(paris\s*saint\s*germain|paris sg|psg|paris\b)/i, stadiumName: 'Parc des Princes', city: 'Paris' },
  { match: /(marseille|om|olympique\s+de\s+marseille)/i, stadiumName: 'Stade Vélodrome', city: 'Marseille' },
  { match: /(lyon|olympique\s+lyonnais|\bol\b)/i, stadiumName: 'Groupama Stadium', city: 'Lyon' },
  { match: /(lille|losc)/i, stadiumName: 'Decathlon Arena – Stade Pierre-Mauroy', city: 'Lille' },
  { match: /(lens|rc\s*lens|rcl)/i, stadiumName: 'Stade Bollaert-Delelis', city: 'Lens' },
  { match: /(monaco|as\s*monaco)/i, stadiumName: 'Stade Louis-II', city: 'Monaco' },
  { match: /(rennes|stade\s+rennais)/i, stadiumName: 'Roazhon Park', city: 'Rennes' },
  { match: /(nice|ogc\s*nice)/i, stadiumName: 'Allianz Riviera', city: 'Nice' },
  { match: /(nantes|fc\s*nantes)/i, stadiumName: 'Stade de la Beaujoire', city: 'Nantes' },
  { match: /(reims|stade\s+de\s+reims)/i, stadiumName: 'Stade Auguste-Delaune', city: 'Reims' },
  { match: /(montpellier|mhsc)/i, stadiumName: 'Stade de la Mosson', city: 'Montpellier' },
  { match: /(strasbourg|rcsa)/i, stadiumName: 'Stade de la Meinau', city: 'Strasbourg' },
  { match: /(toulouse|tfc)/i, stadiumName: 'Stadium de Toulouse', city: 'Toulouse' },
  { match: /(lorient|fc\s*lorient)/i, stadiumName: 'Stade du Moustoir', city: 'Lorient' },
  { match: /(clermont|clermont\s*foot)/i, stadiumName: 'Stade Gabriel-Montpied', city: 'Clermont-Ferrand' },
  { match: /(brest|stade\s*brestois|sb29)/i, stadiumName: 'Stade Francis-Le Blé', city: 'Brest' },
  { match: /(angers|angers\s*sco|sco)/i, stadiumName: 'Stade Raymond-Kopa', city: 'Angers' },
  { match: /(troyes|estac)/i, stadiumName: "Stade de l'Aube", city: 'Troyes' },
  { match: /(ajaccio|ac\s*ajaccio)/i, stadiumName: 'Stade François-Coty', city: 'Ajaccio' },
  { match: /(auxerre|aj\s*auxerre)/i, stadiumName: "Stade de l'Abbé-Deschamps", city: 'Auxerre' },
  
  // Ligue 2
  { match: /(bordeaux|girondins)/i, stadiumName: 'Matmut Atlantique', city: 'Bordeaux' },
  { match: /(amiens|sc\s*amiens)/i, stadiumName: 'Stade de la Licorne', city: 'Amiens' },
  { match: /(caen|malherbe\s*caen|sm\s*caen)/i, stadiumName: "Stade Michel d'Ornano", city: 'Caen' },
  { match: /(dijon|dfco)/i, stadiumName: 'Stade Gaston-Gérard', city: 'Dijon' },
  { match: /(guingamp|eag|en\s*avant\s*guingamp)/i, stadiumName: 'Stade du Roudourou', city: 'Guingamp' },
  { match: /(nimes|nîmes|nîmes\s*olympique)/i, stadiumName: 'Stade des Costières', city: 'Nîmes' },
  { match: /(grenoble|gf38|grenoble\s*foot)/i, stadiumName: 'Stade des Alpes', city: 'Grenoble' },
  { match: /(valenciennes|vafc|valenciennes\s*fc)/i, stadiumName: 'Stade du Hainaut', city: 'Valenciennes' },
  { match: /(havre|le\s*havre|hac)/i, stadiumName: "Stade Océane", city: 'Le Havre' },
  { match: /(metz|fc\s*metz)/i, stadiumName: 'Stade Saint-Symphorien', city: 'Metz' },
  { match: /(niort|chamois\s*niortais)/i, stadiumName: 'Stade René-Gaillard', city: 'Niort' },
  { match: /(paris\s*fc|pfc)/i, stadiumName: 'Stade Charléty', city: 'Paris' },
  { match: /(sochaux|fcsm|fc\s*sochaux)/i, stadiumName: 'Stade Auguste-Bonal', city: 'Montbéliard' },
  { match: /(quevilly|qrm|quevilly\s*rouen)/i, stadiumName: 'Stade Robert Diochon', city: 'Rouen' },
  { match: /(laval|stade\s*lavallois)/i, stadiumName: 'Stade Francis-Le Basser', city: 'Laval' },
  { match: /(saint\s*etienne|saint-étienne|asse|st\s*etienne)/i, stadiumName: 'Stade Geoffroy-Guichard', city: 'Saint-Étienne' },
  { match: /(pau|pau\s*fc)/i, stadiumName: 'Nouste Camp', city: 'Pau' },
  { match: /(rodez|raf|rodez\s*af)/i, stadiumName: 'Stade Paul-Lignon', city: 'Rodez' },
  { match: /(bastia|sc\s*bastia)/i, stadiumName: 'Stade Armand-Cesari', city: 'Bastia' },
  { match: /(annecy|fc\s*annecy)/i, stadiumName: 'Parc des Sports', city: 'Annecy' },
];

const STADIUM_CACHE_KEY = 'fm-lite-stadiums-cache-v1';

// Cache en mémoire pour les stades récupérés depuis l'API (clé: nom d'équipe)
let apiStadiumCache: Map<string, StadiumInfo> | null = null;

/**
 * Charge le cache des stades depuis localStorage
 */
function loadStadiumCache(): Map<string, StadiumInfo> {
  if (apiStadiumCache) return apiStadiumCache;
  
  apiStadiumCache = new Map<string, StadiumInfo>();
  try {
    const raw = localStorage.getItem(STADIUM_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as Record<string, StadiumInfo>;
      for (const [key, value] of Object.entries(cached)) {
        apiStadiumCache.set(key.toLowerCase(), value);
      }
    }
  } catch (e) {
    console.warn('[stadiums] Failed to load stadium cache:', e);
  }
  return apiStadiumCache;
}

/**
 * Sauvegarde le cache des stades dans localStorage
 */
function saveStadiumCache(): void {
  if (!apiStadiumCache) return;
  try {
    const toSave: Record<string, StadiumInfo> = {};
    for (const [key, value] of apiStadiumCache.entries()) {
      toSave[key] = value;
    }
    localStorage.setItem(STADIUM_CACHE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('[stadiums] Failed to save stadium cache:', e);
  }
}

/**
 * Sauvegarde un stade récupéré depuis l'API pour une équipe
 */
export function setApiStadiumForTeam(teamName: string, stadium: StadiumInfo): void {
  const cache = loadStadiumCache();
  cache.set(teamName.toLowerCase(), stadium);
  saveStadiumCache();
}

/**
 * Récupère le stade d'une équipe, en priorité depuis le cache API, sinon depuis le mapping manuel
 */
export function getStadiumForTeam(teamName: string): StadiumInfo | null {
  // D'abord vérifier le cache API (qui charge depuis localStorage si nécessaire)
  const cache = loadStadiumCache();
  const cached = cache.get(teamName.toLowerCase());
  if (cached) {
    return cached;
  }
  
  // Vérifier aussi avec différentes variantes du nom (match partiel)
  for (const [key, value] of cache.entries()) {
    if (teamName.toLowerCase().includes(key) || key.includes(teamName.toLowerCase())) {
      return value;
    }
  }
  
  // Sinon utiliser le mapping manuel (fallback uniquement si pas de stade API)
  // Créer un StadiumInfo avec une image générée depuis Unsplash
  for (const entry of STADIUM_NAME_MAP) {
    if (entry.match.test(teamName)) {
      return {
        name: entry.stadiumName,
        imageUrl: getStadiumImageUrl(entry.stadiumName, entry.city),
        city: entry.city ?? undefined,
      };
    }
  }
  
  return null;
}

/**
 * Génère une URL d'image pour un stade depuis Unsplash (fallback si l'API n'a pas d'image)
 */
function getStadiumImageUrl(stadiumName: string, city?: string | null): string {
  // Si on a une ville, chercher "stade [nom] [ville] football"
  // Sinon juste "stade [nom] football"
  const searchQuery = city 
    ? `${stadiumName} ${city} football stadium`
    : `${stadiumName} football stadium`;
  
  // Utiliser Unsplash Source API (gratuit, pas de clé API nécessaire)
  // Format: https://source.unsplash.com/featured/?{query}
  const encodedQuery = encodeURIComponent(searchQuery);
  return `https://source.unsplash.com/featured/1200x600/?${encodedQuery}`;
}

/**
 * Convertit les données de venue de l'API en StadiumInfo
 */
export function createStadiumFromApiVenue(venue: {
  id: number | null;
  name: string | null;
  address: string | null;
  city: string | null;
  capacity: number | null;
  surface: string | null;
  image: string | null;
} | null | undefined): StadiumInfo | null {
  if (!venue || !venue.name) return null;
  
  // Utiliser l'image de l'API si disponible, sinon générer une URL Unsplash
  const imageUrl = venue.image || getStadiumImageUrl(venue.name, venue.city);
  
  return {
    name: venue.name,
    imageUrl: imageUrl,
    capacity: venue.capacity ?? undefined,
    city: venue.city ?? undefined,
    address: venue.address ?? undefined,
  };
}


