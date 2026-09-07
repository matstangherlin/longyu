export const BASELINE_DEBT = {
  "l11-falo-pouco/falar-de-estudo": ["char:na_which", "char:li_inside", "char:zai"],
  "l25/onde-esta": ["chunk:nashirenm"],
  "l26b/pedir-cardapio": ["chunk:taiguile", "chunk:la"],
  "p6-rotina-trabalho/rotina-e-trabalho": ["char:dian_point"],
  "p6-china-cidades-2/no-aeroporto": ["char:zai", "char:na_that", "char:li_inside"],
  "p6-china-ruas/pegar-taxi": ["char:qu_go", "char:na_which", "char:li_inside"],
  "p6-saude/nao-me-sinto-bem": ["char:zai", "char:na_that", "char:li_inside"],
  "p6-clima/como-esta-o-tempo": ["char:tai_too"],
  "p6-survival-mandarin/checkin-hotel": ["char:de", "char:zai", "char:na_that", "char:li_inside"],
};
const clean = value => String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
const CAPABILITIES = {
  self_name: /我叫.+/,
  origin: /我是.+人/,
  study_or_work: /我(?:是学生|学习中文|在学中文|工作)/,
  identify_person: /这是我(?:的)?(?:妈妈|爸爸|朋友)/,
  relationship: /我(?:的)?(?:妈妈|爸爸|朋友)/,
  third_person_reference: /[他她](?:是|很)/,
  simple_description: /[他她](?:很好|是学生)/,
  reciprocal_question: /你呢/,
};

export function validateIdentityPeople(data) {
  const {lessons, scenes, plans, chunks, characters, debt, gloss, isCanonicalZhOrPinyin} = data;
  const failures = [], evidence = [];
  const fail = (code, message) => failures.push({code, message});
  const surfaces = new Map([...chunks.map(c=>['chunk:'+c.id,c.hanzi]), ...characters.map(c=>['char:'+c.id,c.hanzi])]);
  const declared = new Set(), taught = new Set();
  const seenLessonBodies = new Map();
  const sceneIds = new Set();
  const copyFields = new Set(['title','body','prompt','promptPt','pt','explanation','dialoguePrompt','placeholder']);
  function checkCopy(value, key = '') {
    if (typeof value === 'string') {
      if (value && copyFields.has(key) && !isCanonicalZhOrPinyin(value) && !gloss[value]) fail('EN', value);
    } else if(Array.isArray(value)) value.forEach(v=>checkCopy(v,key));
    else if(value && typeof value === 'object') Object.entries(value).forEach(([k,v])=>checkCopy(v,k));
  }
  function taughtBy(step) {
    if(step.kind === 'listen') return step.text;
    if(step.kind === 'flashcard') return surfaces.get('chunk:'+step.chunkId);
    if(step.kind === 'decompose') return surfaces.get('char:'+step.charId);
    return undefined;
  }
  function addTeaching(step) {
    const text=clean(taughtBy(step));
    if(text) for(const [ref, surface] of surfaces) if(text.includes(clean(surface))) taught.add(ref);
  }
  function independent(step, lesson, location) {
    const answer = step.kind === 'write' ? step.answer : step.correctAnswer;
    const options = [...(step.options??[]),...(step.bank??[]),...(step.wordBank??[])];
    if(options.length || /[\u3400-\u9fff]/u.test((step.prompt??'')+(step.placeholder??''))) fail('INDEPENDENT',location);
    evidence.push({lesson, location, answer:clean(answer)});
  }
  for(const lesson of lessons) {
    // A whole copied lesson creates neither a new learning objective nor transfer.
    const body=JSON.stringify({skill:lesson.skill,steps:lesson.steps,libraryItems:lesson.libraryItems});
    if(seenLessonBodies.has(body) && !lesson.reviewMasteryMode && !lesson.id.endsWith('-rev')) fail('DUPLICATE_LESSON',`${lesson.id} duplicates ${seenLessonBodies.get(body)}`);
    seenLessonBodies.set(body,lesson.id);
    (lesson.libraryItems??[]).forEach(ref=>declared.add(ref));
    if(!plans[lesson.id]) { lesson.steps.forEach(addTeaching); continue; }
    for(const [passIndex,steps] of plans[lesson.id].entries()) {
      for(const [index,step] of steps.entries()) {
        const at=`${lesson.id}/M${passIndex+1}/${index+1}`;
        checkCopy(step);
        addTeaching(step);
        if(!['listen','intro','flashcard','decompose'].includes(step.kind)) {
          const tested = String(step.hanzi??step.answer??step.correctAnswer??(step.target??[]).join(''));
          for(const [ref,glyph] of [['char:ta','他'],['char:ta_she','她']]) {
            if(tested.includes(glyph) && !taught.has(ref)) fail('TEACH_BEFORE_TEST',`${at}: ${ref}`);
          }
        }
        if(step.kind === 'write' && step.mode !== 'free_reflection') independent(step,lesson.id,at);
        if(step.kind !== 'conversation_scene') continue;
        const scene=scenes.find(s=>s.sceneId===step.sceneId);
        if(!scene) {fail('SCENE',at);continue;}
        sceneIds.add(scene.sceneId);
        for(const ref of scene.learnedRefs??[]) {
          if(!declared.has(ref) || !taught.has(ref)) fail('LEARNED_REF',`${at}: ${ref}`);
        }
        const covered=new Set((scene.learnedRefs??[]).concat(scene.newRefs??[]).flatMap(ref=>[...(surfaces.get(ref)??'')]));
        for(const node of scene.nodes??[]) {
          const text=[node.hanzi,node.interaction?.correctAnswer,...(node.interaction?.accepts??[])].join('');
          for(const glyph of text.match(/[\u3400-\u9fff]/gu)??[]) if(!covered.has(glyph)) fail('UNTAUGHT_SCENE_CONTENT',`${at}: ${glyph}`);
          if(node.interaction?.type === 'produce_reply') independent(node.interaction,lesson.id,`${at}/${node.id}`);
        }
      }
    }
  }
  for(const id of ['sala-de-aula','identificar-pessoa']) if(!sceneIds.has(id)) fail('RUNTIME_SCENE',id);
  const capabilities=Object.fromEntries(Object.entries(CAPABILITIES).map(([id,pattern])=>{
    const hits=evidence.filter(e=>pattern.test(e.answer));
    if(!hits.length) fail('CAPABILITY',id);
    return [id,hits];
  }));
  const people=evidence.filter(e=>e.location.includes('pessoa-'));
  if(!people.some(e=>/[他她]/.test(e.answer))) fail('THIRD_PERSON_SCENE','scene must change referent, not only self/you');
  if(!people.some(e=>e.answer.includes('妈妈')) || !people.some(e=>e.answer.includes('朋友'))) fail('RELATIONSHIP_TRANSFER','same frame must work across relationships');
  // An independent transfer must exist outside the scene too, with both referents.
  if(!evidence.some(e=>e.lesson==='l18' && /她(?:是|很)/.test(e.answer)) || !evidence.some(e=>e.lesson==='l18' && /他(?:是|很)/.test(e.answer))) fail('INDEPENDENT_TRANSFER','missing friend transfer across person and predicate');
  for(const [key,refs] of Object.entries(debt)) for(const ref of refs) if(!BASELINE_DEBT[key]?.includes(ref)) fail('NEW_DEBT',`${key}: ${ref}`);
  const debtBefore=Object.values(BASELINE_DEBT).flat().length, debtAfter=Object.values(debt).flat().length;
  if(debtAfter>=debtBefore) fail('DEBT_REDUCTION','identity arc must pay down existing debt');
  const l10=lessons.find(l=>l.id==='l10'), l12=lessons.find(l=>l.id==='l12');
  if(!l10?.steps.some(s=>s.kind==='write' && s.requiredTerms?.includes('我是巴西人')) || !l10.libraryItems.includes('chunk:woyeshi') || !l12?.steps.some(s=>s.sceneId==='conhecer-alguem')) fail('BASELINE','V4.9.4C regression');
  return {failures,capabilities,evidence,debtBefore,debtAfter};
}
