# Déploiement sur Railway

## ⚠️ Nouveau : Utiliser Supabase (100% gratuit) !

**Recommandé** : Utilisez Supabase au lieu de MongoDB Atlas. C'est plus simple et 100% gratuit (500 MB) !

👉 **Voir le guide complet : [README_SUPABASE.md](./README_SUPABASE.md)**

---

## Ancienne méthode : MongoDB Atlas

### 1. Préparer MongoDB Atlas (Base de données cloud)

1. Allez sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un compte gratuit (si vous n'en avez pas)
3. Créez un cluster gratuit (M0 - 512 MB)
4. Créez un utilisateur de base de données :
   - Database Access → Add New Database User
   - Username et Password (notez-les !)
5. Configurez le réseau :
   - Network Access → Add IP Address
   - Cliquez sur "Allow Access from Anywhere" (0.0.0.0/0) pour le développement
6. Récupérez l'URI de connexion :
   - Clusters → Connect → Connect your application
   - Copiez l'URI (elle ressemble à : `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`)

### 2. Préparer le projet

Le projet est déjà configuré avec :
- ✅ `railway.json` - Configuration Railway
- ✅ `nixpacks.toml` - Build configuration
- ✅ Scripts npm pour build/start

### 3. Déployer sur Railway

1. **Créer un compte Railway**
   - Allez sur [railway.app](https://railway.app)
   - Connectez-vous avec GitHub

2. **Créer un nouveau projet**
   - Cliquez sur "New Project"
   - Sélectionnez "Deploy from GitHub repo"
   - Choisissez votre repository `football-manager-lite`

3. **Configurer le service**
   - Railway détecte automatiquement le dossier `server/`
   - Sinon, configurez le "Root Directory" à `server`

4. **Configurer les variables d'environnement**
   - Dans votre projet Railway, allez dans "Variables"
   - Ajoutez toutes les variables suivantes :

**Si vous utilisez Supabase (recommandé) :**
```env
PORT=3001
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Si vous utilisez MongoDB Atlas :**
```env
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/football_manager
DB_NAME=football_manager
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

⚠️ **Important :**
- Pour Supabase : Remplacez `SUPABASE_URL` et `SUPABASE_ANON_KEY` par vos valeurs (voir README_SUPABASE.md)
- Pour MongoDB : Remplacez `MONGODB_URI` par votre vraie URI MongoDB Atlas
- Changez `JWT_SECRET` par une clé secrète aléatoire (générez-en une avec : `openssl rand -base64 32`)

5. **Déployer**
   - Railway va automatiquement builder et déployer votre backend
   - Attendez que le déploiement soit terminé
   - Notez l'URL de votre backend (ex: `https://your-app.railway.app`)

### 4. Configurer le frontend

Mettez à jour votre `.env.local` du frontend :

```env
VITE_API_URL=https://votre-app.railway.app/api
VITE_GOOGLE_CLIENT_ID=votre_google_client_id
```

⚠️ **Important :** Ajoutez aussi l'URL Railway dans les "Authorized redirect URIs" de Google Cloud Console !

### 5. Vérifier le déploiement

Testez votre API :
```bash
curl https://votre-app.railway.app/api/health
```

Devrait retourner :
```json
{"status":"OK","message":"Backend is running"}
```

## Commandes utiles Railway

- **Voir les logs** : Dans Railway, cliquez sur votre service → "Logs"
- **Redéployer** : Push sur GitHub déclenche un redéploiement automatique
- **Variables d'environnement** : Modifiables dans "Variables"

## Coûts

- **Gratuit** : 5 $ de crédits par mois
- **Backend Express** : ~1-2 $ par mois
- **Vous avez environ 2-3 mois gratuits** avec les crédits offerts

## Dépannage

### Le backend ne démarre pas
- Vérifiez les logs dans Railway
- Vérifiez que toutes les variables d'environnement sont configurées
- Vérifiez que MongoDB Atlas accepte les connexions depuis Railway

### Erreur de connexion MongoDB
- Vérifiez que l'IP de Railway est autorisée dans MongoDB Atlas (ou utilisez 0.0.0.0/0)
- Vérifiez l'URI de connexion (username, password, cluster)

