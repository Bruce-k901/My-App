import { promises as fs } from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { PreviewClient } from 'courses/uk-l2-food-hygiene/player/PreviewClient';
import { pagesSchema, type Page } from 'courses/uk-l2-food-hygiene/schemas/page';
import { safeParseOrThrow } from 'courses/uk-l2-food-hygiene/schemas/validate';

async function loadModulePages(moduleId: string) {
  const filePath = path.join(process.cwd(), 'courses', 'uk-l2-food-hygiene', 'modules', moduleId, 'pages.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  return safeParseOrThrow(pagesSchema, JSON.parse(raw) as Page[], `${moduleId} pages`);
}

// Next.js 15: searchParams is now a Promise
export default async function CoursePreviewPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const moduleId = resolvedSearchParams.module ?? 'm1';
  try {
    const pages = await loadModulePages(moduleId);
    return <PreviewClient moduleId={moduleId} pages={pages} />;
  } catch (error) {
    console.error('Failed to load preview', error);
    notFound();
  }
}
