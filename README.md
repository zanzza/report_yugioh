# report_yugioh

Application mobile personnelle pour suivre mes tournois Yu-Gi-Oh! : la logistique
(event / logement / transport payés, nom du transport), le déroulé ronde par ronde
(lancer de dé, score, deck adverse, commentaire), un **résumé textuel généré** par
event, et des **statistiques** — dont mon taux de victoire selon que je gagne ou
perds le lancer de dé.

- **Stack** : Expo (React Native) + TypeScript, Expo SDK 57.
- **Stockage** : 100 % local, SQLite sur le téléphone, hors-ligne, aucun compte,
  aucun serveur. Sauvegarde par export/import d'un fichier JSON.

## Démarrer

```powershell
npm install
npm start          # scanner le QR code avec Expo Go (même Wi-Fi, profil « Privé »)
npx expo start --tunnel   # si le Wi-Fi isole les clients (box opérateur, réseau d'entreprise)
```

## Vérifier

```powershell
npm test           # 125 tests : logique pure + intégration SQL réelle
npm run typecheck  # tsc --noEmit
```

Les tests de `tests/db.test.ts` exécutent **le vrai code des repos** (SQL, contraintes
`CHECK`, `UNIQUE`, `ON DELETE CASCADE`, renumérotation des rondes) contre le SQLite
intégré à Node, via l'adaptateur `tests/sqlite-adapter.ts`. C'est possible parce que
`src/db/**` n'importe d'expo-sqlite que des **types** — donc le schéma est validé
sans téléphone.

## Produire l'APK

Expo Go a besoin du serveur Metro (donc du PC) pour charger le bundle : **il faut
avoir buildé l'APK avant un vrai tournoi**, sinon l'app est inutilisable sur place.

```powershell
npm install -g eas-cli
eas login
eas init
eas build -p android --profile preview   # produit un .apk installable directement
```

## Architecture

Règle non négociable : **`src/logic/**` n'importe jamais `react`, `react-native`,
`expo-*` ni `src/db`.** C'est du TypeScript pur qui tourne dans Node, ce qui rend
tous les calculs et le générateur de résumé testables sans appareil.

```
src/
├─ app/          routes expo-router — UI fine uniquement
├─ logic/        ████ TS PUR : match, stats, summary, format, decks, validation, backup
├─ db/           seule couche qui connaît SQLite : migrations, mappers, repos
├─ hooks/        use-query (réactivité) + use-data (accès au domaine)
└─ ui/           thème, composants, formulaires partagés
tests/           logique pure + intégration SQL (node:sqlite)
```

La réactivité passe par `src/db/revision.ts` : chaque mutation d'un repo appelle
`bumpRevision()`, et tout `useQuery` monté se relance. Aucune invalidation manuelle
à penser côté écran.

## Conventions de calcul

Ces règles sont figées et couvertes par les tests — notamment le **test d'ancrage**
de `tests/stats.test.ts` et `tests/summary.test.ts`, qui vérifient au caractère près
les chiffres et le texte d'un YCS à 8 rondes.

| Règle | Détail |
|---|---|
| Taux de victoire | `victoires / matchs joués` — **une nulle (1-1) compte comme une défaite**. Le bilan reste affiché `5-2-1` pour rester lisible. |
| Score | Stocké en **deux entiers** (`my_wins`, `opp_wins`), jamais en texte. |
| Résultat de match | Toujours **dérivé** du score, jamais stocké. |
| Ronde `0-0` | « En cours » : un brouillon, **exclu de toutes les stats**. |
| Bye | Implicite : aucun lancer de dé + victoire + pas d'adversaire. Compté au bilan et aux manches, **exclu des stats de dé et des matchups**. |
| Effectif nul | Un taux vaut `null`, jamais `NaN` ni `0` ; l'UI affiche `—`. |
| Deux stats de dé | « Je gagne le dé : 57 % » ≠ « Quand je gagne le dé, je gagne le match : 75 % ». |
| Noms de decks | Texte libre + chips de suggestion, fusionnés à la lecture (casse, espaces doubles, accents). |
| Formatage FR | Écrit à la main, **sans `Intl`** : le support d'ICU varie sous Hermes, et les snapshots doivent être identiques entre Node et le téléphone. |

## Sauvegarde

Les données vivent dans le sandbox de l'app : **désinstaller l'app les efface**, et
la sauvegarde Android automatique n'est pas garantie. Exporter depuis
`Réglages → Exporter les données` après chaque tournoi et garder le fichier
`report_yugioh_AAAA-MM-JJ.json` sur un Drive.

À l'import, les identifiants du fichier ne sont jamais réutilisés : les events sont
réinsérés en auto-increment et leurs rondes rattachées via une table de
correspondance — réimporter un même fichier en mode « Ajouter » est donc sans risque.
