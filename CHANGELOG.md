# Changelog

Toutes les évolutions notables de CR3@TIX PONG sont consignées ici.

## [3.0.0] — 2026-08-22

### Base et stabilité

- migration progressive de la dernière V2 fonctionnelle, conservée dans `app/legacy-v2.tsx` ;
- boucle de simulation fixe à 120 Hz et rendu découplé ;
- collision continue balle/raquette, limitation stable des angles et vitesses, protection contre le tunneling et le double score ;
- gestion native de plusieurs balles et score uniquement après la sortie de la dernière balle active ;
- qualité graphique adaptative et budgets de particules.

### Gameplay

- mécaniques Perfect Hit, Smash, Spin/Curve Shot et combo ×2 à ×5 ;
- 13 power-ups pondérés par rareté, avec anti-répétition ;
- modificateurs d’arène Standard, Velocity, Pressure, Fortress, Chaos et Boss ;
- nouveaux modes Survival, Chaos, Boss Rush et Hardcore ;
- Duel local configurable (score, Best of, pouvoirs, Ultimate, arène, Chaos et handicap).

### Campagne et boss

- 12 arènes et 36 objectifs indépendants ;
- KRYON en 2 phases avec gel et murs de glace ;
- VORTEX en 2 phases avec portails et distorsions ;
- SOLARIS en 3 phases avec bouclier, vague solaire et supernova.

### Progression

- profil local V3, niveau 1–100, XP, titres et avatars élémentaires ;
- 40 succès et défi quotidien généré avec la date comme seed ;
- Arsenal étendu à 7 catégories cosmétiques ;
- statistiques et historique enrichis ;
- export/import JSON et migration automatique des sauvegardes V2.

### Présentation et plateforme

- HUD mobile lisible, menus portrait/paysage et prise en charge des safe areas ;
- effets renforcés pour Zéro Absolu et Éruption Solaire ;
- trois environnements visuels, variations de boss, audio synthétique dynamique et vibrations ;
- manifest V3, service worker à cache versionné, installation et hors connexion ;
- export statique et workflow GitHub Pages pour `/CR3-TIX-PONG/`.

## [2.x]

Version de référence : moteur React/Canvas, Solo, Duel, campagne de 12 arènes, trois boss, trois pouvoirs, étoiles, fragments, skins, statistiques, commandes tactiles/clavier et PWA.
