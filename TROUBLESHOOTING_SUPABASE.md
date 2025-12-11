# 🔧 Guide de dépannage - Utilisateurs Supabase

## ✅ Vérifications effectuées

1. **Connexion Supabase** : ✅ OK
2. **Backend serveur** : ✅ Fonctionne sur http://localhost:3001
3. **Table users** : ✅ Existe et contient 1 utilisateur
4. **Endpoint Google OAuth** : ✅ Fonctionne

## 📊 État actuel

**Utilisateur trouvé dans Supabase :**
- Email: `maxolol19@gmail.com`
- Nom: `Kruzeyy`
- Provider: `google`
- Créé le: 11/12/2025 21:16:36

## 🔍 Où voir vos utilisateurs dans Supabase

### ❌ Ne regardez PAS ici :
- **Authentication > Users** (c'est pour le système Auth natif de Supabase, pas votre table)

### ✅ Regardez ICI :
1. Allez sur https://supabase.com/dashboard/project/votre-projet-id
2. Menu de gauche → **"Table Editor"** (icône de tableau)
3. Cliquez sur la table **`users`**
4. Vous devriez voir vos utilisateurs

## 🧪 Test de connexion Google

Pour tester une nouvelle connexion Google :

1. **Démarrez le frontend** :
   ```bash
   npm run dev
   ```

2. **Démarrez le backend** (déjà fait) :
   ```bash
   cd server && npm run dev
   ```

3. **Dans votre navigateur** :
   - Allez sur http://localhost:5173
   - Cliquez sur "Continuer avec Google"
   - Connectez-vous avec votre compte Google
   - L'utilisateur devrait être créé automatiquement

4. **Vérifiez dans Supabase** :
   - Table Editor > users
   - Vous devriez voir le nouvel utilisateur

## 🐛 Problèmes possibles

### Problème 1 : "Aucun utilisateur dans Supabase"

**Solution :**
- Vérifiez que vous regardez bien **Table Editor > users** (pas Authentication > Users)
- Vérifiez les logs du backend pour voir s'il y a des erreurs
- Testez une nouvelle connexion Google depuis le frontend

### Problème 2 : "Le frontend ne se connecte pas au backend"

**Vérifiez :**
- Le fichier `.env.local` contient : `VITE_API_URL=http://localhost:3001/api`
- Le backend est démarré sur le port 3001
- Pas d'erreurs CORS dans la console du navigateur

### Problème 3 : "Erreur lors de la connexion Google"

**Vérifiez :**
- Le Google Client ID est correct dans `.env.local`
- Le Google Client Secret est correct dans `server/.env`
- Les URLs de redirection sont configurées dans Google Cloud Console

## 📝 Commandes utiles

### Vérifier les utilisateurs dans Supabase :
```bash
cd server && node list-tables.js
```

### Vérifier la connexion backend :
```bash
curl http://localhost:3001/api/health
```

### Voir les logs du backend :
Les logs s'affichent dans le terminal où vous avez lancé `npm run dev` dans le dossier `server/`

## 🔄 Réinitialiser la table users

Si vous voulez supprimer tous les utilisateurs et recommencer :

1. Dans Supabase SQL Editor, exécutez :
```sql
DELETE FROM users;
```

2. Ou supprimez la table et recréez-la :
```sql
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'email',
  subscription JSONB DEFAULT '{"active": false, "type": null, "startDate": "", "endDate": null}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

