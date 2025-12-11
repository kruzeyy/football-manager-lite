# 👀 Comment voir vos utilisateurs dans Supabase

## ✅ Confirmation : Vos données existent !

D'après nos tests, vous avez **1 utilisateur** dans votre table `users` :
- **Email** : maxolol19@gmail.com
- **Nom** : Kruzeyy
- **Créé le** : 11/12/2025 21:16:36

## 📍 Où voir vos utilisateurs dans Supabase Dashboard

### ❌ NE REGARDEZ PAS ICI (c'est pour le système Auth natif) :
- Menu gauche → **"Authentication"** → **"Users"**
- C'est pour les utilisateurs créés via le système d'authentification Supabase Auth

### ✅ REGARDEZ ICI (votre table personnalisée) :

1. **Ouvrez** : https://supabase.com/dashboard/project/votre-projet-id

2. **Dans le menu de gauche**, cherchez **"Table Editor"** 
   - C'est une icône qui ressemble à un tableau 📊
   - C'est dans la section principale, pas dans "Authentication"

3. **Cliquez sur la table `users`**
   - Vous devriez voir une liste de toutes vos tables
   - Cliquez sur `users`

4. **Vous devriez voir** :
   - L'utilisateur `maxolol19@gmail.com` (Kruzeyy)
   - Ses colonnes : id, email, name, password_hash, provider, subscription, created_at

## 🔍 Si vous ne voyez toujours rien

### Problème 1 : La table `users` n'apparaît pas dans Table Editor

**Solution :** Vérifiez que la table existe bien
```sql
-- Dans Supabase SQL Editor, exécutez :
SELECT * FROM users;
```

Si ça fonctionne en SQL mais pas dans Table Editor, c'est peut-être un problème de permissions ou de cache. Actualisez la page.

### Problème 2 : La table apparaît mais est vide

**Vérifiez :**
1. Les logs du backend (terminal où tourne `npm run dev` dans `server/`)
2. Si vous voyez des erreurs lors de la connexion Google

### Problème 3 : Vous regardez le mauvais projet

Vérifiez que vous êtes bien dans votre projet :
- URL : `supabase.com/dashboard/project/votre-projet-id`
- Project ID visible en haut : votre projet ID

## 🧪 Vérification rapide via la ligne de commande

Pour voir vos utilisateurs sans passer par l'interface web :

```bash
cd server
node list-tables.js
```

Vous devriez voir :
```
✅ 1 utilisateur(s) trouvé(s):
   1. Kruzeyy (maxolol19@gmail.com)
```

## 📸 Aide visuelle

Le chemin exact dans Supabase :
```
Dashboard
  └─ Table Editor (menu de gauche)
      └─ users (cliquez sur cette table)
          └─ Vos utilisateurs apparaissent ici !
```

## ✅ Résumé

- ✅ Vos données **existent** dans Supabase
- ✅ La connexion **fonctionne** correctement
- ✅ L'utilisateur **est créé** lors de la connexion Google
- ⚠️ Vous devez regarder dans **Table Editor** → **users** (pas Authentication → Users)

Si après avoir suivi ces étapes vous ne voyez toujours rien, dites-moi exactement ce que vous voyez dans Table Editor !

