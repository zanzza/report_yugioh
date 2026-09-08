# report_yugioh — notes pour agents

Suivi personnel de tournois Yu-Gi-Oh!. Expo (React Native) + TypeScript, SDK 57,
SQLite local, hors-ligne, aucun serveur. UI en français.

## Expo A CHANGÉ

Lire la doc versionnée exacte sur https://docs.expo.dev/versions/v57.0.0/ avant
d'écrire du code. En particulier : `expo-file-system` utilise l'API `File`/`Paths`
(et non plus `readAsStringAsync`), et `File.pickFileAsync` remplace
`expo-document-picker`.

## Règles du projet

1. **`src/logic/**` n'importe jamais `react`, `react-native`, `expo-*` ni `src/db`.**
   C'est du TypeScript pur qui tourne dans Node. Toute nouvelle règle de calcul ou
   de formatage va là, avec son test.
2. **Rien qui sorte du SDK Expo.** Tout doit tourner dans Expo Go sans dev build,
   sinon on perd le test par QR code. En particulier : pas de
   `@shopify/react-native-skia`, donc pas de `victory-native` XL. Les graphiques
   sont des barres en `View`.
3. **Le SQL vit uniquement dans `src/db/*.repo.ts`**, et la conversion
   `0|1 ↔ boolean` uniquement dans `src/db/mappers.ts`.
4. **Une migration livrée est immuable.** Toute évolution du schéma = nouvelle
   entrée `{ to: 2, up: ... }` dans `src/db/migrations.ts`.
5. **Pas d'`Intl` ni de `toLocaleString`/`localeCompare(x, 'fr')`.** Le support
   d'ICU varie selon les builds Hermes et casserait les snapshots entre Node et le
   téléphone. Utiliser `src/logic/format.ts` et `compareLabels` de
   `src/logic/decks.ts`.
6. **Une mutation de repo appelle `bumpRevision()`** (`src/db/revision.ts`), ce qui
   relance tout `useQuery` monté. Ne pas ajouter d'invalidation manuelle côté écran.

## Conventions de calcul (figées par les tests)

- Taux de victoire = `victoires / matchs joués` : **une nulle compte comme une
  défaite**, mais le bilan affiché reste `5-2-1`.
- Une ronde `0-0` est « en cours » et exclue de toutes les stats.
- Un bye est implicite (pas de lancer de dé + victoire + pas d'adversaire) : compté
  au bilan, exclu des stats de dé et des matchups.
- Effectif nul → `Rate.value === null`, jamais `NaN` ni `0`. L'UI affiche `—`.
- Les rondes ne portent que 4 champs saisis : dé, score, deck adverse, commentaire.
  Le deck que je joue est au niveau de l'**event**.

## Vérifier

```powershell
npm test           # logique pure + intégration SQL via node:sqlite
npm run typecheck
npx expo export --platform android --output-dir .tmp-export   # vérifie que le bundle passe
```

`tests/db.test.ts` exécute le vrai code des repos contre `node:sqlite` grâce à
`tests/sqlite-adapter.ts`. Toute modification du schéma ou d'un repo doit y être
couverte : c'est le seul filet avant le téléphone. Deux bugs y ont déjà été
attrapés — `GLOB` n'accepte pas `_` comme joker, et une renumérotation par valeurs
négatives violait `CHECK (round_number > 0)`.

Les tests d'ancrage de `tests/stats.test.ts` et `tests/summary.test.ts` fixent au
caractère près les chiffres et le texte du résumé d'un YCS à 8 rondes. S'ils
cassent, c'est une décision produit à valider, pas un test à réparer à l'aveugle.
