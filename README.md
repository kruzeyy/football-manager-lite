# Football Manager Lite

Un mini jeu de management de foot (style Football Manager) construit avec React + TypeScript (Vite).

## Fonctionnalités
- Génération d’une ligue de 12 équipes avec effectifs
- Calendrier aller/retour round-robin
- Moteur de match simplifié (buts et points)
- Vues: Tableau de bord, Effectif, Calendrier, Jour de match
- Sauvegarde/chargement automatique via localStorage

## Prérequis
- Node.js 18+

## Installation
```bash
npm install
```

## Démarrage
```bash
npm run dev
```
Puis ouvrir l’URL indiquée (par défaut `http://localhost:5173`).

## Construction production
```bash
npm run build
npm run preview
```

## Structure
- `src/game`: modèles, génération, calendrier, moteur, persistance
- `src/components`: vues UI
- `src/App.tsx`: navigation simple par onglets

## Notes
- Le moteur est volontairement simple et perfectible (xG approximatif et sampling).
- Vous pouvez ajuster la difficulté en modifiant les forces d’équipes et l’avantage domicile.
