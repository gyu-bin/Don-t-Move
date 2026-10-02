import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {stepTiltPlayer} from '../../input/tiltMovement';
import type {PlayerState} from '../../playground/playgroundState';

// One wall occupying x < 40; the body (radius 9) rests against it at x = 49.01.
const WALL = [0, -1000, 40, 1000];
const CORNER = [...WALL, -1000, -1000, 1000, 0];
function player(): PlayerState {
 return {x:49.01,y:500,vx:0,vy:0,speed:0,gait:0,visualGait:0,facing:0,phase:0,dist:0,spritePhase:0,hasTarget:false,inputReset:0} as unknown as PlayerState;
}
function run(blockers:number[], ix:number, iy:number, seconds:number) {
 const p = player(), speeds:number[] = [];
 for (let f = 0; f < seconds*60; f++) { stepTiltPlayer(p, {x:ix,y:iy,paused:false,reset:0}, 1/60, blockers); speeds.push(p.speed); }
 return {p, speeds};
}
test('diagonal push into a wall slides along it at intended speed', () => {
 const {p, speeds} = run(WALL, -0.7, -0.7, 1);
 assert(Math.abs(p.x-49.01) < 0.5, 'stays on the wall');
 assert(p.y < 500-100, `slid ${500-p.y}px in 1s`);
 assert(speeds.at(-1)! > 140 && speeds.at(-1)! <= 150.5);
});
test('shallow push still glides instead of crawling', () => {
 const {speeds} = run(WALL, -0.95, -0.3, 1);
 assert(speeds.at(-1)! > 100, `speed ${speeds.at(-1)}`);
});
test('pushing straight into a wall stops without drift or NaN', () => {
 const {p, speeds} = run(WALL, -1, 0, 1);
 assert.equal(p.y, 500); assert(speeds.every(Number.isFinite)); assert(speeds.at(-1)! < 1);
});
test('inside corner settles without vibration', () => {
 const {p, speeds} = run(CORNER, -0.7, -0.7, 5);
 assert(p.y < 10 && p.y > 8.9); assert(speeds.slice(-60).every(v => v < 1), 'no jitter in the corner');
});
test('leaving the wall does not jump above intended speed', () => {
 const p = player();
 for (let f = 0; f < 60; f++) stepTiltPlayer(p, {x:-0.7,y:-0.7,paused:false,reset:0}, 1/60, WALL);
 for (let f = 0; f < 60; f++) { stepTiltPlayer(p, {x:0.7,y:-0.7,paused:false,reset:0}, 1/60, WALL); assert(p.speed <= 150.5); }
 assert(p.x > 60);
});
