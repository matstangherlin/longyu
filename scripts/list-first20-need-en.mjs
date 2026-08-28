import fs from "node:fs";

const d = JSON.parse(fs.readFileSync("docs/localization/first-20-topics-en.dump.json", "utf8"));
const PIN = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i;
const PT_MARK = /[àáãâéêíóôõúçÀÁÃÂÉÊÍÓÔÕÚÇ]/;

function skip(t) {
  const s = String(t ?? "").trim();
  if (!s) return true;
  if (/^(same|different)$/i.test(s)) return true;
  if (/^[\u3400-\u9fff\s。？！，、…·]+$/.test(s)) return true;
  const withoutPin = s.replace(PIN, "");
  if (/^[a-züv\s\d'\-?!,.]+$/i.test(s) && PIN.test(s) && !PT_MARK.test(withoutPin)) return true;
  return false;
}

const need = d.strings.map((row) => row.pt).filter((t) => !skip(t));
fs.writeFileSync("/tmp/first20-need-pt.json", JSON.stringify(need, null, 2));
console.log("need", need.length, "skip", d.strings.length - need.length);
console.log(need.slice(0, 40).join("\n---\n"));
