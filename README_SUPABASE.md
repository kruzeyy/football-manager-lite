# Configuration Supabase (Gratuit - 500 MB)

## Pourquoi Supabase ?

✅ **100% gratuit** : 500 MB de stockage, toujours gratuit  
✅ **PostgreSQL** : Base de données SQL puissante  
✅ **Interface web** : Gestion facile de la base de données  
✅ **API automatique** : REST API générée automatiquement  
✅ **Pas de cold start** : Base de données toujours active  

## Étapes pour configurer Supabase

### 1. Créer un compte Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez sur "Start your project" ou "Sign in"
3. Connectez-vous avec GitHub (recommandé)

### 2. Créer un nouveau projet

1. Cliquez sur "New Project"
2. Remplissez :
   - **Name** : `football-manager-lite`
   - **Database Password** : Choisissez un mot de passe fort (⚠️ notez-le !)
   - **Region** : Choisissez la région la plus proche (ex: `West EU (Paris)`)
3. Cliquez sur "Create new project"
4. Attendez 1-2 minutes que le projet soit créé

### 3. Créer la table `users`

1. Dans votre projet Supabase, allez dans "SQL Editor" (menu de gauche)
2. Cliquez sur "New query"
3. Copiez-collez ce SQL :

```sql
-- Créer la table users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'email',
  subscription JSONB DEFAULT '{"active": false, "type": null, "startDate": "", "endDate": null}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer un index sur l'email pour les recherches rapides
CREATE INDEX idx_users_email ON users(email);

-- Activer Row Level Security (optionnel mais recommandé)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre les opérations (à adapter selon vos besoins)
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (true);
```

4. Cliquez sur "Run" ou appuyez sur `Ctrl/Cmd + Enter`

### 4. Récupérer les identifiants Supabase

1. Dans votre projet, allez dans "Settings" (⚙️) → "API"
2. Vous verrez :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Copiez ces deux valeurs

### 5. Configurer les variables d'environnement

Dans votre fichier `server/.env`, ajoutez :

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (gardez vos valeurs existantes)
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret

# Server
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

⚠️ **Ne commitez JAMAIS ces clés dans Git !**

### 6. Choisir quel système utiliser

Vous avez maintenant deux options dans votre code :

**Option A : Utiliser MongoDB (local)** - `server/src/routes/auth.ts`  
**Option B : Utiliser Supabase (cloud)** - `server/src/routes/auth-supabase.ts`

Pour utiliser Supabase, modifiez `server/src/index.ts` :

```typescript
// Remplacez :
import authRoutes from './routes/auth';
import subscriptionRoutes from './routes/subscription';

// Par :
import authRoutes from './routes/auth-supabase';
import subscriptionRoutes from './routes/subscription-supabase';
```

### 7. Tester localement

```bash
cd server
npm run dev
```

Votre backend devrait maintenant se connecter à Supabase au lieu de MongoDB local !

## Avantages de Supabase

- ✅ **Gratuit à vie** : 500 MB c'est largement suffisant pour commencer
- ✅ **Interface SQL** : Vous pouvez voir/modifier vos données facilement
- ✅ **API automatique** : REST API disponible automatiquement
- ✅ **Dashboard** : Visualisez vos données en temps réel

## Migration des données

Si vous avez déjà des utilisateurs dans MongoDB local et voulez les migrer vers Supabase, je peux créer un script de migration pour vous !

## Pour le déploiement sur Railway

Quand vous déploierez sur Railway, ajoutez simplement les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans les variables d'environnement Railway.

Pas besoin de `MONGODB_URI` si vous utilisez Supabase !

