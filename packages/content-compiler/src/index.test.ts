import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
    const checks = ["schema", "fact", "bilingual", "rights", "editorial", "tradition"].map((checkKind, index) => ({
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
});
