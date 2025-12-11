# 🔑 Guide des clés API Supabase

## 📊 Situation actuelle

Vous avez **deux systèmes de clés** dans Supabase :

1. **Nouveau système** (onglet "Publishable and secret API keys") :
   - Publishable key : `sb_publishable_f7oyEi4RHBmogTWJQFGtpQ_nKPoh7FZ`
   - Secret key : `sb_secret_xxxxxxxxxxxxx`

2. **Ancien système** (onglet "Legacy anon, service_role API keys") :
   - anon key : `eyJhbGci...` (commence par `eyJ`)
   - service_role key : `eyJhbGci...` (commence par `eyJ`)

## 🔧 Configuration pour votre backend

### Option 1 : Utiliser les nouvelles clés Secret (recommandé)

Votre backend utilise actuellement la clé **secret** du nouveau système, ce qui est correct !

Dans `server/.env`, vous avez :
```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_cle_secret_supabase
```

⚠️ **Attention** : Le nom de la variable est trompeur (`SUPABASE_ANON_KEY`) mais elle contient bien une clé secret. C'est correct pour un backend !

### Option 2 : Utiliser les clés legacy (si le nouveau système ne fonctionne pas)

Si vous préférez utiliser les clés legacy :

1. Dans Supabase, allez dans **Settings → API Keys**
2. Cliquez sur l'onglet **"Legacy anon, service_role API keys"**
3. Copiez la clé **`service_role`** (pour le backend)
4. Dans `server/.env`, remplacez :
   ```env
   SUPABASE_ANON_KEY=eyJhbGci... (la clé service_role legacy)
   ```

## ✅ Test actuel

Actuellement, votre configuration fonctionne car :
- ✅ La connexion Supabase fonctionne
- ✅ 1 utilisateur existe dans la table `users`
- ✅ Le backend peut lire/écrire dans Supabase

## 🔍 Pourquoi vous ne voyez pas les utilisateurs dans Supabase

**C'est normal !** Vous regardez au mauvais endroit :

- ❌ **Ne regardez PAS** : Authentication → Users (c'est pour le système Auth natif)
- ✅ **Regardez ICI** : Table Editor → `users` (votre table personnalisée)

## 📝 Checklist de vérification

- [ ] Le backend utilise bien Supabase (✅ confirmé)
- [ ] La clé API est configurée (✅ confirmé - clé secret)
- [ ] La table `users` existe (✅ confirmé - 1 utilisateur trouvé)
- [ ] Les utilisateurs sont créés lors de la connexion Google (⚠️ à tester)

## 🧪 Pour tester la création d'un utilisateur

1. Ouvrez votre application frontend : http://localhost:5173
2. Cliquez sur "Continuer avec Google"
3. Connectez-vous avec un compte Google
4. Vérifiez dans Supabase Table Editor → `users` que l'utilisateur apparaît

## 🐛 Si ça ne fonctionne toujours pas

Vérifiez les logs du backend pour voir s'il y a des erreurs lors de la création d'utilisateur.

Dans le terminal où tourne `npm run dev` (dossier server), vous devriez voir les logs.

