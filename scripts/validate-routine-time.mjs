import { loadRoutineTimeRuntime, require } from './lib/v495a-runtime.mjs';
import { validateRoutineTime } from './lib/routine-time-validation.mjs';
const data=loadRoutineTimeRuntime();
const result=validateRoutineTime(data);
const {evaluateLearnerResponse}=require('../../src/lib/learnerResponse.ts');
for(const [draft,answer,expected] of [
 ['ba dian ban','八点半',true], ['xianzai','现在',true],
 ['wo jintian xuexi','我今天学习',true], ['wo mingtian qu','我明天去',true],
 ['wo hen hao','我明天去',false], ['八点','八点半',false],
]) if(evaluateLearnerResponse({draft,acceptedAnswers:[answer]}).accepted!==expected) result.failures.push({code:'RESPONSE',message:draft});
console.log(JSON.stringify(result,null,2));
if(result.failures.length) process.exitCode=1;
else console.log('PASS ROUTINE_TIME_ARC: 10 capabilities in independent runtime production.');
