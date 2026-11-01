// Experiment-only module redirect: inside a chase-lab process, imports of the production guard coordinator
// (src/game/guards/guardSystem) resolve to the candidate copy in this folder. Production files are not touched.
const VARIANT = new URL('./guardSystemVariant.ts', import.meta.url).href;
const TRAVEL = new URL('./guardTravelVariant.ts', import.meta.url).href;
export async function resolve(specifier, context, next) {
  if (/(^|\/)guardSystem(\.ts)?$/.test(specifier) && !context.parentURL?.endsWith('guardSystemVariant.ts') && !specifier.includes('Variant'))
    return { url: VARIANT, shortCircuit: true, format: 'module' };
  if (/(^|\/)guardTravel(\.ts)?$/.test(specifier) && !context.parentURL?.endsWith('guardTravelVariant.ts') && !specifier.includes('Variant'))
    return { url: TRAVEL, shortCircuit: true, format: 'module' };
  return next(specifier, context);
}
