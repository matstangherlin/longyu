export function validateCultureGamification(data) {
  const failures = [];
  const fail = (code, ref, message) => failures.push({ code, ref, message });
  const missions = data.missions ?? [];
  for (const mission of missions) {
    const xp = mission.reward?.xp ?? 0;
    if (xp <= 0) fail("NO_XP", mission.id, "mission reward xp required");
    if (xp > 10) fail("XP_TOO_HIGH", mission.id, "keep culture XP small");
  }
  if ((data.seals ?? []).length < 5 || (data.seals ?? []).length > 8) {
    fail("SEAL_COUNT", "seals", "start with 5–8 seals");
  }
  return { failures, count: missions.length };
}
