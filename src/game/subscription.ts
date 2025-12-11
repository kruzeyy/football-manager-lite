const SUBSCRIPTION_KEY = 'fm_lite_subscription';

export interface Subscription {
  active: boolean;
  type: 'monthly' | 'yearly' | null;
  startDate: string;
  endDate: string | null;
}

export function getSubscription(): Subscription | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SUBSCRIPTION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Subscription;
  } catch {
    return null;
  }
}

export async function setSubscription(type: 'monthly' | 'yearly'): Promise<Subscription> {
  try {
    const { subscribe } = await import('../auth/api');
    const user = await subscribe(type);
    
    if (user.subscription) {
      localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(user.subscription));
      return user.subscription;
    }
    
    throw new Error('Abonnement non retourné par l\'API');
  } catch (error) {
    console.error('[Subscription] Set subscription error:', error);
    throw error;
  }
}

export async function cancelSubscription(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const { cancelSubscription: cancelSubscriptionAPI } = await import('../auth/api');
    await cancelSubscriptionAPI();
    localStorage.removeItem(SUBSCRIPTION_KEY);
  } catch (error) {
    console.error('[Subscription] Cancel subscription error:', error);
    throw error;
  }
}

export async function isSubscriptionActive(): Promise<boolean> {
  try {
    const { getSubscriptionStatus } = await import('../auth/api');
    const subscription = await getSubscriptionStatus();
    
    if (!subscription || !subscription.active) {
      // Synchroniser avec localStorage
      localStorage.removeItem(SUBSCRIPTION_KEY);
      return false;
    }
    
    // Synchroniser avec localStorage
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
    return true;
  } catch (error) {
    console.error('[Subscription] Check active error:', error);
    // Fallback sur localStorage en cas d'erreur
    const sub = getSubscription();
    return sub?.active || false;
  }
}

// Version synchrone pour les vérifications rapides (utilise le cache localStorage)
export function isSubscriptionActiveSync(): boolean {
  const sub = getSubscription();
  if (!sub || !sub.active) return false;
  
  // Vérifier si l'abonnement n'est pas expiré
  if (sub.endDate) {
    const endDate = new Date(sub.endDate);
    const now = new Date();
    if (now > endDate) {
      localStorage.removeItem(SUBSCRIPTION_KEY);
      return false;
    }
  }
  
  return true;
}

// Fonction pour tester (activer un abonnement de test qui n'expire jamais)
export function setTestSubscription(type: 'monthly' | 'yearly' = 'yearly'): Subscription {
  const subscription: Subscription = {
    active: true,
    type,
    startDate: new Date().toISOString(),
    endDate: null // null = n'expire jamais (pour les tests)
  };
  
  localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
  return subscription;
}

// Limitations pour la version gratuite
export const FREE_LIMITATIONS = {
  maxCareers: 1, // Nombre maximum de carrières
  maxTransfersPerSeason: 3, // Transfers limités par saison
  limitedStats: true, // Statistiques limitées
  noAdvancedFeatures: true, // Pas de fonctionnalités avancées
  league2Only: true, // Uniquement Ligue 2 accessible
} as const;

// Vérifier si une fonctionnalité est disponible
export function isFeatureAvailable(feature: keyof typeof FREE_LIMITATIONS): boolean {
  if (isSubscriptionActiveSync()) return true;
  return false; // Toutes les fonctionnalités sont limitées sans abonnement
}

// Obtenir le message de restriction
export function getRestrictionMessage(feature: string): string {
  return `Cette fonctionnalité nécessite un abonnement. Voulez-vous vous abonner pour accéder à ${feature} ?`;
}

