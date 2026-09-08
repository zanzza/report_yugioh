/**
 * Compteur de révision : le remplaçant minimal de react-query ou des
 * live queries de Drizzle. Chaque mutation d'un repo appelle
 * {@link bumpRevision}, et tout `useQuery` monté se relance.
 *
 * JavaScript pur, sans dépendance à React : c'est ce qui permet aux repos de
 * signaler leurs écritures sans connaître la couche UI.
 */
let revision = 0;
const listeners = new Set<() => void>();

export function getRevision(): number {
  return revision;
}

export function bumpRevision(): void {
  revision++;
  for (const listener of listeners) listener();
}

export function subscribeRevision(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
