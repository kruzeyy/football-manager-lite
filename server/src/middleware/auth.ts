import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/mongodb';
import { ObjectId } from 'mongodb';

export interface AuthRequest extends Request {
  userId?: string;
}

// Middleware simple pour vérifier l'authentification
// En production, utilisez JWT tokens
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  // Vérifier que l'utilisateur existe
  const db = getDb();
  if (!db) {
    return res.status(500).json({ error: 'Database non disponible' });
  }

  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

