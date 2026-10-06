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

// Corner assist. A free-standing structure 100 x 60 px; the body radius is 9.
const BOX = [200, 200, 300, 260];
function cross(x:number, y:number, ix:number, iy:number, frames = 240) {
 const p = {...player(), x, y}, speeds:number[] = [];
 for (let f = 0; f < frames; f++) { stepTiltPlayer(p, {x:ix,y:iy,paused:false,reset:0}, 1/60, BOX); speeds.push(p.speed); }
 // Frames below 60% of walking pace once the body is up to speed.
 const from = speeds.findIndex(s => s > 120);
 return {p, speeds, slow: speeds.slice(from).filter(s => s < 90).length};
}
test('clipping a structure corner by a hair no longer crawls down its long side', () => {
 // Heading east and slightly down, the body catches the top-left corner by under a pixel.
 const {p, slow} = cross(150, 185, 1, 0.15);
 assert.equal(slow, 0);
 assert(p.x > 600, `still held at x=${p.x}`);
});
test('clipping a corner by most of the body radius is carried round without losing pace', () => {
 // Heading west and slightly up, the body meets the bottom-right corner 8 px deep.
 const {p, slow, speeds} = cross(340, 266, -1, -0.15);
 assert.equal(slow, 0);
 assert(Math.min(...speeds.slice(30)) > 100, `dipped to ${Math.min(...speeds.slice(30))}`);
 assert(p.x < 0, `still held at x=${p.x}`);
});
test('rounding a corner is not reported as wall contact', () => {
 const p = {...player(), x:340, y:266};
 let rounded = 0;
 for (let f = 0; f < 120; f++) {
  const before = p.y;
  stepTiltPlayer(p, {x:-1,y:-0.15,paused:false,reset:0}, 1/60, BOX);
  // While the body is being pushed down and round the corner it must not be flagged as pressing on the east face.
  if (p.x > 308 && p.y > before + 0.5) { rounded++; assert.equal((p as unknown as {contactX:number}).contactX, 0); }
 }
 assert(rounded > 0, 'the corner was rounded');
});
test('an exact diagonal hit on a corner does not stall', () => {
 const {p, speeds} = cross(180, 180, 1, 1);
 assert(p.x > 400 || p.y > 400);
 assert(speeds.slice(30).every(s => s > 100));
});
test('pushing square into the middle of a face still stops', () => {
 const {p, speeds} = cross(150, 230, 1, 0);
 assert(Math.abs(p.x-190.99) < 0.02 && p.y === 230);
 assert(speeds.slice(60).every(s => s < 1));
});
test('rounding a corner is no faster than leaving a wall already was', () => {
 // Slide at walking pace plus the 40 px/s wall probe: the speed a body has always had on the frame it clears a wall end.
 const limit = Math.hypot(150, 40) + 0.5;
 for (const [x,y,ix,iy] of [[150,185,1,0.15],[340,266,-1,-0.15],[186,300,0.15,-1],[150,185,1,0.5],[170,240,1,-1]] as const)
  assert(cross(x, y, ix, iy).speeds.every(s => s <= limit), `${ix},${iy}`);
});
test('corner assist never carries the body into a neighbouring blocker', () => {
 // A second structure closes the gap above the corner: the body must stay out of both.
 const pair = [...BOX, 150, 150, 260, 191.5];
 const p = {...player(), x:150, y:196};
 for (let f = 0; f < 240; f++) {
  stepTiltPlayer(p, {x:1,y:0.1,paused:false,reset:0}, 1/60, pair);
  for (let i = 0; i < pair.length; i += 4)
   assert(!(p.x > pair[i]-9 && p.x < pair[i+2]+9 && p.y > pair[i+1]-9 && p.y < pair[i+3]+9), `inside blocker ${i/4} at ${p.x},${p.y}`);
 }
});

// Hugging a surface: the input leans into the wall by `degrees` (0 = along it, 90 = square on).
function hug(degrees:number) {
 const a = degrees*Math.PI/180;
 return run(WALL, -Math.sin(a), -Math.cos(a), 1).speeds.at(-1)!;
}
test('hugging a structure keeps walking pace until the input is nearly square to it', () => {
 for (const degrees of [10, 30, 45, 60, 70]) assert(hug(degrees) > 148, `${degrees} deg: ${hug(degrees)}`);
 assert(hug(80) > 95, `80 deg: ${hug(80)}`);
 assert(hug(89) < 15, `89 deg: ${hug(89)}`);
});
test('from a standstill against the surface the slide is at pace within a fifth of a second', () => {
 const {speeds} = run(WALL, -0.7, -0.7, 1);
 assert(speeds[12] > 140, `after 0.2 s: ${speeds[12]}`);
});
