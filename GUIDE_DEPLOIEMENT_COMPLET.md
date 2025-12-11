# 🚀 Guide de déploiement complet - Mise en ligne de votre application

Ce guide vous explique comment déployer votre application **Football Manager Lite** sur internet.

## 📋 Architecture

Votre application comprend :
- **Frontend** : React + Vite (dossier racine)
- **Backend** : Node.js + Express (dossier `server/`)
- **Base de données** : Supabase (déjà hébergée dans le cloud)

## 🎯 Plan de déploiement

1. **Backend** → Railway (gratuit pour commencer)
2. **Frontend** → Vercel (gratuit et très simple)
3. **Configuration** → Variables d'environnement et URLs

---

## 🔧 Partie 1 : Déployer le Backend sur Railway

### Étape 1.1 : Préparer votre compte Railway

1. Allez sur [railway.app](https://railway.app)
2. Cliquez sur "Start a New Project"
3. Connectez-vous avec GitHub (recommandé)

### Étape 1.2 : Créer un nouveau projet

1. Dans Railway, cliquez sur "New Project"
2. Sélectionnez "Deploy from GitHub repo"
3. Choisissez votre repository `football-manager-lite`
4. Railway détecte automatiquement le dossier `server/`

### Étape 1.3 : Configurer le service backend

1. Railway devrait créer un service automatiquement
2. Si le service pointe vers la racine, configurez :
   - **Root Directory** : `server`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`

### Étape 1.4 : Configurer les variables d'environnement

Dans Railway, allez dans votre service → **"Variables"** → Ajoutez :

```env
# Supabase (obligatoire)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_secret_supabase

# Google OAuth (obligatoire)
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret

# Server (obligatoire)
PORT=3001
JWT_SECRET=votre-cle-secrete-aleatoire-changez-moi

# Optionnel (pour MongoDB si vous en avez encore besoin)
# MONGODB_URI=mongodb://localhost:27017
# DB_NAME=football_manager
```

⚠️ **Important** :
- Générez un nouveau `JWT_SECRET` avec : `openssl rand -base64 32`
- Remplacez `votre-cle-secrete-aleatoire-changez-moi` par la clé générée

### Étape 1.5 : Obtenir l'URL de votre backend

1. Une fois le déploiement terminé, Railway vous donne une URL
2. Exemple : `https://your-app-name.up.railway.app`
3. **Notez cette URL**, vous en aurez besoin pour le frontend !

### Étape 1.6 : Tester le backend

```bash
curl https://votre-backend.railway.app/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"Backend is running","db":"Supabase"}
```

---

## 🎨 Partie 2 : Déployer le Frontend sur Vercel

### Étape 2.1 : Préparer votre projet pour le déploiement

1. **Créer un fichier `.env.production`** à la racine :

```env
VITE_API_URL=https://votre-backend.railway.app/api
VITE_GOOGLE_CLIENT_ID=votre_google_client_id
```

⚠️ Remplacez `votre-backend.railway.app` par votre vraie URL Railway !

### Étape 2.2 : Installer Vercel CLI (optionnel, mais recommandé)

```bash
npm install -g vercel
```

### Étape 2.3 : Déployer sur Vercel via l'interface web

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur "Sign Up" et connectez-vous avec GitHub
3. Cliquez sur "Add New Project"
4. Sélectionnez votre repository `football-manager-lite`
5. Configurez le projet :
   - **Framework Preset** : Vite
   - **Root Directory** : `./` (racine)
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

### Étape 2.4 : Configurer les variables d'environnement dans Vercel

Dans Vercel → Votre projet → **Settings** → **Environment Variables**, ajoutez :

```env
VITE_API_URL=https://votre-backend.railway.app/api
VITE_GOOGLE_CLIENT_ID=votre_google_client_id
```

⚠️ Sélectionnez **"Production"**, **"Preview"**, et **"Development"** pour chaque variable !

### Étape 2.5 : Déployer

1. Cliquez sur "Deploy"
2. Attendez que le déploiement se termine
3. Vercel vous donne une URL : `https://votre-app.vercel.app`

---

## 🔐 Partie 3 : Configurer Google OAuth pour la production

### Étape 3.1 : Ajouter les URLs autorisées dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Sélectionnez votre projet
3. **APIs & Services** → **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID**
5. Dans **"Authorized JavaScript origins"**, ajoutez :
   ```
   https://votre-app.vercel.app
   http://localhost:5173 (pour le développement local)
   ```
6. Dans **"Authorized redirect URIs"**, ajoutez :
   ```
   https://votre-app.vercel.app
   http://localhost:5173 (pour le développement local)
   ```
7. Cliquez sur **"Save"**

---

## ✅ Partie 4 : Vérifications finales

### Checklist

- [ ] Backend déployé sur Railway et accessible
- [ ] Frontend déployé sur Vercel et accessible
- [ ] Variables d'environnement configurées dans Railway
- [ ] Variables d'environnement configurées dans Vercel
- [ ] URLs Google OAuth mises à jour dans Google Cloud Console
- [ ] Test de connexion Google fonctionne
- [ ] Test de création d'utilisateur fonctionne

### Tests à effectuer

1. **Test du backend** :
   ```bash
   curl https://votre-backend.railway.app/api/health
   ```

2. **Test du frontend** :
   - Ouvrez `https://votre-app.vercel.app`
   - Essayez de vous connecter avec Google
   - Vérifiez qu'un utilisateur est créé dans Supabase

---

## 🔄 Partie 5 : Mises à jour et redéploiements

### Mettre à jour le backend

1. Faites vos modifications dans le code
2. Commitez et pushez sur GitHub
3. Railway redéploie automatiquement ! 🎉

### Mettre à jour le frontend

1. Faites vos modifications dans le code
2. Commitez et pushez sur GitHub
3. Vercel redéploie automatiquement ! 🎉

---

## 💰 Coûts (version gratuite)

### Railway
- **Gratuit** : $5 de crédits par mois
- Backend Node.js : ~$1-2/mois
- **Vous avez ~2-3 mois gratuits** avec les crédits offerts

### Vercel
- **100% gratuit** pour les projets personnels
- Bandwidth illimité
- SSL automatique

### Supabase
- **100% gratuit** : 500 MB de stockage
- Toujours gratuit

---

## 🐛 Dépannage

### Le backend ne démarre pas

- Vérifiez les logs dans Railway
- Vérifiez que toutes les variables d'environnement sont configurées
- Vérifiez que `PORT` est bien défini (Railway le définit automatiquement)

### Le frontend ne peut pas contacter le backend

- Vérifiez que `VITE_API_URL` pointe vers la bonne URL Railway
- Vérifiez les logs Vercel pour les erreurs CORS
- Vérifiez que le backend accepte les requêtes depuis Vercel (CORS)

### Erreur CORS

Dans `server/src/index.ts`, vérifiez que CORS autorise votre domaine Vercel :

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173', // Développement local
    'https://votre-app.vercel.app', // Production
    'https://votre-app.vercel.app/*' // Tous les sous-domaines Vercel
  ],
  credentials: true
}));
```

### Connexion Google ne fonctionne pas

- Vérifiez que les URLs sont bien configurées dans Google Cloud Console
- Vérifiez que `VITE_GOOGLE_CLIENT_ID` est correct dans Vercel
- Vérifiez les logs du navigateur (F12) pour les erreurs

---

## 📚 Ressources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

## 🎉 Félicitations !

Votre application est maintenant en ligne ! Partagez l'URL avec vos amis : `https://votre-app.vercel.app`

