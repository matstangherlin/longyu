export const BASELINE_DEBT = {
  "l26b/pedir-cardapio": ["chunk:taiguile", "chunk:la"],
  "p7-imersao-aeroporto/no-aeroporto": ["char:na_that"],
  "p6-china-ruas/pegar-taxi": ["char:qu_go"],
  "p6-saude/nao-me-sinto-bem": ["char:na_that"],
  "p6-clima/como-esta-o-tempo": ["char:tai_too"],
  "p7-imersao-hotel/checkin-hotel": ["char:de", "char:na_that"],
};
const clean = value => String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
const CAPABILITIES = {
  ask_time: /现在几点/,
  tell_time: /(?:现在)?[一二三四五六七八九十两]+点/,
  half_hour: /点半/,
  today_tomorrow_yesterday: /今天|明天|昨天/,
  now: /^(现在)$/,
  ask_when: /什么时候/,
  simple_date: /[一二三四五六七八九十]+月[一二三四五六七八九十]+号/,
  daily_routine: /起床|睡觉|上班/,
  future_plan: /明天.*去|去.*明天/,
  time_plus_action: /(?:今天|明天|昨天|晚上|早上|[点]).*(?:学习|去|起床|睡觉|上班)|(?:学习|去|起床|睡觉).*(?:今天|明天|昨天|晚上)/,
};
const TEACH_GLYPHS = [
  ["char:ji_how", "几"],
  ["char:zuo_yesterday", "昨"],
  ["char:ban_half", "半"],
];
const AUDIO_KINDS = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);
const TEACHING_KINDS = new Set(["listen", "intro", "flashcard", "decompose"]);
const RECOGNITION_KINDS = new Set(["listen", "listen_select", "intro", "flashcard", "match_pairs", "comprehend", "recognize", "image_choice"]);

export function validateRoutineTime(data) {
  const {lessons, scenes, plans, chunks, characters, debt, gloss, hasEnglishOverlay, isCanonicalZhOrPinyin} = data;
  const failures = [], evidence = [];
  const fail = (code, message) => failures.push({code, message});
  const surfaces = new Map([...chunks.map(c=>['chunk:'+c.id,c.hanzi]), ...characters.map(c=>['char:'+c.id,c.hanzi])]);
  const copyFields = new Set(['title','body','prompt','promptPt','pt','explanation','dialoguePrompt','placeholder','situationPt']);
  function checkCopy(value, key = '') {
    if (typeof value === 'string') {
      if (value && copyFields.has(key) && !isCanonicalZhOrPinyin(value) && !(hasEnglishOverlay?.(value) || gloss[value])) fail('EN', value);
    } else if(Array.isArray(value)) value.forEach(v=>checkCopy(v,key));
    else if(value && typeof value === 'object') Object.entries(value).forEach(([k,v])=>checkCopy(v,k));
  }
  function taughtBy(step) {
    if(step.kind === 'listen') return step.text;
    if(step.kind === 'flashcard') return surfaces.get('chunk:'+step.chunkId);
    if(step.kind === 'decompose') return surfaces.get('char:'+step.charId);
    return undefined;
  }
  function independent(step, lesson, location) {
    const answer = step.kind === 'write' ? step.answer : step.correctAnswer;
    const options = [...(step.options??[]),...(step.bank??[]),...(step.wordBank??[])];
    if(options.length || /[\u3400-\u9fff]/u.test((step.prompt??'')+(step.placeholder??'')+(step.body??'')+(step.situationPt??''))) fail('INDEPENDENT',location);
    evidence.push({lesson, location, answer:clean(answer)});
  }
  const sceneIds = new Set();
  const seenLessonBodies = new Map();
  for(const lesson of lessons) {
    const body=JSON.stringify({skill:lesson.skill,steps:lesson.steps,libraryItems:lesson.libraryItems});
    if(seenLessonBodies.has(body) && !lesson.reviewMasteryMode && !lesson.id.endsWith('-rev')) fail('DUPLICATE_LESSON',`${lesson.id} duplicates ${seenLessonBodies.get(body)}`);
    seenLessonBodies.set(body,lesson.id);
    const declared = new Set(lesson.libraryItems??[]);
    if(!plans[lesson.id]) continue;
    const taught = new Set();
    const addTeaching = step => {
      const text=clean(taughtBy(step));
      if(text) for(const [ref, surface] of surfaces) if(text.includes(clean(surface))) taught.add(ref);
    };
    const answers = new Map();
    for(const step of lesson.steps ?? []) {
      if(['conversation_scene','listen','intro','flashcard','decompose','match_pairs'].includes(step.kind)) continue;
      const answer = clean(step.correctAnswer ?? step.answer ?? '');
      if(!answer) continue;
      answers.set(answer, (answers.get(answer)??0)+1);
    }
    for(const [answer, count] of answers) if(count > 2) fail('REPEAT', `${lesson.id}: ${answer} ×${count}`);
    for(const [passIndex,steps] of plans[lesson.id].entries()) {
      if(passIndex === 2 && steps.every(s => RECOGNITION_KINDS.has(s.kind))) fail('M3_PRODUCTION', lesson.id);
      if(passIndex === 2 && !steps.some(s => ['write','free_production','reverse_recall'].includes(s.kind))) fail('M3_PRODUCTION', lesson.id);
      for(const [index,step] of steps.entries()) {
        const at=`${lesson.id}/M${passIndex+1}/${index+1}`;
        checkCopy(step);
        addTeaching(step);
        if(AUDIO_KINDS.has(step.kind)) {
          if(!step.audioText) fail('NO_AUDIO', at);
          for(const field of [step.title, step.prompt, step.promptPt, step.dialoguePrompt]) {
            if(typeof field === 'string' && step.audioText && field.includes(step.audioText)) fail('TARGET_LEAK', `${at}: ${field}`);
          }
        }
        if(!TEACHING_KINDS.has(step.kind)) {
          const tested = String(step.hanzi??step.answer??step.correctAnswer??(step.target??[]).join(''));
          for(const [ref,glyph] of TEACH_GLYPHS) {
            if(tested.includes(glyph) && !taught.has(ref)) fail('TEACH_BEFORE_TEST',`${at}: ${ref}`);
          }
        }
        if(step.kind === 'write' && step.mode !== 'free_reflection') independent(step,lesson.id,at);
        if(step.kind !== 'conversation_scene') continue;
        const scene=scenes.find(s=>s.sceneId===step.sceneId);
        if(!scene) {fail('SCENE',at);continue;}
        sceneIds.add(scene.sceneId);
        for(const ref of scene.learnedRefs??[]) {
          if(declared.has(ref) && !taught.has(ref)) fail('LEARNED_REF',`${at}: ${ref}`);
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
  const encontroLesson = lessons.find(l => (l.steps??[]).some(s => s.sceneId === 'encontro-amanha'));
  if(!encontroLesson) fail('RUNTIME_SCENE','encontro-amanha');
  for(const id of ['encontro-amanha','que-horas-sao','rotina-e-trabalho']) {
    if(!scenes.some(s => s.sceneId === id)) fail('RUNTIME_SCENE', id);
  }
  const capabilities=Object.fromEntries(Object.entries(CAPABILITIES).map(([id,pattern])=>{
    const hits=evidence.filter(e=>pattern.test(e.answer));
    if(!hits.length) fail('CAPABILITY',id);
    return [id,hits];
  }));
  const days = evidence.filter(e => /今天|明天|昨天/.test(e.answer));
  if(!days.some(e=>e.answer.includes('今天')) || !days.some(e=>e.answer.includes('明天')) || !days.some(e=>e.answer.includes('昨天'))) {
    fail('CAPABILITY','today_tomorrow_yesterday');
  }
  for(const [key,refs] of Object.entries(debt)) for(const ref of refs) if(!BASELINE_DEBT[key]?.includes(ref)) fail('NEW_DEBT',`${key}: ${ref}`);
  return {failures,capabilities,evidence,sceneIds:[...sceneIds]};
}
