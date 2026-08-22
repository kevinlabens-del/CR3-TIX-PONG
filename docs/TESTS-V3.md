# Validation CR3@TIX PONG V3.0.0

## Commande de release

```bash
npm run lint
npm test
```

Le test intégral inclut les tests Node, le build applicatif et l’export GitHub Pages sous `/CR3-TIX-PONG/`.

## Couverture automatisée

- intégrité des 12 arènes, 36 objectifs, 40 succès et 13 power-ups ;
- raretés, pondération et RNG déterministe ;
- défi quotidien identique pour une date donnée ;
- collision continue à vitesse maximale ;
- 10 000 trajectoires physiques sans vitesse invalide ni angle bloqué ;
- prédiction IA avec rebonds ;
- combo, objectifs, XP, migration V2 → V3 et import de sauvegarde ;
- budgets graphiques par niveau de qualité ;
- initialisation Multiball et contrat fonctionnel de tous les modes ;
- safe areas, Pointer Events, anti-scroll, PWA, cache V3 et absence de backend obligatoire.

## Parcours navigateur vérifié

- chargement initial et proposition de tutoriel ;
- navigation dans les sept sections du menu ;
- lancement Survival, rendu Canvas, score, HUD, pause et reprise ;
- lancement Chaos, terrain unique, absence de scroll et pause fonctionnelle ;
- campagne affichant 12 stages et 36 missions ;
- lancement de l’arène 1 et affichage du HUD d’arène ;
- absence d’erreur applicative dans la console ;
- absence d’overflow sur la vue paysage testée ;
- liens statiques, manifest, icônes et service worker présents dans l’export GitHub Pages.

## Matrice de non-régression

| Zone | Vérification |
| --- | --- |
| Solo ZEN / ARCADE / LÉGENDE | paramètres IA et lancement couverts par données/contrat |
| Duel local | Pointer Events multi-touch, options et Best of couverts |
| Campagne 1–12 | données, objectifs et progression couverts |
| KRYON / VORTEX / SOLARIS | phases et événements de boss couverts |
| Tous les power-ups | définitions, durées et activation présentes |
| Ultimate Glace / Feu | énergie, effets, durée et HUD couverts |
| Survival / Chaos / Boss Rush / Hardcore | états et règles de mode couverts |
| Arsenal / succès / défi quotidien | données et progression locale couvertes |
| Sauvegarde | profil V3, migration, fermeture/réouverture logique, export/import couverts |
| Installation / offline | manifest, cache versionné, assets et scope vérifiés |
| Portrait / paysage / plein écran | CSS responsive, safe areas et contrôles couverts |
| Pause / reprise / arrière-plan | suspension par état et événement de visibilité couverte |
| Stress physique | vitesse maximale, rally prolongé simulé et Multiball couverts |

Pour une publication en production, un dernier smoke test sur les appareils physiques cibles reste recommandé après déploiement : iPhone/Safari, Android/Chrome et un navigateur Firefox mobile.
