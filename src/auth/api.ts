const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface User {
  id: string;
  email: string;
  name?: string;
  provider: 'email' | 'google';
  subscription?: {
    active: boolean;
    type: 'monthly' | 'yearly' | null;
    startDate: string;
    endDate: string | null;
  };
  createdAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface SubscriptionResponse {
  subscription: {
    active: boolean;
    type: 'monthly' | 'yearly' | null;
    startDate: string;
    endDate: string | null;
  };
}

// Inscription
export async function signUp(email: string, password: string, name?: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de l\'inscription');
  }

  const data: AuthResponse = await response.json();
  return data.user;
}

// Connexion
export async function signIn(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la connexion');
  }

  const data: AuthResponse = await response.json();
  return data.user;
}

// Connexion avec Google
export async function signInWithGoogle(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la connexion Google');
  }

  const data: AuthResponse = await response.json();
  return data.user;
}

// Obtenir l'utilisateur actuel
export async function getCurrentUserFromAPI(): Promise<User | null> {
  const userId = localStorage.getItem('fm_lite_user_id');
  if (!userId) return null;

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      'x-user-id': userId,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data: AuthResponse = await response.json();
  return data.user;
}

// Activer un abonnement
export async function subscribe(type: 'monthly' | 'yearly'): Promise<User> {
  const userId = localStorage.getItem('fm_lite_user_id');
  if (!userId) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_BASE_URL}/subscription/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify({ type }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de l\'activation de l\'abonnement');
  }

  const data: AuthResponse = await response.json();
  return data.user;
}

// Annuler un abonnement
export async function cancelSubscription(): Promise<User> {
  const userId = localStorage.getItem('fm_lite_user_id');
  if (!userId) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_BASE_URL}/subscription/cancel`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de l\'annulation');
  }

  const data: AuthResponse = await response.json();
  return data.user;
}

// Obtenir le statut de l'abonnement
export async function getSubscriptionStatus(): Promise<SubscriptionResponse['subscription']> {
  const userId = localStorage.getItem('fm_lite_user_id');
  if (!userId) {
    return { active: false, type: null, startDate: '', endDate: null };
  }

  const response = await fetch(`${API_BASE_URL}/subscription/status`, {
    headers: {
      'x-user-id': userId,
    },
  });

  if (!response.ok) {
    return { active: false, type: null, startDate: '', endDate: null };
  }

  const data: SubscriptionResponse = await response.json();
  return data.subscription;
}

