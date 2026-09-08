// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Sur web, expo-sqlite passe par wa-sqlite compilé en WebAssembly, et « wasm »
// n'est pas une extension d'asset connue de Metro par défaut.
config.resolver.assetExts.push('wasm');

// Son worker dialogue avec le thread principal via SharedArrayBuffer et
// Atomics.wait (voir expo-sqlite/web/WorkerChannel.ts), ce qui n'est autorisé
// que sur une page « cross-origin isolated ».
//
// `enhanceMiddleware` est marqué déprécié par Metro, mais c'est le seul point
// d'extension pour poser des en-têtes sur le serveur de dev. À noter : pour un
// export web statique, ces en-têtes doivent venir de l'hébergeur.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // `credentialless` évite d'exiger un en-tête CORP sur chaque ressource
  // tierce ; `require-corp` est l'alternative plus stricte.
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  return middleware(req, res, next);
};

module.exports = config;
