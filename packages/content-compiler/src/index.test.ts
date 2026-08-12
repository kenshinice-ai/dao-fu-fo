import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileContent } from "./index";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("public compiler boundary", () => {
  it("can publish a reviewed subset without leaking related preview entities", async () => {
    const root = await mkdtemp(join(tmpdir(), "drf-compiler-public-slice-"));
    temporaryRoots.push(root);
    await cp(resolve(process.cwd(), "../../content"), join(root, "content"), { recursive: true });

    for (const kind of ["concept", "event", "figure", "institution", "museum_object", "passage", "place", "route", "text", "text_version"]) {
      const directory = join(root, "content/dao-ru-fo/entities", kind);
      for (const file of await readdir(directory, { withFileTypes: true })) {
        if (!file.isFile()) continue;
        if (!file.name.endsWith(".json")) continue;
        const path = join(directory, file.name);
        const raw = JSON.parse(await readFile(path, "utf8"));
        const values = Array.isArray(raw) ? raw : [raw];
        let changed = false;
        const updated = values.map((entity: { publicationState?: string; reviewStatus?: string }) => {
          if (entity.publicationState !== "public") return entity;
          changed = true;
          return { ...entity, publicationState: "preview", reviewStatus: "bilingual_reviewed" };
        });
        if (changed) await writeFile(path, `${JSON.stringify(Array.isArray(raw) ? updated : updated[0], null, 2)}\n`, "utf8");
      }
    }
    const relationsPath = join(root, "content/dao-ru-fo/relations.json");
    const relations = JSON.parse(await readFile(relationsPath, "utf8"));
    for (const relation of relations) {
      if (relation.publicationState !== "public") continue;
      relation.publicationState = "preview";
      relation.reviewStatus = "bilingual_reviewed";
    }
    await writeFile(relationsPath, `${JSON.stringify(relations, null, 2)}\n`, "utf8");

    const entityPath = join(root, "content/dao-ru-fo/entities/figure/xuanzang.json");
    const entity = JSON.parse(await readFile(entityPath, "utf8"));
    entity.publicationState = "public";
    entity.reviewStatus = "publishable";
    await writeFile(entityPath, `${JSON.stringify(entity, null, 2)}\n`, "utf8");

    const sourcesPath = join(root, "content/common/sources.json");
    const sources = JSON.parse(await readFile(sourcesPath, "utf8"));
    const source = sources.find((candidate: { id: string }) => candidate.id === "source:xuanzang-records");
    if (!source) throw new Error("fixture source missing");
    source.locatorLevel = "precise";
    source.citationStatus = "verified";
    await writeFile(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`, "utf8");

    const reviewedAt = "2026-08-09T04:00:00.000Z";
    const checks = ["schema", "fact", "bilingual", "rights", "accessibility", "editorial", "tradition"].map((checkKind, index) => ({
      id: `review:test-xuanzang-${index}`,
      subjectKind: "entity",
      subjectKey: "figure:xuanzang",
      checkKind,
      status: "passed",
      reviewer: "fixture-reviewer",
      reviewedAt,
    }));
    await writeFile(join(root, "content/dao-ru-fo/reviews.json"), `${JSON.stringify(checks, null, 2)}\n`, "utf8");

    const outputDirectory = join(root, ".artifacts/content/public-v2");
    const result = await compileContent({ repoRoot: root, outputDirectory, visibility: "public" });
    expect(result.entityCounts).toEqual({ figure: 1 });
    const artifact = JSON.parse(await readFile(join(outputDirectory, "entities/figure/xuanzang.en.json"), "utf8"));
    expect(artifact.publicationState).toBe("public");
    expect(artifact.related).toEqual([]);
  });

  it("carries contextual relation qualifiers and localized time assertions into the read model", async () => {
    const root = await mkdtemp(join(tmpdir(), "drf-compiler-context-model-"));
    temporaryRoots.push(root);
    await cp(resolve(process.cwd(), "../../content"), join(root, "content"), { recursive: true });

    const outputDirectory = join(root, ".artifacts/content/v2");
    await compileContent({ repoRoot: root, outputDirectory });

    const relations = JSON.parse(await readFile(join(outputDirectory, "relations/en.json"), "utf8"));
    const activeRelation = relations.items.find((item: { id: string }) => item.id === "relation:xuanzang-active-changan");
    expect(activeRelation).toMatchObject({ relationType: "active_in", qualifiers: {}, temporalAssertions: [] });
    const simaRelation = relations.items.find((item: { id: string }) => item.id === "relation:sima-active-changan");
    expect(simaRelation).toMatchObject({
      label: "Summoned to the capital in 711 (Chang'an anchor)",
      temporalAssertions: [expect.objectContaining({ startYear: 711, endYear: 711, sourceId: "source:sima-old-tang-biography" })],
    });
    const kongRelation = relations.items.find((item: { id: string }) => item.id === "relation:kong-active-changan");
    expect(kongRelation).toMatchObject({
      label: "Taught at Chang'an Guozijian in 640",
      temporalAssertions: [expect.objectContaining({ startYear: 640, endYear: 640, sourceId: "source:changan-guozijian-gazetteer" })],
    });

    const figure = JSON.parse(await readFile(join(outputDirectory, "entities/figure/xuanzang.en.json"), "utf8"));
    const passage = JSON.parse(await readFile(join(outputDirectory, "entities/passage/form-is-emptiness.en.json"), "utf8"));
    const historicalTimeline = JSON.parse(await readFile(join(outputDirectory, "timeline/overview.en.json"), "utf8"));
    const suitangTimeline = JSON.parse(await readFile(join(outputDirectory, "timeline/suitang.en.json"), "utf8"));
    expect(historicalTimeline).toMatchObject({ startYear: -600, endYear: 1529 });
    expect(historicalTimeline.events.length).toBeGreaterThan(suitangTimeline.events.length);
    expect(suitangTimeline).toMatchObject({ startYear: 581, endYear: 907 });
    const reviewQueue = JSON.parse(await readFile(join(outputDirectory, "manifest/review-queue.json"), "utf8"));
    expect(figure.profile.figureClass).toBe("historical_person");
    expect(passage.profile.attributionStatus).toBe("anonymous_or_composite");
    const simaQueueItem = reviewQueue.items.find((item: { subjectKey: string }) => item.subjectKey === "figure:sima-chengzhen");
    expect(simaQueueItem.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ checkKind: "fact", status: "passed", reviewer: "codex:authorized-rc-reviewer" }),
      expect.objectContaining({ checkKind: "tradition", status: "passed", reviewer: "codex:authorized-rc-reviewer" }),
    ]));
  });

  it("compiles the configured cross-era comparison with traceable axes", async () => {
    const root = await mkdtemp(join(tmpdir(), "drf-compiler-comparison-model-"));
    temporaryRoots.push(root);
    await cp(resolve(process.cwd(), "../../content"), join(root, "content"), { recursive: true });

    const outputDirectory = join(root, ".artifacts/content/v2");
    await compileContent({ repoRoot: root, outputDirectory });

    const comparison = JSON.parse(await readFile(join(outputDirectory, "comparisons/cross-era-figures.en.json"), "utf8"));
    expect(comparison.entities.map((entity: { key: string }) => entity.key)).toEqual([
      "figure:laozi",
      "figure:confucius",
      "figure:sakyamuni",
    ]);
    expect(comparison.axes.map((axis: { id: string }) => axis.id)).toEqual([
      "historicity", "tradition", "time", "speech", "space", "events", "texts", "reception", "evidence",
    ]);
    const speech = comparison.axes.find((axis: { id: string }) => axis.id === "speech");
    expect(speech.cells.find((cell: { entityKey: string }) => cell.entityKey === "figure:sakyamuni").details.join("\n")).toContain("Preserved as Śākyamuni's teaching through transmission → This is the noble truth of suffering");
    expect(comparison.disclaimer).toContain("does not collapse");
  });

  it("compiles the configured three-tradition passage reading with text-version closure", async () => {
    const root = await mkdtemp(join(tmpdir(), "drf-compiler-text-reading-model-"));
    temporaryRoots.push(root);
    await cp(resolve(process.cwd(), "../../content"), join(root, "content"), { recursive: true });

    const outputDirectory = join(root, ".artifacts/content/v2");
    await compileContent({ repoRoot: root, outputDirectory });

    const reading = JSON.parse(await readFile(join(outputDirectory, "text-readings/three-traditions-passage-reading.en.json"), "utf8"));
    expect(reading.readings.map((item: { key: string }) => item.key)).toEqual([
      "passage:dao-that-can-be-spoken",
      "passage:learn-and-practice",
      "passage:turning-of-dharma-wheel",
    ]);
    expect(reading.axes.map((axis: { id: string }) => axis.id)).toEqual([
      "textual_layer", "locator", "wording", "attribution", "interpretation", "time", "evidence",
    ]);
    expect(reading.readings[0].text.key).toBe("text:daodejing");
    expect(reading.readings[0].version.key).toBe("text_version:daodejing-received");
    const attribution = reading.axes.find((axis: { id: string }) => axis.id === "attribution");
    expect(attribution.cells[0].details.join("\n")).toContain("Preserved traditionally as a saying of Laozi");
    expect(reading.contextRelations.some((relation: { relationType: string }) => relation.relationType === "quoted_from_version")).toBe(true);
    expect(reading.readings[0].reviewEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ subjectKind: "entity", subjectKey: "passage:dao-that-can-be-spoken", blocking: false }),
    ]));
  });

  it("compiles a same-text version reading with explicit translation wording and review evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "drf-compiler-same-text-reading-model-"));
    temporaryRoots.push(root);
    await cp(resolve(process.cwd(), "../../content"), join(root, "content"), { recursive: true });

    const outputDirectory = join(root, ".artifacts/content/v2");
    await compileContent({ repoRoot: root, outputDirectory });

    const reading = JSON.parse(await readFile(join(outputDirectory, "text-readings/dhammacakkappavattana-version-reading.en.json"), "utf8"));
    expect(reading.readingMode).toBe("same_text_versions");
    expect(reading.textSlug).toBe("dhammacakkappavattana-sutta");
    expect(reading.readings.map((item: { version: { key: string } }) => item.version.key)).toEqual([
      "text_version:dhammacakkappavattana-sutta-pali",
      "text_version:dhammacakkappavattana-sutta-thanissaro-en",
    ]);
    const variant = reading.readings[0].passage.variantReadings[0];
    expect(variant.kind).toBe("translation");
    expect(variant.form).toBe("suffering / stress");
    const wording = reading.axes.find((axis: { id: string }) => axis.id === "wording");
    expect(wording.cells[1].value).toBe("This is the noble truth of stress.");
    expect(wording.cells[1].reviewEvidence.length).toBeGreaterThan(0);
    expect(reading.contextRelations.some((relation: { id: string }) => relation.id === "relation:turning-passage-parallel-thanissaro")).toBe(true);
  });
});
