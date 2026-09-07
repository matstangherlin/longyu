import { loadIdentityRuntime, require } from './lib/v495a-runtime.mjs';
import { validateIdentityPeople } from './lib/identity-people-validation.mjs';
const data=loadIdentityRuntime();
const result=validateIdentityPeople(data);
const {evaluateLearnerResponse}=require('../../src/lib/learnerResponse.ts');
for(const [draft,answer,expected] of [
 ['ta shi xuesheng','她是学生。',true], ['ta1 hen3 hao3','他很好。',true],
 ['zhe shi wo pengyou ta hen hao','这是我朋友。他很好。',true],
 ['我是学生','他是学生。',false], ['他是学生','她是学生。',false],
]) if(evaluateLearnerResponse({draft,acceptedAnswers:[answer]}).accepted!==expected) result.failures.push({code:'RESPONSE',message:draft});
console.log(JSON.stringify(result,null,2));
if(result.failures.length) process.exitCode=1;
else console.log('PASS IDENTITY_PEOPLE_ARC: 8 capabilities in independent runtime production.');
