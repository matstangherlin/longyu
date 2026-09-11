const CAPSTONE_ID = "p7-china-survival";

function clean(value) {
  return String(value ?? "").replace(/[\s，。！？,.!?]/g, "");
}

function sceneBlob(scene) {
  return (scene.nodes ?? [])
    .map((node) => `${node.hanzi ?? ""}${node.interaction?.correctAnswer ?? ""}${(node.interaction?.validAnswers ?? []).join("")}${(node.interaction?.accepts ?? []).join("")}`)
    .join("\n");
}

export function validateCapstoneTransfer(data) {
  const { lessons, scenes } = data;
  const failures = [];
  const fail = (code, message) => failures.push({ code, message });
  const lesson = (lessons ?? []).find((item) => item.id === CAPSTONE_ID);
  if (!lesson) {
    fail("TRANSFER", "capstone lesson missing");
    return { failures };
  }

  const hostedIds = [
    "conversa-cotidiana",
    "imersao-restaurante",
    "conversa-na-loja",
    "imersao-estacao",
    "pegar-taxi",
    "checkin-hotel",
    "no-aeroporto",
    "nao-me-sinto-bem",
    "na-clinica",
  ];
  const hosted = (scenes ?? []).filter((scene) => hostedIds.includes(scene.sceneId));
  const byId = Object.fromEntries(hosted.map((scene) => [scene.sceneId, scene]));

  const restaurant = sceneBlob(byId["imersao-restaurante"] ?? {});
  const shopping = sceneBlob(byId["conversa-na-loja"] ?? {});
  if (!/我要/.test(clean(restaurant)) || !/我要/.test(clean(shopping))) {
    fail("TRANSFER", "我要 must reappear in restaurant and shopping");
  }

  const hotel = sceneBlob(byId["checkin-hotel"] ?? {});
  const airport = sceneBlob(byId["no-aeroporto"] ?? {});
  const clinic = sceneBlob(byId["na-clinica"] ?? {});
  const health = sceneBlob(byId["nao-me-sinto-bem"] ?? {});
  const whereHits = [hotel, airport, clinic, health].filter((blob) => /在哪里/.test(clean(blob)));
  if (whereHits.length < 2) fail("TRANSFER", "在哪里 must transfer across hotel/airport/health");

  const everyday = sceneBlob(byId["conversa-cotidiana"] ?? {});
  const station = sceneBlob(byId["imersao-estacao"] ?? {});
  const streetOrStation = `${everyday}${station}${sceneBlob(byId["pegar-taxi"] ?? {})}`;
  if (!/请问/.test(clean(streetOrStation)) && !/请问/.test(clean((lesson.steps ?? []).map((step) => step.audioText ?? "").join("")))) {
    fail("TRANSFER", "请问 must reappear in street or station");
  }

  const productions = (lesson.steps ?? []).filter((step) => step.kind === "free_production");
  if (!productions.some((step) => /我要/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
    fail("TRANSFER", "capstone production missing 我要 frame");
  }
  if (!productions.some((step) => /在哪里/.test(clean(step.answer ?? step.correctAnswer ?? "")))) {
    fail("TRANSFER", "capstone production missing 在哪里 frame");
  }

  return { failures };
}
