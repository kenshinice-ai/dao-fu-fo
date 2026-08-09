import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve("content/dao-ru-fo/entities");

const conceptProfiles = {
  "form-and-emptiness": { conceptKind: "doctrinal" },
  "naturalness-and-self-so": { conceptKind: "doctrinal" },
  "classical-commentary": { conceptKind: "interpretive_method" },
  "pilgrimage-and-transmission": { conceptKind: "institutional_process" },
  "ritual-order": { conceptKind: "ethical" },
  "translation-as-institution": { conceptKind: "institutional_process" },
};

const eventProfiles = {
  "sui-unification": { eventKind: "dynastic_transition", historicity: "documented", sequenceOrder: 1, eventScope: "imperial" },
  "tang-dynasty-founded": { eventKind: "dynastic_transition", historicity: "documented", sequenceOrder: 2, eventScope: "imperial" },
  "xuanzang-departs-changan": { eventKind: "journey", historicity: "documented", sequenceOrder: 3, eventScope: "transregional" },
  "five-classics-corrected-meanings-project": { eventKind: "editorial_project", historicity: "inferred", sequenceOrder: 4, eventScope: "imperial" },
  "daci-en-monastery-established": { eventKind: "foundation", historicity: "documented", sequenceOrder: 6, eventScope: "local" },
  "xuanzang-return-changan": { eventKind: "journey", historicity: "documented", sequenceOrder: 5, eventScope: "transregional" },
  "great-wild-goose-pagoda-first-construction": { eventKind: "construction", historicity: "documented", sequenceOrder: 7, eventScope: "local" },
  "yijing-departs-by-sea": { eventKind: "journey", historicity: "documented", sequenceOrder: 8, eventScope: "transregional" },
  "wu-zhou-established": { eventKind: "dynastic_transition", historicity: "documented", sequenceOrder: 9, eventScope: "imperial" },
  "yijing-returns": { eventKind: "journey", historicity: "documented", sequenceOrder: 10, eventScope: "transregional" },
  "kaiyuan-institutional-expansion": { eventKind: "analytical_period", historicity: "inferred", sequenceOrder: 11, eventScope: "imperial" },
  "an-lushan-rebellion-begins": { eventKind: "conflict", historicity: "documented", sequenceOrder: 12, eventScope: "imperial" },
  "an-lushan-rebellion-ends": { eventKind: "conflict", historicity: "documented", sequenceOrder: 13, eventScope: "imperial" },
  "huichang-religious-policies": { eventKind: "policy", historicity: "documented", sequenceOrder: 14, eventScope: "imperial" },
  "tang-end-transition": { eventKind: "dynastic_transition", historicity: "documented", sequenceOrder: 15, eventScope: "imperial" },
};

const figureProfiles = {
  "kong-yingda": { historicity: "documented", gender: "male", canonicalNameOriginal: "孔颖达", nameLanguageCode: "lzh" },
  "cheng-xuanying": { historicity: "inferred", gender: "male", canonicalNameOriginal: "成玄英", nameLanguageCode: "lzh" },
  "yan-shigu": { historicity: "documented", gender: "male", canonicalNameOriginal: "颜师古", nameLanguageCode: "lzh" },
  jizang: { historicity: "documented", gender: "male", canonicalNameOriginal: "吉藏", nameLanguageCode: "lzh" },
  "li-shimin": { historicity: "documented", gender: "male", canonicalNameOriginal: "李世民", nameLanguageCode: "lzh" },
  "sima-chengzhen": { historicity: "documented", gender: "male", canonicalNameOriginal: "司马承祯", nameLanguageCode: "lzh" },
  "wu-zhao": { historicity: "documented", gender: "female", canonicalNameOriginal: "武曌", nameLanguageCode: "lzh" },
  xuanzang: { historicity: "documented", gender: "male", canonicalNameOriginal: "玄奘", nameLanguageCode: "lzh" },
  yijing: { historicity: "documented", gender: "male", canonicalNameOriginal: "义净", nameLanguageCode: "lzh" },
};

const institutionProfiles = {
  "daci-en-monastery": { institutionKind: "monastery", networkScope: false },
  guozijian: { institutionKind: "state_academy", networkScope: false },
  "changan-translation-bureau": { institutionKind: "translation_network", networkScope: true },
  "hongwen-institute": { institutionKind: "court_institute", networkScope: false },
  "changan-daoist-monastic-network": { institutionKind: "monastic_network", networkScope: true },
  louguan: { institutionKind: "daoist_monastery", networkScope: false },
};

const profiles = { concept: conceptProfiles, event: eventProfiles, figure: figureProfiles, institution: institutionProfiles };

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
  return files;
}

const seen = new Set();
for (const path of await walk(root)) {
  const input = JSON.parse(await readFile(path, "utf8"));
  const entities = Array.isArray(input) ? input : [input];
  let changed = false;
  for (const entity of entities) {
    const profile = profiles[entity.kind]?.[entity.slug];
    if (!profile) continue;
    seen.add(`${entity.kind}:${entity.slug}`);
    if (Object.keys(entity.profile ?? {}).length > 0 && JSON.stringify(entity.profile) !== JSON.stringify(profile)) {
      throw new Error(`${entity.kind}:${entity.slug} already has a different non-empty profile`);
    }
    entity.profile = profile;
    changed = true;
  }
  if (changed) await writeFile(path, `${JSON.stringify(Array.isArray(input) ? entities : entities[0], null, 2)}\n`, "utf8");
}

const expected = Object.entries(profiles).flatMap(([kind, values]) => Object.keys(values).map((slug) => `${kind}:${slug}`));
const missing = expected.filter((key) => !seen.has(key));
if (missing.length) throw new Error(`Profile migration targets not found: ${missing.join(", ")}`);
console.log(`Content profiles migrated: ${seen.size} entities`);
