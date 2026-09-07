import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadIdentityRuntime} from './lib/v495a-runtime.mjs';
import {validateIdentityPeople} from './lib/identity-people-validation.mjs';
import {CURRICULUM_SOURCES,journeyFingerprint} from './lib/report-meta.mjs';
const base=loadIdentityRuntime();
assert.deepEqual(validateIdentityPeople(base).failures,[], 'positive control must pass before mutation tests');
function fixture(){return {...structuredClone({...base,isCanonicalZhOrPinyin:undefined}),isCanonicalZhOrPinyin:base.isCanonicalZhOrPinyin};}
function mutation(label,edit,code){
 const data=fixture();edit(data);
 const failures=validateIdentityPeople(data).failures;
 assert(failures.some(f=>f.code===code),`${label} survived (expected ${code}); ${JSON.stringify(failures)}`);
 console.log(`KILLED ${label}: ${code}`);
}
mutation('1 learnedRef declared without teaching',d=>{
 d.scenes.find(s=>s.sceneId==='sala-de-aula').learnedRefs.push('chunk:nizuoshenmegongzuo');
 d.lessons.find(l=>l.id==='l13-dialogo-nome').libraryItems.push('chunk:nizuoshenmegongzuo');
},'LEARNED_REF');
mutation('2 required pronoun teaching removed',d=>{
 d.plans.l18=d.plans.l18.map(p=>p.filter(s=>!(s.kind==='listen' && s.text==='她')));
},'TEACH_BEFORE_TEST');
mutation('3 independent production becomes multiple choice',d=>{
 for(const plan of d.plans.l18) for(const step of plan) if(step.kind==='write') {step.kind='dialogue_choice';step.correctAnswer=step.answer;step.options=[step.answer,'我很好'];}
},'INDEPENDENT_TRANSFER');
mutation('4 untaught family relationship',d=>{
 const scene=d.scenes.find(s=>s.sceneId==='identificar-pessoa');
 const node=scene.nodes.find(n=>n.interaction?.correctAnswer==='这是我妈妈。');
 node.interaction.correctAnswer='这是我奶奶。';node.interaction.accepts=['这是我奶奶。'];
},'UNTAUGHT_SCENE_CONTENT');
mutation('5 third person disappears from conversation',d=>{
 const scene=d.scenes.find(s=>s.sceneId==='identificar-pessoa');
 scene.nodes=JSON.parse(JSON.stringify(scene.nodes).replaceAll('他','我').replaceAll('她','你'));
},'THIRD_PERSON_SCENE');
mutation('6 entire old lesson cloned under new id',d=>{
 const lesson=structuredClone(d.lessons.find(l=>l.id==='l18'));lesson.id='l18-clone';d.lessons.push(lesson);
},'DUPLICATE_LESSON');
mutation('7 only English overlay broken',d=>{delete d.gloss['Falar de outra pessoa'];},'EN');
mutation('8 new learnedRefs debt entry',d=>{d.debt['l18/new-scene']=['char:ta'];},'NEW_DEBT');
// Real source fingerprint, in an isolated fixture. Never alters the working checkout.
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'longyu-v495a-contract-'));
try {
 for(const source of CURRICULUM_SOURCES){const target=path.join(temp,source);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}
 const original=journeyFingerprint(process.cwd());
 assert.equal(journeyFingerprint(temp),original,'positive fingerprint control');
 const target=path.join(temp,'src/data/journey.ts');
 fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace('title: "Amigo"','title: "Pessoa próxima"'));
 assert.notEqual(journeyFingerprint(temp),original,'9 changed Journey must invalidate frozen contract');
 console.log('KILLED 9 Journey changed without regenerated contract: fingerprint mismatch');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS 9/9 mutations, with positive controls.');
