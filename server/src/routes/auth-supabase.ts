import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../db/supabase';
import { toUserResponse } from '../models/User';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

const router = Router();

// Helper pour convertir Supabase user en UserResponse
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

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        name: name || email.split('@')[0],
        password_hash: passwordHash,
        provider: 'email'
      })
      .select()
      .single();

    if (error) {
      console.error('[Auth] Supabase signup error:', error);
      return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }

    res.status(201).json({ user: supabaseToUserResponse(newUser) });
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

    // Trouver l'utilisateur
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    res.json({ user: supabaseToUserResponse(user) });
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

    let payload: any;
    
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (idTokenError) {
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

    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Impossible de récupérer les informations Google' });
    }

    const { email, name } = payload;

    // Chercher ou créer l'utilisateur
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    let user;

    if (existingUser && !findError) {
      // Mettre à jour si nécessaire
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ provider: 'google', name: name || existingUser.name })
        .eq('email', email)
        .select()
        .single();
      
      if (updateError) {
        console.error('[Auth] Supabase update error:', updateError);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
      }
      user = updatedUser;
    } else {
      // Créer un nouvel utilisateur
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email,
          name: name || email.split('@')[0],
          password_hash: '',
          provider: 'google'
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[Auth] Supabase insert error:', insertError);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
      }
      user = newUser;
    }

    if (!user) {
      return res.status(500).json({ error: 'Erreur lors de la création/récupération de l\'utilisateur' });
    }

    res.json({ user: supabaseToUserResponse(user) });
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

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: supabaseToUserResponse(user) });
  } catch (error) {
    console.error('[Auth] Get me error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

