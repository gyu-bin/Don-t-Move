import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {completionDeadline} from './initialization';
const wait = (ms:number) => new Promise(resolve => setTimeout(resolve,ms));
test('lost splash animation callback still removes overlay', async () => {
 let completed=0;completionDeadline(()=>{completed++;},10);
 await wait(25);assert.equal(completed,1);
});
test('normal animation callback is not delayed and duplicate completion is ignored', async () => {
 let completed=0;const transition=completionDeadline(()=>{completed++;},10);
 transition.finish();transition.finish();assert.equal(completed,1);
 await wait(25);assert.equal(completed,1);
});
test('unmounted splash invalidates timer and late worklet completion', async () => {
 let completed=0;const transition=completionDeadline(()=>{completed++;},10);
 transition.cancel();transition.finish();await wait(25);assert.equal(completed,0);
});
