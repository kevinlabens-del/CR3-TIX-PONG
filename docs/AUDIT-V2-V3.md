# Audit de la base V2 et évolution V3

## Périmètre audité

L’archive officielle fournie a été extraite puis analysée avant toute modification. Le projet était une application Next.js/React utilisant un terrain Canvas. Le build de référence a été exécuté avec succès avant migration.

## Fonctions V2 préservées

| Domaine | Base constatée | Traitement V3 |
| --- | --- | --- |
| Moteur | boucle Canvas et simulation temps réel | conservée, découpée en modules et stabilisée par pas fixe |
| Contrôles | Pointer Events, clavier, Duel tactile | conservés, multi-touch et anti-scroll renforcés |
| Modes | Solo, Duel, campagne | conservés et étendus |
| Campagne | 12 stages, 3 chapitres | même progression, objectifs refondus |
| Boss | KRYON, VORTEX, SOLARIS | mêmes identités, véritables phases et mécaniques |
| Pouvoirs | Surcharge, Bouclier, Titan | conservés parmi 13 power-ups |
| Progression | étoiles, fragments, skins | migrée vers profil V3 et Arsenal étendu |
| Données locales | profil, statistiques, historique | migration non destructive et schéma versionné |
| Effets | particules, traînées, vibrations, shake | conservés, budgétés selon la qualité |
| Plateforme | responsive, plein écran, manifest, SW, offline, Pages | conservée et adaptée à la V3 |

## Risques constatés dans la V2

- logique principale concentrée dans un composant très volumineux ;
- détection de collision discrète vulnérable aux grandes vitesses ;
- modificateurs et boss surtout présentés comme des variations statistiques ;
- étoiles principalement liées au résultat du match ;
- cache PWA susceptible de conserver une ancienne révision ;
- architecture mono-balle difficile à étendre sans effets secondaires.

## Réponses V3

- séparation des données, règles, état, rendu et orchestration ;
- collision balayée et sous-pas fixes pour éviter le tunneling ;
- état `Ball[]`, garde de score et durée bornée de chaque effet ;
- RNG seedé pour les événements de match et le défi quotidien ;
- missions évaluées séparément, une étoile par objectif ;
- migration V2 → V3 qui ne supprime aucune clé historique ;
- cache `cr3atix-pong-v3.0.0` et suppression ciblée des anciens caches CR3@TIX PONG ;
- tests unitaires et contractuels couvrant les invariants critiques.

## Compatibilité future

Le jeu demeure 100 % local. Les états de match, profils et enregistrements sont typés et séparés de l’affichage, ce qui permettrait à une V4 d’ajouter un transport WebRTC ou Supabase sans rendre un backend obligatoire pour la V3.
