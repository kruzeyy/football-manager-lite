# Backend API - Football Manager Lite

## Installation

```bash
cd server
npm install
```

## Configuration

1. Créez un fichier `.env` dans le dossier `server/` (un exemple existe déjà)
2. Ajustez les variables si nécessaire :
   - `PORT=3001` (port du serveur)
   - `MONGODB_URI=mongodb://localhost:27017` (URI MongoDB)
   - `DB_NAME=football_manager` (nom de la base de données)

## Démarrage

### Mode développement (avec rechargement automatique)
```bash
npm run dev
```

### Mode production
```bash
npm run build
npm start
```

## Endpoints API

### Authentification

- `POST /api/auth/signup` - Inscription
  - Body: `{ email, password, name? }`
  
- `POST /api/auth/login` - Connexion
  - Body: `{ email, password }`
  
- `GET /api/auth/me` - Obtenir l'utilisateur actuel
  - Headers: `x-user-id: <userId>`

### Abonnements

- `POST /api/subscription/subscribe` - Activer un abonnement
  - Headers: `x-user-id: <userId>`
  - Body: `{ type: 'monthly' | 'yearly' }`
  
- `POST /api/subscription/cancel` - Annuler un abonnement
  - Headers: `x-user-id: <userId>`
  
- `GET /api/subscription/status` - Statut de l'abonnement
  - Headers: `x-user-id: <userId>`

## Frontend

N'oubliez pas de configurer `VITE_API_URL=http://localhost:3001/api` dans votre fichier `.env` du frontend.

## Sécurité

⚠️ **Note importante** : Ce backend utilise actuellement un système d'authentification simple avec `x-user-id` dans les headers. En production, il faudrait :

1. Implémenter JWT tokens
2. Utiliser des cookies httpOnly
3. Ajouter rate limiting
4. Valider et sanitizer toutes les entrées
5. Utiliser HTTPS

