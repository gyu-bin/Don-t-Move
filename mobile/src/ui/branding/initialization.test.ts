import test from 'node:test';
import assert from 'node:assert/strict';
import {withDeadline} from './initialization';

test('initialization resolves and forwards explicit failure',async()=>{
 assert.equal(await withDeadline(Promise.resolve(42),100,'init'),42);
 await assert.rejects(withDeadline(Promise.reject(new Error('decode failed')),100,'init'),/decode failed/);
});
test('never-settling initialization rejects and retry can complete',async()=>{
 await assert.rejects(withDeadline(new Promise(()=>{}),5,'Home'),/Home timed out/);
 assert.equal(await withDeadline(Promise.resolve('retry'),100,'Home'),'retry');
});
test('completion after timeout cannot overwrite fallback',async()=>{
 let finish!:(value:string)=>void;
 const work=new Promise<string>(resolve=>{finish=resolve;});
 const result=withDeadline(work,5,'Stage');
 await assert.rejects(result,/Stage timed out/);
 finish('late');
 await assert.rejects(result,/Stage timed out/);
});
