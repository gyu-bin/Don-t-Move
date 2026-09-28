import fs from 'node:fs';
// Original quiet placeholder cues, not final music. Reproducible and replaceable.
const rate=22050;
for(const [name,duration,freq] of [['footstep',.12,90],['turn',.25,170],['freeze',.055,1400],['logo',.4,660],['ambience',4,110]]){
 const count=Math.round(rate*duration),wav=Buffer.alloc(44+count*2);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
 wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
 wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++){
  const t=i/rate,envelope=name==='ambience'?.3:Math.min(1,t/.006)*Math.exp(-t*8)*Math.min(1,(duration-t)/.02);
  const value=(Math.sin(t*freq*Math.PI*2)+.25*Math.sin(t*freq*2*Math.PI*2))*.28*envelope;
  wav.writeInt16LE(Math.round(value*32767),44+i*2);
 }
 fs.writeFileSync(new URL('../../assets/audio/intro-'+name+'.wav',import.meta.url),wav);
}
