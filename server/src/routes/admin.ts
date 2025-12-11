import { Router, Request, Response } from 'express';
import { getDb } from '../db/mongodb';
import { toUserResponse } from '../models/User';

const router = Router();
const COLLECTION_NAME = 'users';

// Liste tous les utilisateurs avec leurs abonnements (pour administration)
// ⚠️ En production, ajoutez une authentification admin !
router.get('/users', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database non disponible' });
    }

    const collection = db.collection(COLLECTION_NAME);
    const users = await collection.find({}).toArray();

    const usersWithSubscriptions = users.map(user => ({
      ...toUserResponse(user),
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
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database non disponible' });
    }

    const collection = db.collection(COLLECTION_NAME);
    const users = await collection.find({
      'subscription.active': true
    }).toArray();

    const subscribedUsers = users.map(user => ({
      ...toUserResponse(user),
      subscription: user.subscription
    }));

    res.json({ users: subscribedUsers, count: subscribedUsers.length });
  } catch (error) {
    console.error('[Admin] Get subscribed users error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

