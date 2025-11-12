import { promises as fs } from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { PlayerShell, type ModuleBundle } from 'courses/uk-l2-food-hygiene/player/PlayerShell';
import { courseManifestSchema } from 'courses/uk-l2-food-hygiene/schemas/course';
import { moduleManifestSchema } from 'courses/uk-l2-food-hygiene/schemas/module';
import { pagesSchema, type Page } from 'courses/uk-l2-food-hygiene/schemas/page';
import { quizSchema } from 'courses/uk-l2-food-hygiene/schemas/quiz';
import { outcomesMappingSchema } from 'courses/uk-l2-food-hygiene/schemas/outcomes';
import { assessmentBlueprintSchema } from 'courses/uk-l2-food-hygiene/schemas/blueprint';
import { safeParseOrThrow } from 'courses/uk-l2-food-hygiene/schemas/validate';

async function loadJson<T>(relative: string): Promise<T> {
  const filePath = path.join(process.cwd(), 'courses', 'uk-l2-food-hygiene', relative);
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function loadCourseAndModules() {
  const course = safeParseOrThrow(
    courseManifestSchema,
    await loadJson('course.json'),
    'course manifest'
  );

  const bundles: ModuleBundle[] = [];

  for (const moduleMeta of course.modules) {
    const manifest = safeParseOrThrow(
      moduleManifestSchema,
      await loadJson(path.join('modules', moduleMeta.id, 'module.json')),
      `${moduleMeta.id} module manifest`
    );
    const pages = safeParseOrThrow(
      pagesSchema,
      await loadJson<Page[]>(path.join('modules', moduleMeta.id, 'pages.json')),
      `${moduleMeta.id} pages`
    );

    let pools: Record<string, Page[]> = {};
    try {
      const quizFile = safeParseOrThrow(
        quizSchema,
        await loadJson(path.join('modules', moduleMeta.id, 'quiz.json')),
        `${moduleMeta.id} quiz pool`
      );
      pools = { [quizFile.pool_id]: quizFile.items };
    } catch (error) {
      pools = {};
    }

    let outcomes;
    try {
      outcomes = safeParseOrThrow(
        outcomesMappingSchema,
        await loadJson(path.join('modules', moduleMeta.id, 'outcomes.json')),
        `${moduleMeta.id} outcomes mapping`
      );
    } catch (error) {
      outcomes = undefined;
    }

    let blueprint;
    try {
      blueprint = safeParseOrThrow(
        assessmentBlueprintSchema,
        await loadJson(path.join('modules', moduleMeta.id, 'blueprint.json')),
        `${moduleMeta.id} blueprint`
      );
    } catch (error) {
      blueprint = undefined;
    }

    bundles.push({
      manifest,
      pages,
      pools,
      outcomes,
      blueprint,
    });
  }

  return { course, bundles };
}

export default async function StartCoursePage() {
  try {
    const { course, bundles } = await loadCourseAndModules();
    return <PlayerShell course={course} modules={bundles} />;
  } catch (error) {
    console.error('Failed to load Level 2 Food Hygiene course', error);
    notFound();
  }
}
