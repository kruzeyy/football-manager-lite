# ⚡ Guide de déploiement rapide

## 🎯 En 5 minutes

### 1. Backend sur Railway (2 min)

1. Allez sur [railway.app](https://railway.app) → Connectez-vous avec GitHub
2. **New Project** → **Deploy from GitHub repo** → Sélectionnez votre repo
3. Railway détecte automatiquement `server/`
4. **Variables** → Ajoutez :
   ```env
   SUPABASE_URL=https://votre-projet.supabase.co
   SUPABASE_ANON_KEY=votre_cle_secret_supabase
   GOOGLE_CLIENT_ID=votre_google_client_id
   GOOGLE_CLIENT_SECRET=votre_google_client_secret
   PORT=3001
   JWT_SECRET=$(openssl rand -base64 32)
   ```
5. **Notez l'URL** : `https://votre-app.up.railway.app`

### 2. Frontend sur Vercel (2 min)

1. Allez sur [vercel.com](https://vercel.com) → Connectez-vous avec GitHub
2. **Add New Project** → Sélectionnez votre repo
3. **Framework Preset** : Vite
4. **Environment Variables** → Ajoutez :
   ```env
   VITE_API_URL=https://votre-app.up.railway.app/api
   VITE_GOOGLE_CLIENT_ID=votre_google_client_id
   ```
5. **Deploy** → Attendez 1-2 minutes
6. **Notez l'URL** : `https://votre-app.vercel.app`

### 3. Configurer Google OAuth (1 min)

1. [Google Cloud Console](https://console.cloud.google.com) → Votre projet
2. **APIs & Services** → **Credentials** → Votre OAuth Client
3. **Authorized JavaScript origins** → Ajoutez :
   - `https://votre-app.vercel.app`
   - `http://localhost:5173`
4. **Authorized redirect URIs** → Ajoutez :
   - `https://votre-app.vercel.app`
   - `http://localhost:5173`
5. **Save**

## ✅ C'est tout !

Votre site est en ligne : `https://votre-app.vercel.app`

## 🐛 Si ça ne marche pas

Voir le guide complet : `GUIDE_DEPLOIEMENT_COMPLET.md`

