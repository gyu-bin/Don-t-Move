// node --import tsx --import ./tools/gameplay-improvement/v4/candidateLoader.mjs …  (CHASE_CANDIDATE=A|B|C|D)
import { register } from 'node:module';
register('./candidateHooks.mjs', import.meta.url);
