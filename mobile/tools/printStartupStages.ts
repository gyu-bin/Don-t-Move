// Print the deterministic snapshot; review/apply the resulting JSON to
// src/game/levels/stages/startupStages.json after intentional authoring changes.
// node --import tsx tools/printStartupStages.ts
import { prePolishStages } from '../src/game/levels/stages/tiltTestMaps';
import { polishStage } from '../src/game/levels/stages/stealthPolish';
import { deployGuards } from '../src/game/levels/stages/guardDeployment';
process.stdout.write(JSON.stringify(prePolishStages.map(polishStage).map(deployGuards)) + '\n');
