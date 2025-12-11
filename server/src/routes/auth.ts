import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '../db/mongodb';
import { toUserResponse, type User } from '../models/User';
import { ObjectId } from 'mongodb';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

const router = Router();
const COLLECTION_NAME = 'users';

// Inscription
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database non disponible' });
    }

    const collection = db.collection(COLLECTION_NAME);

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const newUser: Omit<User, '_id'> = {
      email,
      name: name || email.split('@')[0],
      passwordHash,
      provider: 'email',
      createdAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newUser);
    const user = await collection.findOne({ _id: result.insertedId });

    if (!user) {
      return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }

    res.status(201).json({ user: toUserResponse(user) });
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database non disponible' });
    }

    const collection = db.collection(COLLECTION_NAME);

    // Trouver l'utilisateur
    const user = await collection.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    res.json({ user: toUserResponse(user) });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion avec Google
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token Google requis' });
    }

    // Deux méthodes possibles :
    // 1. Si c'est un id_token, on peut le vérifier directement
    // 2. Si c'est un access_token, on doit faire un appel à l'API Google
    
    let payload: any;
    
    try {
      // Essayer de vérifier comme id_token
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (idTokenError) {
      // Si ce n'est pas un id_token, essayer avec access_token
      try {
        const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
        if (!userInfoResponse.ok) {
          return res.status(401).json({ error: 'Token Google invalide' });
        }
        const userInfo = await userInfoResponse.json() as {
          email?: string;
          name?: string;
          picture?: string;
          id?: string;
        };
        payload = {
          email: userInfo.email || '',
          name: userInfo.name,
          picture: userInfo.picture,
          sub: userInfo.id || ''
        };
      } catch (accessTokenError) {
        return res.status(401).json({ error: 'Token Google invalide ou expiré' });
      }
    }

    if (!payload) {
      return res.status(401).json({ error: 'Impossible de récupérer les informations Google' });
    }

    const { email, name, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Email non disponible depuis Google' });
    }

    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database non disponible' });
    }

    const collection = db.collection(COLLECTION_NAME);

    // Chercher ou créer l'utilisateur
    let user = await collection.findOne({ email });

    if (!user) {
      // Créer un nouvel utilisateur Google
      const newUser: Omit<User, '_id'> = {
        email,
        name: name || email.split('@')[0],
        passwordHash: '', // Pas de mot de passe pour les utilisateurs Google
        provider: 'google',
        createdAt: new Date().toISOString()
      };

      const result = await collection.insertOne(newUser);
      user = await collection.findOne({ _id: result.insertedId });
    } else if (user.provider !== 'google') {
      // Si l'utilisateur existe déjà avec un autre provider (email), mettre à jour
      await collection.updateOne(
        { _id: user._id },
        { $set: { provider: 'google', name: name || user.name } }
      );
      user = await collection.findOne({ _id: user._id });
    }

    if (!user) {
      return res.status(500).json({ error: 'Erreur lors de la création/récupération de l\'utilisateur' });
    }

    res.json({ user: toUserResponse(user) });
  } catch (error) {
    console.error('[Auth] Google login error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir l'utilisateur actuel
router.get('/me', async (req: Request, res: Response) => {
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

    res.json({ user: toUserResponse(user) });
  } catch (error) {
    console.error('[Auth] Get me error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

