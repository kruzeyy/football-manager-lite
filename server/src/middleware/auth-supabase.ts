import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase';

// Étendre l'interface Request d'Express pour inclure userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Middleware simple pour vérifier l'authentification
// En production, utilisez JWT tokens
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié: ID utilisateur manquant' });
  }

  try {
    // Vérifier que l'utilisateur existe dans Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Non authentifié: Utilisateur non trouvé' });
    }

    req.userId = userId; // Attacher l'ID utilisateur à la requête
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ error: 'Erreur d\'authentification' });
  }
};

