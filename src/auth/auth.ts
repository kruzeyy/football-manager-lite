const AUTH_KEY = 'fm_lite_auth';
const CURRENT_USER_KEY = 'fm_lite_current_user';

export interface User {
  id: string;
  email: string;
  name?: string;
  provider: 'email' | 'google';
  createdAt: string;
  passwordHash?: string; // Pour stocker le hash du mot de passe en DB
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Récupérer l'utilisateur actuel (depuis localStorage pour la session frontend)
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  try {
    const user = JSON.parse(stored) as User;
    // Ne pas retourner le passwordHash côté client
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch {
    return null;
  }
}

// Vérifier si l'utilisateur est authentifié
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

// Connecter un utilisateur (sauvegarder dans localStorage pour la session)
export function loginUser(user: User): void {
  if (typeof window === 'undefined') return;
  // Ne pas sauvegarder le passwordHash dans localStorage
  const { passwordHash, ...userWithoutPassword } = user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));
  localStorage.setItem(AUTH_KEY, 'true');
}

// Déconnecter l'utilisateur
export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(AUTH_KEY);
}

// Inscription avec email (utilise l'API backend)
export async function signUpWithEmail(email: string, password: string, name?: string): Promise<User> {
  const { signUp } = await import('./api');
  const user = await signUp(email, password, name);
  
  // Sauvegarder l'ID utilisateur pour les requêtes suivantes
  localStorage.setItem('fm_lite_user_id', user.id);
  loginUser(user);
  
  return user;
}

// Connexion avec email (utilise l'API backend)
export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  try {
    const { signIn } = await import('./api');
    const user = await signIn(email, password);
    
    // Sauvegarder l'ID utilisateur pour les requêtes suivantes
    localStorage.setItem('fm_lite_user_id', user.id);
    loginUser(user);
    
    return user;
  } catch (error) {
    console.error('[Auth] Sign in error:', error);
    return null;
  }
}

// Connexion avec Google (utilise l'API backend)
export async function signInWithGoogle(accessToken: string): Promise<User | null> {
  try {
    // D'abord, obtenir un id_token depuis le code d'autorisation
    // Pour simplifier, on utilise directement l'access_token avec Google API
    // Mais idéalement, on devrait utiliser l'id_token
    
    // Récupérer l'id_token depuis Google
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`);
    
    if (!response.ok) {
      // Si ça ne marche pas avec access_token, essayer de récupérer l'id_token
      // Pour l'instant, on va envoyer l'access_token au backend qui utilisera google-auth-library
      const { signInWithGoogle: signInAPI } = await import('./api');
      const user = await signInAPI(accessToken);
      
      if (user) {
        localStorage.setItem('fm_lite_user_id', user.id);
        loginUser(user);
        return user;
      }
      
      return null;
    }
    
    const googleUser = await response.json();
    
    // Maintenant, envoyer l'id_token au backend (on utilise l'access_token comme fallback)
    // Le backend doit vérifier le token avec google-auth-library
    const { signInWithGoogle: signInAPI } = await import('./api');
    const user = await signInAPI(accessToken);
    
    if (user) {
      localStorage.setItem('fm_lite_user_id', user.id);
      loginUser(user);
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('[Auth] Google sign in error:', error);
    return null;
  }
}

