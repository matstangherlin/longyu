import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
const src = fs.readFileSync("src/data/visualVocabulary.ts", "utf8");
const rows = [...src.matchAll(/\{ id: "([^"]+)"[\s\S]*?imageSrc: "([^"]+)"[\s\S]*?backgroundStyle: "([^"]+)"/g)]
  .map(m => ({ id: m[1], file: m[2], bg: m[3] })).filter(r => r.bg === "transparent");
const svgIssues = [], rasterIssues = [];
for (const r of rows) {
  const p = path.join("src/assets/visuals", r.file);
  if (r.file.endsWith(".svg")) {
    const s = fs.readFileSync(p, "utf8");
    const vb = (s.match(/viewBox="([\d.\s-]+)"/) || [])[1]?.trim().split(/\s+/).map(Number) ?? [0,0,600,600];
    const [, , vw, vh] = vb;
    if (/<rect[^>]*(width="100%"|width="\s*\d+")[^>]*fill="(?!none)/.test(s)) svgIssues.push([r.id, "rect full-canvas"]);
    for (const tag of s.match(/<path\b[^>]*>/g) ?? []) {
      const d = (tag.match(/d="([^"]*)"/) || [])[1] ?? "";
      const fill = (tag.match(/fill="([^"]*)"/) || [])[1] ?? "none";
      if (fill === "none") continue;
      const t = tag.match(/transform="translate\(([-\d.]+)[ ,]+([-\d.]+)\)"/);
      const tx = t ? Number(t[1]) : 0, ty = t ? Number(t[2]) : 0;
      const nums = (d.match(/-?\d+\.?\d*/g) ?? []).map(Number);
      const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
      if (!xs.length) continue;
      const x0 = Math.min(...xs)+tx, x1 = Math.max(...xs)+tx, y0 = Math.min(...ys)+ty, y1 = Math.max(...ys)+ty;
      const wide = (x1-x0) >= vw*0.95, tall = (y1-y0) >= vh*0.95;
      // quantos cantos do bbox são pontos reais do path (plate retangular)
      const pts = []; for (let i=0;i<nums.length;i+=2) pts.push([nums[i]+tx, nums[i+1]+ty]);
      const near = (a,b,c,d2) => Math.abs(a-c) < 1.5 && Math.abs(b-d2) < 1.5;
      const corners = [[x0,y0],[x1,y0],[x1,y1],[x0,y1]].filter(c => pts.some(pt => near(pt[0],pt[1],c[0],c[1]))).length;
      if ((wide && tall) || ((wide || tall) && corners >= 3))
        svgIssues.push([r.id, `${r.file} fill=${fill} bbox=${Math.round(x0)},${Math.round(y0)} ${Math.round(x1-x0)}x${Math.round(y1-y0)} cantos=${corners}`]);
    }
  } else {
    const img = sharp(p);
    const meta = await img.metadata();
    if (!meta.hasAlpha) { rasterIssues.push([r.id, `${r.file} sem canal alpha`]); continue; }
    const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const at = (x, y) => data[(y*info.width + x)*info.channels + 3];
    const c = [at(0,0), at(info.width-1,0), at(0,info.height-1), at(info.width-1,info.height-1)];
    if (c.every(a => a > 250)) rasterIssues.push([r.id, `${r.file} 4 cantos opacos (${c.join(",")})`]);
  }
}
console.log("SVG com placa de fundo:", svgIssues.length);
svgIssues.forEach(([id, why]) => console.log("  -", id, "|", why));
console.log("\nRaster sem transparência real:", rasterIssues.length);
rasterIssues.forEach(([id, why]) => console.log("  -", id, "|", why));
