import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

// Frozen independently before Phase B edits, from the campaign matching Phase A
// file-byte SHA 8cb031c5f82c1f5802157966c12d8c7ef4ed3f83a5342d6d9d7ecbaa20ac6ab0.
// Hashes use recursively sorted object keys and native JSON.stringify numbers.
// They cover entire definitions, including geometry, routes and authored security.
// This convention is deliberately separate from Phase A's Python definition SHA.
const baselineHashes: Record<string, string> = {
  "01-01": "6fb6ba210e3bfdabdb73a3ad7d8dbfb088543b5aded2b4ced6c4730e3982f846",
  "01-02": "a42100d9b1defb99516670ef83efe67833f06c21e5000c2aaba144aef7e3ec4a",
  "01-03": "bcd306629a621362d06f14076c2b6718c1e0eca7cb1ce2ff9004817bccd18174",
  "01-04": "6ac6de78eb78154b4056a3b5960723f17d088019a21a5a0f0620e4fbce0f6422",
  "01-05": "2c226c4b54c31ffe39af88ebcbe467ef34efc1e6ef6c464dd45b19c82efe4832",
  "01-06": "d3062f653be1bf0aa067e6fb4679a7de2d5bcf77db6e44f5c74a41ccc09ef56b",
  "01-07": "ce63f57ce9f155be4d3dc68f60349d91d18cc82767cdc91373a8da140a01ebb4",
  "01-08": "4100db924bc84b9079d4dede31145ce471e4295fd3bee40656e4f2feba57d970",
  "01-09": "c73366ed62c5ad7eb28065e23313ebceb233d8c40c3649ac950d0970cb36198c",
  "01-10": "45eccf218d9c70526c8587e81269b69ead55e5891ef2ebc0f0d97feaa34666ec",
  "02-01": "15ad62a32202b1a86c23d1611076b3f221ecd90df7f807432671d5b5fa64b741",
  "02-02": "f0ee129fdaca7a15e19e6e952ef96167237b20a062e74b56157417c01d4749f6",
  "02-03": "f54d5244718c94fc12539ac3b0aa208caf23a483891aaf5056410a8ff807f186",
  "02-04": "49746fc511c572ce9108c832c6dd25c7d7b1861d834f9a92c223fbc711ada6e2",
  "02-05": "b57d00ef121bdf2e237209e3e2023680491bd6ece95e4b5f93bde132a7e9ca98",
  "02-06": "cdb03e748804ea631fac79148702a6061e7a00290e7a1d84c5499a9511b7e0dc",
  "02-07": "b3625d35cbe938b735287b1b4c0bbb858aa0b1f2f80e1b522018abcba88c8699",
  "02-08": "996c7658bc3f0b715c69a043bde268c474fe1bd2e85747c1502e62524c5519eb",
  "02-09": "47f8062d5e484fcef1a7a904d2f9674786ef23a8ba126c21c179dd2906610a39",
  "02-10": "341a4c061f76d4c731b6372aa80848c5ec5b48cbfaf41e49bf47a2c651a9c4cc",
  "03-01": "285c1f6368813c0531f06c1311b33b33dcb0043f3c3aa70e8361ecedf7762b6a",
  "03-02": "0e30f93f8749fe17f244e436a100e2e95034bb6f89aa0c7b4bd9de7f2f77d065",
  "03-03": "f5902d69c906b4333037e6fa9bd54f2c0ab9cfe87d4bb26b329d56548b6b268c",
  "03-04": "f587d41f408648dbfee620f85ee21215487a9e19bf261b25e6d6a8ee17cc8d92",
  "03-05": "8232928309766dbfc9f1bd5522d896d17aa2313b360ba088f97260c1190c0096",
  "03-06": "6ad83e52bf6185f261023ba51d3888b59c24c1c892f45a279d812f82f8cbb720",
  "03-07": "d36cb1315b6c910564ef6dd14d7ac66f928c2378e7df6101e6f3882e79c805d6",
  "03-08": "2d7b4625ffe18cd3e01c12681e8972d29f626a6706ce4291de92295f440055ea",
  "03-09": "bd8e07fc885536b5721c4a7eaf30ce359cb97805eb8d2ce6dc4658bccd861965",
  "03-10": "3552813c3bf51bda71b9aaa72044c83fc5d0af39c3fb1fa093f0a11c9b5eed1b",
  "04-01": "866554a5d3fa2cbc6f4b92f2b34a670778bd99f8bf0cfb70ad041830455268c0",
  "04-02": "5d49786ea4599c9352b2d4748cd0c5a481734b24a707b14c8b34415850d02530",
  "04-03": "b977f301a110e1fa06aa7a5bf9e0cc5847b80e9633659b2b29f80f65cfa78e48",
  "04-04": "0b430d713d57ac2e1f37637469b98a6ebe0e2b0cb6a724dd3b3ea910212edf42",
  "04-05": "2c87b9494425955aeb0c541977df53fbbe1e9207da12d02399ee3e713710970b",
  "05-01": "4cbf978416f336e87d83d437ddf41af1e89af2b082637a8ae3c702fcb5616d44",
  "05-02": "6c256cfe436a4969833354002f2760b1f2ac1de4e69450b661f9b4fe98807d8f",
  "05-03": "e020290aa6fd96f61c4e8e1d10df270d3fb30f68053bddd21d565936085f673b",
  "05-04": "ea265ccc510ae77b606cda0329674fa6ab734826fd25a87051f496b4659e38f9",
  "05-05": "de8943ed03dbd5e25b122767bb928b01d1d20f6f3a8c10f3fbcd94dab4f3d3b8",
  "06-01": "264ee77e4ea2b45298a9a4e4071452892e45aae369f0ac9034df6c938e510ce6",
  "06-02": "e2d87212a4a6a9307cf970480756f71b13a5792cce8e9140d41961f09ebfe396",
  "06-03": "94f1641e5f1f04c5da4cd3e45ee7e2a108530d6d957b81bd7a80161d738c7a2b",
  "06-04": "6b8f1d3c2a5c7c757aa6990a6c6d43020523691f238c6dcfdf7eee96a74d1ab4",
  "06-05": "4881fc069660515effd95f23a3e9494a4c396516fcbb7989f6ffc135196aed50",
  "07-01": "da37d3be56efc5745a072690941a1291294638d47bd9ad3bbdbe837ba4c51a86",
  "07-02": "3480ec84032507611cb477b36fce5f38397d6cdec1927648751e70330c06f517",
  "07-03": "77621fcf2e17a9783d45401feeac9a95b6195ef564e5224f257b0e5d6c3d21ac",
  "07-04": "511ead34d618460563ea469fd1030537c1ea17eab7420bb009903dc46162266d",
  "07-05": "1cc4384174eb031ec54fc529825c18622ab3b6e9dd5850ff94bfd7ed5b192d9e",
  "08-01": "9feeb124ac97e692b6e7e6717ff5b5fb6da1222a880c9b0d1fc1a0143d3eddde",
  "08-02": "66a498894723ea1e3eb0c140a6d47da681d3ff5d372af72f3ff1be2a628ed9e8",
  "08-03": "66afc3aeb45ce59a796076219a0526c4167b9d2b91cfcca3decdf5fb764c8cbb",
  "08-04": "c162d06259df94fba668b3e47585bbf981cfb5286fe6b56341d9d95804fb37fa",
  "08-05": "7d9929247fa52430f25fce9fcb6c2d43e35b97b17d0750fbae80eb6f3954c141",
  "09-01": "d7dfc59eca671c3c62bc1dd379bcb6d806d4067914ca605f24b8cbfe417214b4",
  "09-02": "e070af4f872d8d55a7feabe0a3e86428d1c29195899f34925d44cb47c3e25098",
  "09-03": "982969f85076e11eb36debbd7c9319109bdd20793646a1e435f1310c282bba7b",
  "09-04": "ebbb3cd61ec34a5bb81270e3dfc84f9c03e8c608b174b57d2f7957c6351a8960",
  "09-05": "b641f62a6b6feca8ca3a440ff493388df127951e58a12160668fe94a9b267d7c"
};
const keepIds = ['01-02', '01-06', '01-07', '01-09', '02-01', '02-04', '02-05', '03-02', '03-03', '03-04', '03-06', '03-09', '03-10'];
const tuneIds = ['01-01', '01-03', '01-05', '02-02', '02-03', '02-06', '02-07', '02-08', '02-09', '03-05', '03-07', '03-08'];
const partialIds = ['01-04', '01-08', '01-10', '02-10', '03-01'];
const authorizedIds = new Set([...tuneIds, ...partialIds]);
const stages = JSON.parse(readFileSync('docs/design/v12/phase3/SOURCE_STAGES.json', 'utf8')) as {id: string; chapter: number; [key: string]: unknown}[];

function canonical(value: unknown): unknown {
 if (Array.isArray(value)) return value.map(canonical);
 if (value !== null && typeof value === 'object') {
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map(key => [key, canonical(record[key])]));
 }
 return value;
}
function definitionHash(value: unknown) {
 return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

test('V11 Phase B retains exactly the current 60 mission IDs and chapter sizes', () => {
 assert.equal(stages.length, 60);
 assert.equal(new Set(stages.map(stage => stage.id)).size, 60);
 assert.deepEqual(stages.map(stage => stage.id).sort(), Object.keys(baselineHashes).sort());
 assert.deepEqual(Array.from({length: 9}, (_, index) => stages.filter(stage => stage.chapter === index + 1).length), [10, 10, 10, 5, 5, 5, 5, 5, 5]);
});

test('V11 scope matches the approved Phase A 13 KEEP, 12 TUNE and 5 PARTIAL classifications', () => {
 const text = readFileSync('docs/design/v11/CHAPTER_01_03_BLUEPRINT_AND_AUDIT.md', 'utf8');
 const rows = [...text.matchAll(/^\| (\d{2}-\d{2}) \| [^|]+ \| (KEEP|TUNE|PARTIAL REBUILD) \|/gm)];
 assert.equal(rows.length, 30);
 for (const [classification, expected] of [['KEEP', keepIds], ['TUNE', tuneIds], ['PARTIAL REBUILD', partialIds]] as const) {
  assert.deepEqual(rows.filter(row => row[2] === classification).map(row => row[1]).sort(), [...expected].sort());
 }
 assert.equal(authorizedIds.size, 17);
});

test('V11 bake leaves all 13 KEEP definitions and all 30 Chapter 4–9 definitions unchanged', () => {
 const protectedStages = stages.filter(stage => keepIds.includes(stage.id) || stage.chapter >= 4);
 assert.equal(protectedStages.length, 43);
 for (const stage of protectedStages) {
  assert.equal(definitionHash(stage), baselineHashes[stage.id], stage.id + ': unauthorized mission change');
 }
});

test('Every V11 map change is confined to one of the 17 approved IDs', () => {
 const changed = stages.filter(stage => definitionHash(stage) !== baselineHashes[stage.id]).map(stage => stage.id);
 for (const id of changed) assert(authorizedIds.has(id), id + ': change outside Phase B scope');
 // This is a scope gate, not a completion gate: a no-op mission may remain
 // unchanged with a documented reason. It does not certify maps or playtests.
});
