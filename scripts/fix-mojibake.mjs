// scripts/fix-mojibake.mjs
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = join(process.cwd(), "lol-ui", "src");
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html"]);

const MAP = new Map([
  ["â€™", "’"], ["â€˜", "‘"], ["â€œ", "“"], ["â€\x9d", "”"],
  ["Ã©", "é"], ["Ã¨", "è"], ["Ã\x82", "Â"], // garde ce cas pour nettoyage
  ["Ã ", "à"], ["Ã¢", "â"], ["Ãª", "ê"], ["Ã«", "ë"],
  ["Ã¹", "ù"], ["Ã´", "ô"], ["Ã®", "î"], ["Ã§", "ç"],
  ["Â ", ""], ["Â ", " "]
]);

async function* walk(dir) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let fixed = 0, scanned = 0;
for await (const file of walk(ROOT)) {
  scanned++;
  if (!EXTS.has(extname(file))) continue;
  let buf = await readFile(file, "utf8");
  let out = buf;
  for (const [bad, good] of MAP) out = out.split(bad).join(good);
  if (out !== buf) {
    await writeFile(file, out, "utf8");
    fixed++;
  }
}
console.log(`Scanned: ${scanned} files, fixed: ${fixed}`);
