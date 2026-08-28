# CR3@TIX PONG V3.0.2

**De l’imagination à la conception**

CR3@TIX PONG est un jeu d’arcade de combat élémentaire Glace contre Feu, pensé d’abord pour smartphone. Cette V3 part de la dernière version V2 fonctionnelle : le rendu Canvas, les commandes tactiles et clavier, la campagne, la progression locale, l’identité visuelle et la PWA ont été conservés puis renforcés.

## Jouer

- GitHub Pages : <https://kevinlabens-del.github.io/CR3-TIX-PONG/>
- Installation : utiliser **Installer** dans le menu ou l’action d’installation du navigateur.
- Hors connexion : ouvrir une première fois le jeu en ligne afin d’enregistrer la version V3 dans le cache.

## Contenu V3

- 12 arènes réparties entre le Royaume Boréal, la Faille Thermique et l’Empire du Brasier ;
- modificateurs Standard, Velocity, Pressure, Fortress, Chaos et Boss ;
- boss KRYON (2 phases), VORTEX (2 phases) et SOLARIS (3 phases) ;
- modes Arène Solo, Duel local, Campagne, Survival, Chaos, Boss Rush, Hardcore et tutoriel ;
- Duel configurable : score cible, Best of 1/3/5, pouvoirs, Ultimates, arène, Chaos et handicap ;
- Perfect Hit, Smash, Spin/Curve Shot et combo ×2 à ×5 ;
- 13 power-ups avec raretés Commun, Rare, Épique et Légendaire ;
- Ultimates Zéro Absolu et Éruption Solaire ;
- 36 objectifs de campagne, 40 succès et un défi quotidien déterministe ;
- profil local, niveaux 1 à 100, XP, fragments, statistiques et historique détaillé ;
- Arsenal V3 : raquettes, balles, traînées, impacts, explosions, effets Ultimate et thèmes ;
- sauvegarde `profileVersion: 3`, migration automatique V2 → V3, export/import JSON ;
- qualité Auto, Performance, Élevée et Ultra, réduction des effets, flashs, vibrations et screen shake configurables ;
- tactile multi-touch, clavier, plein écran, safe areas, portrait/paysage, PWA et mode hors connexion.

Aucun compte, achat, paiement, publicité, microtransaction, crypto, NFT ou backend n’est nécessaire.

## Commandes

| Action | Mobile | Clavier |
| --- | --- | --- |
| Raquette Glace | Glisser sur la moitié gauche | `W` / `S` ou `↑` / `↓` en Solo |
| Raquette Feu (Duel) | Glisser sur la moitié droite | `↑` / `↓` |
| Ultimate Glace | Bouton Zéro Absolu | `Espace` |
| Ultimate Feu (Duel) | Bouton Éruption Solaire | `Entrée` |
| Pause | Bouton pause | `Échap` |

## Développement

Prérequis : Node.js 22.13 ou supérieur.

```bash
npm ci
npm run dev
```

Commandes de validation :

```bash
npm run lint
npm run test:core
npm run build
npm run build:github
```

`npm test` exécute les tests du moteur, le build applicatif et l’export statique GitHub Pages. La sortie statique est créée dans `out/` avec le chemin de base `/CR3-TIX-PONG`.

## Architecture

- `app/PongV3.tsx` : orchestration UI, modes, boucle fixe, audio, sauvegarde et progression ;
- `app/game-core.ts` : physique stable, collisions balayées, IA prédictive, RNG et règles testables ;
- `app/game-state.ts` : état déterministe d’un combat, balles multiples, boss et configuration Duel ;
- `app/arena-renderer.ts` : rendu Canvas, environnements, particules et effets ;
- `app/v3-data.ts` : campagne, missions, succès, power-ups, arsenal et profil V3 ;
- `app/legacy-v2.tsx` et `app/v2-data.ts` : référence conservée de la base V2 ;
- `tests/` : tests du moteur, des migrations et du contrat fonctionnel ;
- `public/manifest.webmanifest` et `public/sw.js` : installation et cache hors connexion V3 ;
- `out/` : export statique validé, prêt pour la branche `gh-pages`.

## Sauvegardes

La V3 lit en priorité `cr3atix-pong-v3-profile`. En son absence, elle migre automatiquement les clés V2 `elemental-pong-v2-profile` et `elemental-pong-stats`, sans les supprimer. Une réinitialisation exige une confirmation. Le menu Dossier permet également d’exporter ou importer une sauvegarde JSON.

## Publication GitHub Pages

La configuration officielle existante publie la branche `gh-pages`. Exécuter `npm run build:github`, puis déployer le contenu de `out/` sur cette branche. L’archive de release contient déjà cet export validé. Le projet reste compatible avec l’URL `/CR3-TIX-PONG/`.

Voir également [CHANGELOG.md](CHANGELOG.md), [docs/AUDIT-V2-V3.md](docs/AUDIT-V2-V3.md) et [docs/TESTS-V3.md](docs/TESTS-V3.md).

CR3@TIX — De l’imagination à la conception.
