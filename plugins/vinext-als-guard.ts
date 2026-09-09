/** Local compatibility fix for vinext beta.5 scope-exit registry accumulation.
 * Only request stores that are currently entered require an exit wrapper.
 * Dormant stores retained after HMR must not add synchronous stack frames.
 */
export function patchAlsRegistry(code: string, id: string) {
  const file = id.split('?')[0].replaceAll('\\', '/');
  if (!file.endsWith('/vinext/dist/shims/internal/als-registry.js')) return null;
  const original = 'for (const als of _registry) {\n\t\tconst inner = run;';
  const guarded = 'for (const als of _registry) {\n\t\tif (als.getStore() === undefined) continue;\n\t\tconst inner = run;';
  if (code.includes(guarded)) return null;
  if (!code.includes(original)) throw new Error('Vinext ALS scope-exit implementation changed; review the local compatibility guard.');
  return { code: code.replace(original, guarded), map: null };
}
export default function vinextAlsGuard() {
  return { name: 'mortille-vinext-als-scope-guard', enforce: 'pre' as const, transform: patchAlsRegistry };
}
