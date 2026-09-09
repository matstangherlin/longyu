import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadRoutineTimeRuntime} from './lib/v495a-runtime.mjs';
import {validateRoutineTime} from './lib/routine-time-validation.mjs';
import {CURRICULUM_SOURCES,journeyFingerprint} from './lib/report-meta.mjs';
const base=loadRoutineTimeRuntime();
assert.deepEqual(validateRoutineTime(base).failures,[], 'positive control must pass before mutation tests');
function fixture(){
  return {
    ...structuredClone({...base, isCanonicalZhOrPinyin: undefined, hasEnglishOverlay: undefined}),
    isCanonicalZhOrPinyin: base.isCanonicalZhOrPinyin,
    hasEnglishOverlay: base.hasEnglishOverlay,
  };
}
function mutation(label,edit,code){
 const data=fixture();edit(data);
 const failures=validateRoutineTime(data).failures;
 assert(failures.some(f=>f.code===code),`${label} survived (expected ${code}); ${JSON.stringify(failures)}`);
 console.log(`KILLED ${label}: ${code}`);
}
mutation('1 几 teaching removed before a 几 question',d=>{
 d.plans['p6-horarios']=d.plans['p6-horarios'].map(pass=>pass.filter(s=>!(s.kind==='listen' && String(s.text??'').includes('几'))));
},'TEACH_BEFORE_TEST');
mutation('2 昨天 tested before it is taught',d=>{
 d.plans['p6-horarios']=d.plans['p6-horarios'].map(pass=>pass.filter(s=>!(s.kind==='listen' && s.text==='昨天') && !(s.kind==='flashcard' && s.chunkId==='zuotian')));
},'TEACH_BEFORE_TEST');
mutation('3 independent clock production removed',d=>{
 d.plans['p6-horarios']=d.plans['p6-horarios'].map(pass=>pass.filter(s=>clean(s.answer??s.correctAnswer)!=='八点半'));
 const scene=d.scenes.find(s=>s.sceneId==='que-horas-sao');
 for(const node of scene.nodes) if(node.interaction?.correctAnswer==='八点半') {
  node.interaction.correctAnswer='好';
  node.interaction.accepts=['好'];
 }
},'CAPABILITY');
mutation('4 plan production becomes multiple choice',d=>{
 for(const plan of d.plans['p6-horarios']) for(const step of plan) if(step.kind==='write' && String(step.answer??'').includes('明天')) {
  step.kind='dialogue_choice';step.correctAnswer=step.answer;step.options=[step.answer,'我很好'];
 }
},'CAPABILITY');
mutation('5 listening task loses audioText',d=>{
 for(const plan of d.plans['p6-horarios']) for(const step of plan) if(step.kind==='listen_select' && step.audioText==='明天') delete step.audioText;
},'NO_AUDIO');
mutation('6 listening target leaks into the title',d=>{
 for(const plan of d.plans['p6-horarios']) for(const step of plan) if(step.kind==='listen_select' && step.audioText==='明天') step.title=step.audioText;
},'TARGET_LEAK');
mutation('7 encontro-amanha removed without a substitute',d=>{
 const lesson=d.lessons.find(l=>l.id==='l13');
 lesson.steps=lesson.steps.filter(s=>s.sceneId!=='encontro-amanha');
},'RUNTIME_SCENE');
mutation('8 M3 contains only recognition',d=>{
 d.plans['p6-horarios'][2]=d.plans['p6-horarios'][2].map(s=>({kind:'listen_select',title:'Ouça',audioText:'八点',options:['八点','九点'],correctAnswer:'八点'}));
},'M3_PRODUCTION');
mutation('9 same correct answer dominates the lesson',d=>{
 const lesson=d.lessons.find(l=>l.id==='p6-horarios');
 const extra={kind:'write',title:'De novo',body:'De novo.',answer:'八点半',correctAnswer:'八点半'};
 lesson.steps.push(extra,extra,extra);
},'REPEAT');
mutation('10 new learnedRef debt entry',d=>{d.debt['p6-horarios/que-horas-sao']=['char:nian'];},'NEW_DEBT');
function clean(value){return String(value??'').replace(/[\s，。！？,.!?]/g,'');}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'longyu-v496a-contract-'));
try {
 for(const source of CURRICULUM_SOURCES){const target=path.join(temp,source);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}
 const original=journeyFingerprint(process.cwd());
 assert.equal(journeyFingerprint(temp),original,'positive fingerprint control');
 const target=path.join(temp,'src/data/journey.ts');
 fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace('title: "Que horas são?"','title: "Hora e rotina"'));
 assert.notEqual(journeyFingerprint(temp),original,'11 changed Journey must invalidate frozen contract');
 console.log('KILLED 11 Journey changed without regenerated contract: fingerprint mismatch');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS 10/10 mutations + fingerprint, with positive controls.');
