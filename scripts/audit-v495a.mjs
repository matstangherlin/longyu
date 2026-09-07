import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const base = process.argv.includes('--baseline') ? '../../v495a-baseline' : '..';
const { ALL_LESSONS } = require(base+'/src/data/journey.ts');
const { CHUNKS } = require(base+'/src/data/chunks.ts');
const { CHARACTERS } = require(base+'/src/data/characters.ts');
const { CONVERSATION_SCENES } = require(base+'/src/data/conversationScenes.ts');
const concepts = ['学生','学习','工作','家','妈妈','爸爸','朋友','他','她','很好','忙','有','没有','这是','的','哪里','在','点'];
const rows = concepts.map(concept => {
 const refs = [...CHUNKS.map(x=>({...x,ref:'chunk:'+x.id})),...CHARACTERS.map(x=>({...x,ref:'char:'+x.id}))].filter(x=>x.hanzi.includes(concept));
 const teaching = [], usage = [];
 let exposures = 0;
 ALL_LESSONS.forEach((l,i)=> {
  const hits = l.steps.filter(s=>JSON.stringify(s).includes(concept) || refs.some(r=>s.chunkId===r.id || s.charId===r.id));
  exposures += hits.length;
  const taught = hits.filter(s=>['listen','flashcard','intro','decompose'].includes(s.kind));
  if(taught.length) teaching.push(`${i+1}:${l.id}(${taught.length})`);
  if(hits.length && !taught.length) usage.push(`${i+1}:${l.id}(${hits.length})`);
 });
 return {concept,refs:refs.map(x=>x.ref),teaching,usage,exposures,scenes:CONVERSATION_SCENES.filter(s=>JSON.stringify(s.nodes).includes(concept)).map(s=>s.sceneId)};
});
console.log(JSON.stringify(rows,null,2));
console.log('LESSONS',ALL_LESSONS.map((l,i)=>`${i+1}:${l.id}`).join(' '));
if (process.argv.includes('--plans')) {
 const {lessonRoundStepsFor} = require(base+'/src/features/lesson/lessonTasks.ts');
 for(const id of ['l11-falo-pouco','l13-dialogo-nome','l18','l24']) {
  const lesson=ALL_LESSONS.find(l=>l.id===id);
  for(const pass of [1,2,3,4]) {
   const steps=lessonRoundStepsFor(lesson,{masteryPass:pass});
   console.log('PLAN',id,pass,JSON.stringify(steps.map(s=>({kind:s.kind,sceneId:s.sceneId,title:s.title,answer:s.answer,text:s.text,charId:s.charId,wordBank:s.wordBank}))));
  }
 }
}
