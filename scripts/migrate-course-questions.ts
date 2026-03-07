/**
 * Migration script to move quiz questions from JSON files to database
 * 
 * This script reads quiz.json files from the courses directory and generates
 * SQL INSERT statements for course_questions and course_question_options tables.
 * 
 * Run with: npx tsx scripts/migrate-course-questions.ts > supabase/migrations/YYYYMMDDHHMMSS_migrate_course_questions.sql
 */

import * as fs from 'fs';
import * as path from 'path';

interface QuizItem {
  id: string;
  type: 'single_choice' | 'multi_choice';
  stem: string;
  options: string[];
  answer?: number;
  answers?: number[];
  rationale?: string;
}

interface QuizFile {
  pool_id: string;
  items: QuizItem[];
}

// Course mapping: course directory -> course code in training_courses table
const COURSE_MAPPING: Record<string, string> = {
  'uk-l2-food-hygiene': 'FS-L2',
  // Add other courses here as needed
};

function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''");
}

function generateQuestionType(quizType: string): string {
  if (quizType === 'single_choice') return 'multiple_choice';
  if (quizType === 'multi_choice') return 'multi_select';
  return 'multiple_choice';
}

function generateSQL(modulePath: string, quizFile: QuizFile): string[] {
  const sql: string[] = [];
  const moduleId = path.basename(modulePath);
  const courseDir = path.basename(path.dirname(path.dirname(modulePath)));
  const courseCode = COURSE_MAPPING[courseDir];

  if (!courseCode) {
    console.warn(`No course mapping found for ${courseDir}, skipping`);
    return sql;
  }

  sql.push(`-- Questions for ${courseDir}/${moduleId} (pool: ${quizFile.pool_id})`);
  sql.push('');

  for (const item of quizFile.items) {
    const questionId = `gen_random_uuid()`;
    const questionType = generateQuestionType(item.type);
    const explanation = item.rationale ? escapeSqlString(item.rationale) : null;
    const stem = escapeSqlString(item.stem);

    // Insert question
    sql.push(`-- Question: ${item.id}`);
    sql.push(`INSERT INTO course_questions (
      id,
      company_id,
      course_id,
      module_id,
      question_text,
      question_type,
      explanation,
      difficulty,
      points,
      is_active,
      is_system_default,
      sort_order
    )`);
    sql.push(`SELECT 
      ${questionId},
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = '${courseCode}' LIMIT 1),
      '${moduleId}',
      '${stem}',
      '${questionType}',
      ${explanation ? `'${explanation}'` : 'NULL'},
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = '${courseCode}');`);
    sql.push('');

    // Insert options
    for (let i = 0; i < item.options.length; i++) {
      const optionText = escapeSqlString(item.options[i]);
      const isCorrect = item.type === 'single_choice' 
        ? (item.answer === i)
        : (item.answers?.includes(i) ?? false);

      sql.push(`INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )`);
      sql.push(`SELECT 
        q.id,
        '${optionText}',
        ${isCorrect},
        ${i}
      FROM course_questions q
      WHERE q.module_id = '${moduleId}'
        AND q.question_text = '${stem}'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = '${courseCode}' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;`);
      sql.push('');
    }
  }

  return sql;
}

function main() {
  const coursesDir = path.join(process.cwd(), 'courses');
  const sql: string[] = [];

  sql.push('-- =====================================================');
  sql.push('-- MIGRATE COURSE QUESTIONS FROM JSON FILES');
  sql.push('-- This migration imports quiz questions from course JSON files');
  sql.push('-- into the course_questions and course_question_options tables');
  sql.push('-- =====================================================');
  sql.push('');
  sql.push('-- Only proceed if tables exist');
  sql.push(`DO $$`);
  sql.push(`BEGIN`);
  sql.push(`  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_questions')`);
  sql.push(`     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN`);
  sql.push('');
  sql.push('    -- Clear existing system questions for these courses (optional - comment out if you want to keep existing)');
  sql.push(`    -- DELETE FROM course_question_options WHERE question_id IN (`);
  sql.push(`    --   SELECT id FROM course_questions WHERE is_system_default = true AND course_id IN (SELECT id FROM training_courses WHERE code IN ('FS-L2', 'ALLERGY', 'HS-L2'))`);
  sql.push(`    -- );`);
  sql.push(`    -- DELETE FROM course_questions WHERE is_system_default = true AND course_id IN (SELECT id FROM training_courses WHERE code IN ('FS-L2', 'ALLERGY', 'HS-L2'));`);
  sql.push('');

  // Find all quiz.json files
  const quizFiles: Array<{ path: string; content: QuizFile }> = [];

  if (!fs.existsSync(coursesDir)) {
    console.error(`Courses directory not found: ${coursesDir}`);
    process.exit(1);
  }

  const courseDirs = fs.readdirSync(coursesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const courseDir of courseDirs) {
    const coursePath = path.join(coursesDir, courseDir);
    const modulesPath = path.join(coursePath, 'modules');

    if (!fs.existsSync(modulesPath)) continue;

    const moduleDirs = fs.readdirSync(modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const moduleDir of moduleDirs) {
      const quizPath = path.join(modulesPath, moduleDir, 'quiz.json');
      
      if (fs.existsSync(quizPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(quizPath, 'utf-8')) as QuizFile;
          quizFiles.push({
            path: path.join(modulesPath, moduleDir),
            content,
          });
        } catch (error) {
          console.error(`Error reading ${quizPath}:`, error);
        }
      }
    }
  }

  // Generate SQL for each quiz file
  for (const { path: modulePath, content } of quizFiles) {
    const moduleSql = generateSQL(modulePath, content);
    sql.push(...moduleSql);
  }

  sql.push(`    RAISE NOTICE 'Migrated questions from JSON files';`);
  sql.push('');
  sql.push(`  ELSE`);
  sql.push(`    RAISE NOTICE '⚠️ Required tables do not exist - skipping question migration';`);
  sql.push(`  END IF;`);
  sql.push(`END $$;`);

  // Output SQL
  console.log(sql.join('\n'));
}

main();
