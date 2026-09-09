import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const directory=path.resolve('../v495a-validation');
fs.mkdirSync(directory,{recursive:true});
const standard = ['validate:identity-people','test:identity-people','validate:routine-time','test:routine-time','validate:corpus','validate:lessons','validate:lesson-options','validate:teach-before-test','validate:teach-before-test:journey','validate:conversation-scenes','validate:conversation-vocabulary','validate:conversation-vocabulary-srs','validate:conversation-loop','validate:conversation-pedagogy','validate:lexical-progression','validate:lesson-novelty','validate:exercise-depth','validate:production-transfer','validate:transfer-integrity','validate:cognitive-budget','validate:early-transfer-ladder','validate:first-communicative-win','validate:acquisition-momentum','validate:i18n','test:i18n','validate:journey-en','test:learner-response','test:player-ux'];
const queue=process.argv.slice(2).length?process.argv.slice(2):standard;
const resultFile=path.join(directory,'results.json');
const results=fs.existsSync(resultFile)?JSON.parse(fs.readFileSync(resultFile,'utf8')):{};
async function run(name){
 const filename=path.join(directory,name.replaceAll(':','-')+'.log');
 const out=fs.createWriteStream(filename);
 const start=Date.now();
 const child=spawn('npm.cmd',['run',name],{shell:true,stdio:['ignore','pipe','pipe']});
 child.stdout.pipe(out);child.stderr.pipe(out);
 const code=await new Promise(resolve=>{child.on('error',()=>resolve(-1));child.on('close',resolve);});
 await new Promise(resolve=>out.end(resolve));
 results[name]={code,seconds:Math.round((Date.now()-start)/1000),log:filename};
 fs.writeFileSync(resultFile,JSON.stringify(results,null,2));
 console.log(`${code===0?'PASS':'FAIL'} ${name} (${results[name].seconds}s)`);
}
let cursor=0;
await Promise.all(Array.from({length:Math.min(3,queue.length)},async()=>{while(cursor<queue.length)await run(queue[cursor++]);}));
if(queue.some(name=>results[name].code!==0))process.exitCode=1;
