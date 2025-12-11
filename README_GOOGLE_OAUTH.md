# Configuration Google OAuth

## Étapes pour configurer Google OAuth

### 1. Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API "Google+ API" (ou "People API")

### 2. Créer les identifiants OAuth

1. Allez dans "APIs & Services" → "Credentials"
2. Cliquez sur "Create Credentials" → "OAuth client ID"
3. Si c'est la première fois, configurez l'écran de consentement OAuth :
   - Type d'application : External
   - Nom de l'application : Football Manager Lite
   - Email de support
   - Domaines autorisés : `localhost` (pour le développement)
4. Créez l'OAuth client ID :
   - Type : Web application
   - Name : Football Manager Lite Web Client
   - Authorized JavaScript origins :
     - `http://localhost:5173` (frontend Vite)
     - `http://localhost:3000` (si vous changez le port)
   - Authorized redirect URIs :
     - `http://localhost:5173` (frontend)

### 3. Récupérer les identifiants

Vous obtiendrez :
- **Client ID** : `xxxxx.apps.googleusercontent.com`
- **Client Secret** : `xxxxx`

### 4. Configurer les variables d'environnement

#### Frontend (`.env.local` à la racine du projet)
```env
VITE_GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
VITE_API_URL=http://localhost:3001/api
```

#### Backend (`server/.env`)
```env
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
PORT=3001
MONGODB_URI=mongodb://localhost:27017
DB_NAME=football_manager
```

### 5. Redémarrer les serveurs

Après avoir configuré les variables d'environnement :

**Backend :**
```bash
cd server
npm run dev
```

**Frontend :**
```bash
npm run dev
```

## Test

1. Ouvrez l'application dans votre navigateur
2. Cliquez sur "Continuer avec Google"
3. Sélectionnez votre compte Google
4. Autorisez l'application
5. Vous devriez être connecté automatiquement !

## Notes de sécurité

- ⚠️ Ne commitez jamais les secrets dans Git
- Le Client Secret doit rester secret (uniquement côté backend)
- Le Client ID peut être public (il est dans le frontend)
- En production, ajoutez vos vrais domaines dans les "Authorized JavaScript origins"

