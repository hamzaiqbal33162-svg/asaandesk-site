export function convertSubtitle(text,format){
 let t=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
 if(!/\d{2}:\d{2}[.,]\d{3}\s+-->/.test(t)) throw Error('Sahi SRT ya VTT timestamps nahi mile.');
 if(format==='vtt'){t=t.replace(/^WEBVTT[^\n]*\n*/,'');return 'WEBVTT\n\n'+t.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2')+'\n';}
 t=t.replace(/^WEBVTT[^\n]*\n*/,'');
 const cues=t.split(/\n\s*\n/).filter(b=>b.includes('-->')).map((b,i)=>{
 const lines=b.split('\n'),idx=lines.findIndex(l=>l.includes('-->'));
 const time=lines[idx].split(/\s+-->\s+/).map(s=>{const m=s.match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})/);if(!m)throw Error('Timestamp samajh nahi aaya.');return `${m[1]||'00'}:${m[2]}:${m[3]},${m[4]}`;}).join(' --> ');
 return `${i+1}\n${time}\n${lines.slice(idx+1).join('\n')}`;
 });return cues.join('\n\n')+'\n';
}
export function encodeWav(buffer){
 const channels=buffer.numberOfChannels,len=buffer.length,rate=buffer.sampleRate;
 const out=new ArrayBuffer(44+len*channels*2),v=new DataView(out);
 const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
 str(0,'RIFF');v.setUint32(4,36+len*channels*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,rate,true);v.setUint32(28,rate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,len*channels*2,true);
 const data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));let o=44;
 for(let i=0;i<len;i++)for(let c=0;c<channels;c++){let s=Math.max(-1,Math.min(1,data[c][i]));v.setInt16(o,Math.round(s<0?s*32768:s*32767),true);o+=2;}return out;
}
export function imageSize(width,height,max){const scale=Math.min(1,max/width,max/height);return [Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale))];}
export const prettyJson=text=>JSON.stringify(JSON.parse(text),null,2)+'\n';
