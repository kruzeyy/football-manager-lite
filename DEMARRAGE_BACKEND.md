# 🚀 Comment démarrer le backend

## ⚠️ Important

Pour que votre application fonctionne, vous devez **démarrer le backend** en plus du frontend !

## 📋 Démarrage

### 1. Terminal 1 : Backend

```bash
cd server
npm run dev
```

Vous devriez voir :
```
✅ Configuration Supabase détectée
✅ Connexion à Supabase OK
🚀 Server running on http://localhost:3001
```

### 2. Terminal 2 : Frontend

```bash
npm run dev
```

Le frontend démarre généralement sur `http://localhost:5173`

## ✅ Vérification

Une fois les deux démarrés, testez :

```bash
curl http://localhost:3001/api/health
```

Vous devriez voir :
```json
{"status":"OK","message":"Backend is running","db":"Supabase"}
```

## 🐛 Problèmes courants

### "ERR_CONNECTION_REFUSED"

➡️ Le backend n'est pas démarré. Démarrez-le avec `cd server && npm run dev`

### "Port 3001 already in use"

➡️ Le port est déjà utilisé. Soit arrêtez l'autre processus, soit changez le port dans `server/.env` :
```env
PORT=3002
```

Puis mettez à jour `.env.local` du frontend :
```env
VITE_API_URL=http://localhost:3002/api
```

### "Cannot find module"

➡️ Installez les dépendances :
```bash
cd server
npm install
```

## 📝 Note

En production (sur Railway/Vercel), vous n'avez pas besoin de démarrer manuellement - les services démarrent automatiquement !

