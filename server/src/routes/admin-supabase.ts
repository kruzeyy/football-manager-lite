import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase';

const router = Router();

function supabaseToUserResponse(user: any): any {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider || 'email',
    subscription: user.subscription || null,
    createdAt: user.created_at
  };
}

// Liste tous les utilisateurs avec leurs abonnements (pour administration)
// ⚠️ En production, ajoutez une authentification admin !
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin] Supabase error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const usersWithSubscriptions = (users || []).map(user => ({
      ...supabaseToUserResponse(user),
      subscription: user.subscription || null
    }));

    res.json({ users: usersWithSubscriptions });
  } catch (error) {
    console.error('[Admin] Get users error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Liste uniquement les utilisateurs avec abonnement actif
router.get('/users/subscribed', async (req: Request, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .filter('subscription->>active', 'eq', 'true')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin] Supabase error:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const subscribedUsers = (users || []).map(user => ({
      ...supabaseToUserResponse(user),
      subscription: user.subscription
    }));

    res.json({ users: subscribedUsers, count: subscribedUsers.length });
  } catch (error) {
    console.error('[Admin] Get subscribed users error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

