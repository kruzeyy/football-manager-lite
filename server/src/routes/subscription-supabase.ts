import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticate } from '../middleware/auth-supabase';

const router = Router();

// Middleware pour toutes les routes d'abonnement
router.use(authenticate);

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

// Activer un abonnement
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.userId; // Récupéré du middleware authenticate
    const { type, isTest } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!type || (type !== 'monthly' && type !== 'yearly')) {
      return res.status(400).json({ error: 'Type d\'abonnement invalide (monthly ou yearly)' });
    }

    const startDate = new Date().toISOString();
    let endDate: string | null = null;

    // Si ce n'est pas un test, calculer la date de fin
    if (!isTest) {
      if (type === 'monthly') {
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        endDate = end.toISOString();
      } else {
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);
        endDate = end.toISOString();
      }
    }

    const subscription = {
      active: true,
      type,
      startDate,
      endDate
    };

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ subscription })
      .eq('id', userId)
      .select()
      .single();

    if (error || !updatedUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: supabaseToUserResponse(updatedUser), message: 'Abonnement activé avec succès' });
  } catch (error) {
    console.error('[Subscription] Subscribe error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Annuler un abonnement
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const userId = req.userId; // Récupéré du middleware authenticate

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const subscription = { active: false, type: null, startDate: '', endDate: null };

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ subscription })
      .eq('id', userId)
      .select()
      .single();

    if (error || !updatedUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: supabaseToUserResponse(updatedUser), message: 'Abonnement annulé' });
  } catch (error) {
    console.error('[Subscription] Cancel error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir le statut de l'abonnement
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.userId; // Récupéré du middleware authenticate

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('subscription')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    let subscription = user.subscription || { active: false, type: null, startDate: '', endDate: null };

    // Vérifier si l'abonnement n'est pas expiré
    if (subscription.active && subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      if (now > endDate) {
        subscription.active = false;
        // Mettre à jour en base
        await supabase
          .from('users')
          .update({ subscription })
          .eq('id', userId);
      }
    }

    res.json({ subscription });
  } catch (error) {
    console.error('[Subscription] Status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

