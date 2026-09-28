import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prePolishStages, playableStages } from '../../game/levels/stages/tiltTestMaps';
import { polishStage } from '../../game/levels/stages/stealthPolish';
import { deployGuards } from '../../game/levels/stages/guardDeployment';
test('baked startup data exactly preserves all ten existing stages and patrols', () => {
 const authored = prePolishStages.map(polishStage).map(deployGuards);
 assert.deepEqual(playableStages, JSON.parse(JSON.stringify(authored)));
});
