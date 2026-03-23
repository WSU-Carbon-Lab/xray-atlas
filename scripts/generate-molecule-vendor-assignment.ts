import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "s3", "MOLECULES");

function mapVendor(raw: string): string {
  const t = raw.trim();
  if (t === "1-Material") return "1-Material";
  if (t === "Sigma Aldrich" || t === "Sigma-Aldrich") return "Sigma-Aldrich";
  if (
    t === "Nano-C-nanostructured-carbon" ||
    t === "Nano-C-nanostructured-carbon-"
  )
    return "Nano-C, Inc.";
  if (t === "Wei-You-Group") return "Wei You Group";
  return `UNMAPPED:${t}`;
}

function canonSet(s: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const x of s) out.add(mapVendor(x));
  return out;
}

const entries = await readdir(ROOT, { withFileTypes: true });
const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

type Row = {
  moleculeFolder: string;
  fromMetadata: Set<string>;
  fromFilenames: Set<string>;
};

const rows: Row[] = [];

for (const d of dirs) {
  const fromMetadata = new Set<string>();
  const fromFilenames = new Set<string>();

  try {
    const metaPath = join(ROOT, d, "METADATA.json");
    const text = await readFile(metaPath, "utf8");
    const j = JSON.parse(text) as {
      molecule?: { data?: { source?: string }[] };
    };
    for (const item of j.molecule?.data ?? []) {
      if (typeof item.source === "string" && item.source.trim()) {
        fromMetadata.add(item.source.trim());
      }
    }
  } catch {
    /* no METADATA */
  }

  try {
    const sub = await readdir(join(ROOT, d));
    for (const f of sub) {
      if (f === "METADATA.json") continue;
      if (!/\.(csv|json)$/i.test(f)) continue;
      const base = f.replace(/\.(csv|json)$/i, "");
      const parts = base.split("_");
      if (parts.length < 6) continue;
      const vendorRaw = parts.slice(5).join("_");
      if (vendorRaw) fromFilenames.add(vendorRaw);
    }
  } catch {
    /* empty */
  }

  rows.push({ moleculeFolder: d, fromMetadata, fromFilenames });
}

let md = "# Molecule vendor assignment (S3 backlog)\n\n";
md +=
  "Generated from `s3/MOLECULES/*/METADATA.json` `source` and spectrum file basename token 6. ";
md +=
  "Canonical names match `s3/README.md` **Approved vendor normalization set**.\n\n";
md +=
  "| Molecule folder | Raw `source` (METADATA) | Raw filename vendor segment | Canonical vendor(s) | Notes |\n";
md += "|---|---|---|---|---|\n";

for (const r of rows) {
  const metaArr = [...r.fromMetadata].sort();
  const fileArr = [...r.fromFilenames].sort();
  const metaCanon = canonSet(r.fromMetadata);
  const fileCanon = canonSet(r.fromFilenames);
  const allCanon = new Set([...metaCanon, ...fileCanon]);
  const unmapped = [...allCanon].filter((c) => c.startsWith("UNMAPPED:"));
  let notes = "";
  if (unmapped.length) notes = `Unmapped raw: ${unmapped.join("; ")}`;
  const metaMismatch =
    metaCanon.size > 1 ? "Multiple canonical from METADATA" : "";
  const fileMismatch =
    fileCanon.size > 1 ? "Multiple canonical from filenames" : "";
  let crossMismatch = "";
  if (metaCanon.size && fileCanon.size) {
    const a = [...metaCanon].filter((c) => !c.startsWith("UNMAPPED:"));
    const b = [...fileCanon].filter((c) => !c.startsWith("UNMAPPED:"));
    const same =
      a.length === b.length && a.every((c) => b.includes(c)) && b.every((c) => a.includes(c));
    if (!same) crossMismatch = "METADATA vs filename canonical mismatch";
  }
  const noteParts = [metaMismatch, fileMismatch, crossMismatch, notes].filter(
    Boolean,
  );
  const canonDisplay = [...allCanon]
    .filter((c) => !c.startsWith("UNMAPPED:"))
    .sort()
    .map((x) => `\`${x}\``)
    .join(", ");
  md += `| ${r.moleculeFolder} | ${
    metaArr.length ? metaArr.map((x) => `\`${x}\``).join(", ") : "(none)"
  } | ${
    fileArr.length ? fileArr.map((x) => `\`${x}\``).join(", ") : "(none)"
  } | ${canonDisplay || "(none)"} | ${noteParts.join(" ") || "—"} |\n`;
}

md += "\n## Standalone vendor inserts\n\n";
md +=
  "The `vendors` table only stores `name` (required, unique) and optional `url`. ";
md +=
  "Rows do not require samples. After approval, insert vendors with SQL or Prisma, for example:\n\n";
md += "```sql\n";
for (const name of [
  "1-Material",
  "Sigma-Aldrich",
  "Nano-C, Inc.",
  "Wei You Group",
]) {
  md += `INSERT INTO public.vendors (id, name) VALUES (gen_random_uuid(), '${name.replace(/'/g, "''")}') ON CONFLICT (name) DO NOTHING;\n`;
}
md += "```\n\n";
md +=
  "`Wei You Group` may already exist; `ON CONFLICT DO NOTHING` keeps the run idempotent. Link `samples.vendorid` only when creating samples.\n";

const outPath = join(import.meta.dirname, "..", "s3", "MOLECULE_VENDOR_ASSIGNMENT.md");
await writeFile(outPath, md, "utf8");
console.log("Wrote", outPath);
