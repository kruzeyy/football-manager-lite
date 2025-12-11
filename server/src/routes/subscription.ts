import { Router, Request, Response } from 'express';
import { getDb } from '../db/mongodb';
import { toUserResponse } from '../models/User';
import { ObjectId } from 'mongodb';

const router = Router();
const COLLECTION_NAME = 'users';

// Activer un abonnement
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { type } = req.body; // 'monthly' ou 'yearly'

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!type || (type !== 'monthly' && type !== 'yearly')) {
      return res.status(400).json({ error: 'Type d\'abonnement invalide (monthly ou yearly)' });
    }

    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database non disponible' });
    }

    const collection = db.collection(COLLECTION_NAME);

    const startDate = new Date().toISOString();
    let endDate: string;

    if (type === 'monthly') {
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      endDate = end.toISOString();
    } else {
      const end = new Date();
      end.setFullYear(end.getFullYear() + 1);
      endDate = end.toISOString();
    }

    const subscription = {
      active: true,
      type,
      startDate,
      endDate
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { subscription } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: toUserResponse(result), message: 'Abonnement activé avec succès' });
  } catch (error) {
    console.error('[Subscription] Subscribe error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Annuler un abonnement
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database non disponible' });
    }

    const collection = db.collection(COLLECTION_NAME);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { subscription: { active: false, type: null, startDate: '', endDate: null } } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: toUserResponse(result), message: 'Abonnement annulé' });
  } catch (error) {
    console.error('[Subscription] Cancel error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir le statut de l'abonnement
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database non disponible' });
    }

    const collection = db.collection(COLLECTION_NAME);
    const user = await collection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const subscription = user.subscription || { active: false, type: null, startDate: '', endDate: null };

    // Vérifier si l'abonnement n'est pas expiré
    if (subscription.active && subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      if (now > endDate) {
        subscription.active = false;
        // Mettre à jour en base
        await collection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { subscription: { ...subscription, active: false } } }
        );
      }
    }

    res.json({ subscription });
  } catch (error) {
    console.error('[Subscription] Status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

