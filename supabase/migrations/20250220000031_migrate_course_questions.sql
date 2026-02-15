-- =====================================================
-- MIGRATE COURSE QUESTIONS FROM JSON FILES
-- This migration imports quiz questions from course JSON files
-- into the course_questions and course_question_options tables
-- =====================================================

-- Only proceed if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_questions')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN

    -- Clear existing system questions for these courses (optional - comment out if you want to keep existing)
    -- DELETE FROM course_question_options WHERE question_id IN (
    --   SELECT id FROM course_questions WHERE is_system_default = true AND course_id IN (SELECT id FROM training_courses WHERE code IN ('FS-L2', 'ALLERGY', 'HS-L2'))
    -- );
    -- DELETE FROM course_questions WHERE is_system_default = true AND course_id IN (SELECT id FROM training_courses WHERE code IN ('FS-L2', 'ALLERGY', 'HS-L2'));

-- Questions for uk-l2-food-hygiene/final (pool: final)

-- Question: final_q1
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'What is a common route for contamination in a kitchen?',
      'multiple_choice',
      'Poor hand hygiene spreads germs quickly between surfaces and food.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Sunlight exposure',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'What is a common route for contamination in a kitchen?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Unwashed hands',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'What is a common route for contamination in a kitchen?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'High shelf storage',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'What is a common route for contamination in a kitchen?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Blue chopping boards',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'What is a common route for contamination in a kitchen?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q2
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'Which is a physical contaminant?',
      'multiple_choice',
      'Hair is a physical contaminant; microbes and chemicals are other hazard types.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Salmonella',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which is a physical contaminant?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Bleach',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which is a physical contaminant?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Hair',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which is a physical contaminant?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Allergen proteins',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which is a physical contaminant?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q3
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'The UK temperature danger zone is typically between:',
      'multiple_choice',
      'Food kept between 5 ┬░C and 63 ┬░C allows harmful bacteria to multiply rapidly.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '0 ┬░C and 5 ┬░C',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'The UK temperature danger zone is typically between:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '5 ┬░C and 63 ┬░C',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'The UK temperature danger zone is typically between:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '63 ┬░C and 100 ┬░C',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'The UK temperature danger zone is typically between:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'ΓêÆ18 ┬░C and 0 ┬░C',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'The UK temperature danger zone is typically between:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q4
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'Hot holding should be at or above:',
      'multiple_choice',
      '63 ┬░C or hotter keeps food out of the danger zone during service.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '55 ┬░C',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Hot holding should be at or above:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '60 ┬░C',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Hot holding should be at or above:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '63 ┬░C',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Hot holding should be at or above:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '70 ┬░C',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Hot holding should be at or above:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q5
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'Which practice best prevents cross-contamination?',
      'multiple_choice',
      'Storing raw foods below ready-to-eat foods prevents drips contaminating safe food.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Use one cloth for all tasks',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which practice best prevents cross-contamination?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Store raw meat below ready-to-eat food',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which practice best prevents cross-contamination?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Dry wipe boards only',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which practice best prevents cross-contamination?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Keep chemical sprays near food',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which practice best prevents cross-contamination?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q6
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'Which board is commonly used for raw meat in UK colour coding?',
      'multiple_choice',
      'Red chopping boards are typically reserved for raw meat in UK kitchens.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Green',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which board is commonly used for raw meat in UK colour coding?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Blue',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which board is commonly used for raw meat in UK colour coding?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Red',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which board is commonly used for raw meat in UK colour coding?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Yellow',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which board is commonly used for raw meat in UK colour coding?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q7
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'When must food handlers wash hands?',
      'multiple_choice',
      'Key moments include after the toilet and after handling raw food to remove microbes.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Every hour only',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'When must food handlers wash hands?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'After using the toilet and after handling raw food',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'When must food handlers wash hands?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Only at the start of shift',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'When must food handlers wash hands?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'After serving coffee',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'When must food handlers wash hands?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q8
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'Which item is suitable PPE in a kitchen?',
      'multiple_choice',
      'Hair restraints prevent shedding into food; jewellery and loose items are hazards.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Loose bracelets',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which item is suitable PPE in a kitchen?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Open-toe sandals',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which item is suitable PPE in a kitchen?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Hair net or hat',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which item is suitable PPE in a kitchen?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Long scarves',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which item is suitable PPE in a kitchen?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q9
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'How many major allergens must be declared in the UK?',
      'multiple_choice',
      'UK law requires declaration of 14 specified allergens.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '8',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'How many major allergens must be declared in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '12',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'How many major allergens must be declared in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '14',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'How many major allergens must be declared in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '16',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'How many major allergens must be declared in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q10
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'A customer asks about allergens. What should you do?',
      'multiple_choice',
      'Always verify allergen information using the latest matrix or recipe specification.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Guess based on memory',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'A customer asks about allergens. What should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Check the up-to-date allergen matrix and labels',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'A customer asks about allergens. What should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Say all dishes may contain all allergens',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'A customer asks about allergens. What should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Refuse service',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'A customer asks about allergens. What should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q11
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'What is the second stage in a two-stage clean?',
      'multiple_choice',
      'Stage two is to disinfect the surface and allow the chemical to stay wet for the full contact time.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Detergent clean and rinse',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'What is the second stage in a two-stage clean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Apply disinfectant and leave for contact time',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'What is the second stage in a two-stage clean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Dry with reusable cloth',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'What is the second stage in a two-stage clean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Air dry only',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'What is the second stage in a two-stage clean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q12
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'Which is good bin practice?',
      'multiple_choice',
      'Keeping bins lined and closed controls odours and pests.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Leave lids open to vent',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which is good bin practice?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Use liners and close lids',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which is good bin practice?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Store bins next to ready-to-eat food',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which is good bin practice?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Empty only at end of day',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Which is good bin practice?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q13
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'HACCP stands for:',
      'multiple_choice',
      'HACCP is the internationally recognised Hazard Analysis and Critical Control Points system.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Hazard Analysis and Critical Control Points',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'HACCP stands for:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Health and Catering Cleaning Protocol',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'HACCP stands for:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Hazard Awareness and Cooking Plan',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'HACCP stands for:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Handling and Cooking Control Points',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'HACCP stands for:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q14
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'Due diligence means:',
      'multiple_choice',
      'Due diligence means taking all reasonable precautions and recording evidence.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Waiting for EHO advice',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Due diligence means:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Taking reasonable precautions and keeping records',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Due diligence means:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Only training managers',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Due diligence means:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Keeping receipts only',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Due diligence means:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: final_q15
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'final',
      'Traceability requires you to know:',
      'multiple_choice',
      'Traceability tracks food one step back to suppliers and one step forward to customers.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Only supplier phone numbers',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Traceability requires you to know:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Where food came from and where it goes',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Traceability requires you to know:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Only the freezer temperature',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Traceability requires you to know:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Only the delivery driver name',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'final'
        AND q.question_text = 'Traceability requires you to know:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Questions for uk-l2-food-hygiene/m1 (pool: m1)

-- Question: m1_q1
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm1',
      'Which authority leads food safety enforcement in the UK?',
      'multiple_choice',
      'Environmental Health Officers inspect and enforce food safety law.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Fire Service',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Which authority leads food safety enforcement in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Environmental Health',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Which authority leads food safety enforcement in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Trading Standards',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Which authority leads food safety enforcement in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m1_q2
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm1',
      'What document demonstrates your HACCP system is in control?',
      'multiple_choice',
      'Signed daily records prove critical limits were monitored.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Daily records',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'What document demonstrates your HACCP system is in control?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Social media posts',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'What document demonstrates your HACCP system is in control?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Supplier invoices',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'What document demonstrates your HACCP system is in control?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m1_q3
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm1',
      'If you spot unsafe food, what should you do first?',
      'multiple_choice',
      'Isolate and report so contaminated food cannot be served.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Serve it quickly',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'If you spot unsafe food, what should you do first?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Isolate and report it',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'If you spot unsafe food, what should you do first?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Hide it',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'If you spot unsafe food, what should you do first?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m1_q4
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm1',
      'Food handlers must understand their legal duties becauseΓÇª',
      'multiple_choice',
      'Individuals can face enforcement action if they neglect safe practice.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Only managers can be penalised',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Food handlers must understand their legal duties becauseΓÇª'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'They can be personally liable',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Food handlers must understand their legal duties becauseΓÇª'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'It helps marketing',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Food handlers must understand their legal duties becauseΓÇª'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m1_q5
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm1',
      'Select the due diligence records inspectors expect to see.',
      'multi_select',
      'Only documented, signed records and supplier assurances are accepted evidence.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Completed cleaning schedule',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Select the due diligence records inspectors expect to see.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Unsigned notice board',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Select the due diligence records inspectors expect to see.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Supplier approval documents',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Select the due diligence records inspectors expect to see.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Casual verbal reminders',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Select the due diligence records inspectors expect to see.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m1_q6
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm1',
      'Who decides how frequently your business is inspected?',
      'multiple_choice',
      'EHOs assign a risk score based on compliance and history to set visit frequency.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'The Environmental Health Officer using risk scoring',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Who decides how frequently your business is inspected?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'The head chef',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Who decides how frequently your business is inspected?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Customer complaints',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm1'
        AND q.question_text = 'Who decides how frequently your business is inspected?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Questions for uk-l2-food-hygiene/m2 (pool: m2)

-- Question: m2_q1
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm2',
      'Which is a physical hazard?',
      'multiple_choice',
      'Physical hazards are objects like glass or metal.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Glass shard',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Which is a physical hazard?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Salmonella',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Which is a physical hazard?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Bleach residue',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Which is a physical hazard?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Gluten',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Which is a physical hazard?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m2_q2
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm2',
      'Cross-contact refers to:',
      'multiple_choice',
      'Allergen proteins transfer; cooking doesnΓÇÖt remove them.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Allergens transferring to safe food',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Cross-contact refers to:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Microbes moving from raw to ready foods',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Cross-contact refers to:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Overcooking reduces allergens',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Cross-contact refers to:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'A cleaning method',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Cross-contact refers to:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m2_q3
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm2',
      'Select all high-risk ready-to-eat foods:',
      'multi_select',
      'Ham and cooked rice support bacterial growth; dry pasta does not.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Cooked sliced ham',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Select all high-risk ready-to-eat foods:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Unwashed potatoes',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Select all high-risk ready-to-eat foods:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Cooked rice',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Select all high-risk ready-to-eat foods:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Dry pasta',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Select all high-risk ready-to-eat foods:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m2_q4
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm2',
      'Best action after using a board for raw chicken:',
      'multiple_choice',
      'Use the full clean-disinfect cycle to remove microbes.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Wash, rinse, disinfect, and air-dry',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Best action after using a board for raw chicken:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Wipe with a cloth',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Best action after using a board for raw chicken:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Rinse under cold water',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Best action after using a board for raw chicken:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Flip it over',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Best action after using a board for raw chicken:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m2_q5
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm2',
      'Which prevents cross-contamination most effectively?',
      'multiple_choice',
      'Dedicated separation is a primary barrier.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Separate raw/ready equipment',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Which prevents cross-contamination most effectively?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Using the same knife quickly',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Which prevents cross-contamination most effectively?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Stacking raw above ready in fridge',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Which prevents cross-contamination most effectively?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Air drying hands only',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Which prevents cross-contamination most effectively?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m2_q6
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm2',
      'Customer asks about celery in soup. You should:',
      'multiple_choice',
      'Always verify against current documented allergen info.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Check allergen matrix/label',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Customer asks about celery in soup. You should:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Assume itΓÇÖs not included',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Customer asks about celery in soup. You should:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Say you will find out tomorrow',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Customer asks about celery in soup. You should:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Guess based on taste',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm2'
        AND q.question_text = 'Customer asks about celery in soup. You should:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Questions for uk-l2-food-hygiene/m3 (pool: m3)

-- Question: m3_q1
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm3',
      'What is the difference between cleaning and disinfection?',
      'multiple_choice',
      'Cleaning removes debris; disinfection kills remaining bacteria.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Cleaning removes dirt; disinfection kills microorganisms.',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'What is the difference between cleaning and disinfection?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'They are the same process.',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'What is the difference between cleaning and disinfection?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Disinfection removes visible dirt.',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'What is the difference between cleaning and disinfection?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Cleaning uses heat, disinfection does not.',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'What is the difference between cleaning and disinfection?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m3_q2
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm3',
      'Which order correctly describes the cleaning cycle?',
      'multiple_choice',
      'The proper sequence ensures dirt removal before disinfection.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Rinse, Disinfect, Clean, Air dry',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Which order correctly describes the cleaning cycle?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Clean, Rinse, Disinfect, Air dry',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Which order correctly describes the cleaning cycle?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Disinfect, Rinse, Dry, Clean',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Which order correctly describes the cleaning cycle?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Clean, Air dry, Disinfect, Rinse',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Which order correctly describes the cleaning cycle?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m3_q3
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm3',
      'If a disinfectant requires 30 seconds contact time, what should you do?',
      'multiple_choice',
      'Allow the disinfectant to stay wet for its required time to kill bacteria.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Spray and wipe immediately.',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'If a disinfectant requires 30 seconds contact time, what should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Wait 30 seconds before wiping.',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'If a disinfectant requires 30 seconds contact time, what should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Leave for 5 minutes.',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'If a disinfectant requires 30 seconds contact time, what should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Rinse straight away.',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'If a disinfectant requires 30 seconds contact time, what should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m3_q4
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm3',
      'Which of the following prevent cross-contamination?',
      'multi_select',
      'Keep raw and ready areas separate and wash hands to prevent spread.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Separate boards for raw and ready foods',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Which of the following prevent cross-contamination?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Washing hands after handling raw meat',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Which of the following prevent cross-contamination?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Storing raw meat above cooked food',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Which of the following prevent cross-contamination?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Using the same cloth for all areas',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Which of the following prevent cross-contamination?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m3_q5
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm3',
      'Where should raw meat be stored in a fridge?',
      'multiple_choice',
      'Raw meat goes at the bottom to prevent drips contaminating ready-to-eat food.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Top shelf',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Where should raw meat be stored in a fridge?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Middle shelf',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Where should raw meat be stored in a fridge?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Bottom shelf',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Where should raw meat be stored in a fridge?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Anywhere ΓÇö it doesnΓÇÖt matter',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Where should raw meat be stored in a fridge?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m3_q6
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm3',
      'Why is air drying important after disinfection?',
      'multiple_choice',
      'Air drying prevents touching or wiping germs back onto a clean surface.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'It saves paper towels.',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Why is air drying important after disinfection?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'It allows disinfectant to continue working and avoids re-contamination.',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Why is air drying important after disinfection?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'It prevents corrosion of metal surfaces.',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Why is air drying important after disinfection?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'It makes the surface shiny.',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm3'
        AND q.question_text = 'Why is air drying important after disinfection?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Questions for uk-l2-food-hygiene/m4 (pool: m4)

-- Question: m4_q1
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm4',
      'What is the main purpose of personal hygiene in food handling?',
      'multiple_choice',
      'Hygiene controls the transfer of microbes from people to food.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'To keep staff comfortable',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'What is the main purpose of personal hygiene in food handling?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'To prevent microorganisms and contaminants reaching food',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'What is the main purpose of personal hygiene in food handling?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'To meet dress code rules',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'What is the main purpose of personal hygiene in food handling?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'To reduce laundry costs',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'What is the main purpose of personal hygiene in food handling?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m4_q2
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm4',
      'Choose the correct handwashing order.',
      'multiple_choice',
      'That is the six-step sequence shown in the training.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Soap, rinse, dry, rub palms',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Choose the correct handwashing order.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Wet, soap, rub, backs, between fingers, rinse and dry',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Choose the correct handwashing order.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Wet, rub, dry, soap',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Choose the correct handwashing order.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Soap, dry, rinse',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Choose the correct handwashing order.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m4_q3
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm4',
      'When must hands be washed? Select all that apply.',
      'multi_select',
      'Wash before RTE, after raw, and after any contamination risk like phones.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'After handling raw meat',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'When must hands be washed? Select all that apply.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Before handling ready-to-eat food',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'When must hands be washed? Select all that apply.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'After using a phone',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'When must hands be washed? Select all that apply.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Only at the start of the shift',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'When must hands be washed? Select all that apply.'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m4_q4
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm4',
      'Which statement about gloves is correct?',
      'multiple_choice',
      'Gloves are single-task and do not replace handwashing.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Gloves replace handwashing',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Which statement about gloves is correct?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Gloves must be changed between tasks and hands washed',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Which statement about gloves is correct?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Gloves can be worn all day',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Which statement about gloves is correct?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Gloves make food safe even if dirty',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Which statement about gloves is correct?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m4_q5
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm4',
      'What should you do if you have diarrhoea or vomiting?',
      'multiple_choice',
      'Exclusion for 48 hours is standard to prevent spread.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Work but avoid the kitchen',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'What should you do if you have diarrhoea or vomiting?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Wear two pairs of gloves',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'What should you do if you have diarrhoea or vomiting?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Report it and stay off for 48 hours after last symptom',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'What should you do if you have diarrhoea or vomiting?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Drink coffee and carry on',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'What should you do if you have diarrhoea or vomiting?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m4_q6
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm4',
      'Which PPE practice is correct?',
      'multiple_choice',
      'Aprons off for dirty tasks. Cuts must be covered with blue plasters.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Wear outdoor coats in prep if clean',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Which PPE practice is correct?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Reuse single-use gloves after washing them',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Which PPE practice is correct?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Remove aprons for bins and toilet, then replace',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Which PPE practice is correct?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Leave cuts uncovered if small',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm4'
        AND q.question_text = 'Which PPE practice is correct?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Questions for uk-l2-food-hygiene/m5 (pool: m5)

-- Question: m5_q1
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm5',
      'How many regulated allergens must be declared in the UK?',
      'multiple_choice',
      'UK law recognises 14 allergens for mandatory declaration.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '8',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'How many regulated allergens must be declared in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '12',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'How many regulated allergens must be declared in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '14',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'How many regulated allergens must be declared in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        '16',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'How many regulated allergens must be declared in the UK?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m5_q2
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm5',
      'Select all that are tree nuts:',
      'multi_select',
      'Almond and walnut are tree nuts. Sesame is a seed; pine nut is often treated as a seed in grouping.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Almond',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Select all that are tree nuts:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Sesame',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Select all that are tree nuts:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Pine nut',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Select all that are tree nuts:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Walnut',
        true,
        3
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Select all that are tree nuts:'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m5_q3
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm5',
      'A customer asks if a dish is nut-free and you are unsure. What should you do?',
      'multiple_choice',
      'Use verified information only; escalate if not sure.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Say yes if the recipe looks nut-free',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'A customer asks if a dish is nut-free and you are unsure. What should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Check the allergen matrix/spec and confirm or escalate',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'A customer asks if a dish is nut-free and you are unsure. What should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Ask a colleague for their opinion',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'A customer asks if a dish is nut-free and you are unsure. What should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Tell them it''s probably fine',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'A customer asks if a dish is nut-free and you are unsure. What should you do?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m5_q4
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm5',
      'What is allergen cross-contact?',
      'multiple_choice',
      'Cross-contact is trace transfer, dangerous for those allergic.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Allergens multiplying on food',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'What is allergen cross-contact?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'A safe food picking up traces of an allergen',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'What is allergen cross-contact?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'A cleaning chemical contacting food',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'What is allergen cross-contact?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'A food becoming unsafe for everyone',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'What is allergen cross-contact?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m5_q5
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm5',
      'Which controls reduce allergen cross-contact?',
      'multi_select',
      'Separation, cleaning and clear labelling are core controls.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Dedicated equipment for allergen-free prep',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Which controls reduce allergen cross-contact?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Cleaning between tasks',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Which controls reduce allergen cross-contact?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Guessing when busy',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Which controls reduce allergen cross-contact?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Clear labelling and storage',
        true,
        3
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Which controls reduce allergen cross-contact?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m5_q6
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm5',
      'Which is a regulated allergen group?',
      'multiple_choice',
      'Soya is one of the 14 regulated allergens.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Seeds (all)',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Which is a regulated allergen group?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Soya',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Which is a regulated allergen group?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Caffeine',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Which is a regulated allergen group?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Beef',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm5'
        AND q.question_text = 'Which is a regulated allergen group?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Questions for uk-l2-food-hygiene/m6 (pool: m6)

-- Question: m6_q1
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm6',
      'What is the purpose of a disinfectant?',
      'multiple_choice',
      'Disinfectants reduce microbes to a safe level after cleaning.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'To remove visible dirt and grease only',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'What is the purpose of a disinfectant?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'To reduce harmful microbes to a safe level',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'What is the purpose of a disinfectant?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'To make surfaces smell fresh',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'What is the purpose of a disinfectant?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'To rinse off detergent',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'What is the purpose of a disinfectant?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m6_q2
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm6',
      'Which sequence describes a two-stage clean?',
      'multiple_choice',
      'Stage one is clean and rinse; stage two is disinfect for the full contact time.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Apply disinfectant then dry with cloth',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Which sequence describes a two-stage clean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Rinse with water then disinfectant then dry',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Which sequence describes a two-stage clean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Detergent clean and rinse, then disinfect and leave for full contact time',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Which sequence describes a two-stage clean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Spray air freshener then wipe',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Which sequence describes a two-stage clean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m6_q3
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm6',
      'What does contact time mean?',
      'multiple_choice',
      'Contact time is how long the disinfectant must remain wet to work.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'How long staff spend cleaning per day',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'What does contact time mean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'How long the surface stays wet with disinfectant',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'What does contact time mean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'The time before food can touch the surface again',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'What does contact time mean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'The age of the chemical since opening',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'What does contact time mean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m6_q4
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm6',
      'Where should chemicals be stored?',
      'multiple_choice',
      'Chemicals are kept away from food in a controlled, labelled area.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'On the top shelf above food prep',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Where should chemicals be stored?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'In any cupboard if bottles are closed',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Where should chemicals be stored?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'In a designated area away from food with controls in place',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Where should chemicals be stored?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Next to ingredients for speed',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Where should chemicals be stored?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m6_q5
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm6',
      'Which is good waste practice?',
      'multiple_choice',
      'Keep bins lined, closed, and cleaned to control pests.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Leave lids open to reduce smells',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Which is good waste practice?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Empty only when overflowing',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Which is good waste practice?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Use liners and close lids, clean and disinfect bins daily',
        true,
        2
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Which is good waste practice?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Store waste next to ready-to-eat food',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm6'
        AND q.question_text = 'Which is good waste practice?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Questions for uk-l2-food-hygiene/m7 (pool: m7)

-- Question: m7_q1
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm7',
      'Which law forms the foundation of UK food safety?',
      'multiple_choice',
      'The Food Safety Act 1990 is the key UK food safety law.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Health and Safety at Work Act 1974',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'Which law forms the foundation of UK food safety?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Food Safety Act 1990',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'Which law forms the foundation of UK food safety?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Environmental Protection Act 1995',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'Which law forms the foundation of UK food safety?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Consumer Rights Act 2015',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'Which law forms the foundation of UK food safety?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m7_q2
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm7',
      'What does HACCP stand for?',
      'multiple_choice',
      'HACCP means Hazard Analysis and Critical Control Points.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Hazard Analysis and Critical Control Points',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What does HACCP stand for?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Health and Clean Cooking Procedures',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What does HACCP stand for?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Hazard Awareness and Cleaning Control Plan',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What does HACCP stand for?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Handling and Cooking Control Practices',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What does HACCP stand for?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m7_q3
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm7',
      'Which of the following is NOT one of the seven HACCP principles?',
      'multiple_choice',
      'Marketing is not part of HACCP; the other options are principles.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Identify hazards',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'Which of the following is NOT one of the seven HACCP principles?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Monitor CCPs',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'Which of the following is NOT one of the seven HACCP principles?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Take corrective action',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'Which of the following is NOT one of the seven HACCP principles?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Increase sales and marketing',
        true,
        3
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'Which of the following is NOT one of the seven HACCP principles?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m7_q4
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm7',
      'What does due diligence mean?',
      'multiple_choice',
      'Due diligence means taking all reasonable precautions and keeping evidence.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Taking reasonable steps to avoid offences',
        true,
        0
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What does due diligence mean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Delegating tasks to others',
        false,
        1
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What does due diligence mean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Relying on the EHO to spot issues',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What does due diligence mean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Avoiding record keeping',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What does due diligence mean?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

-- Question: m7_q5
INSERT INTO course_questions (
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
    )
SELECT 
      gen_random_uuid(),
      NULL, -- company_id (system default)
      (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1),
      'm7',
      'What is traceability in food safety?',
      'multiple_choice',
      'Traceability tracks food one step forward and one step back.',
      'medium',
      1,
      true,
      true,
      0
    WHERE EXISTS (SELECT 1 FROM training_courses WHERE code = 'FS-L2');

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Tracking the temperature of fridges',
        false,
        0
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What is traceability in food safety?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Tracking where food came from and where it goes',
        true,
        1
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What is traceability in food safety?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Checking expiry dates only',
        false,
        2
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What is traceability in food safety?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

INSERT INTO course_question_options (
        question_id,
        option_text,
        is_correct,
        sort_order
      )
SELECT 
        q.id,
        'Recording staff attendance',
        false,
        3
      FROM course_questions q
      WHERE q.module_id = 'm7'
        AND q.question_text = 'What is traceability in food safety?'
        AND q.course_id = (SELECT id FROM training_courses WHERE code = 'FS-L2' LIMIT 1)
      ORDER BY q.created_at DESC
      LIMIT 1;

    RAISE NOTICE 'Migrated questions from JSON files';

  ELSE
    RAISE NOTICE 'ΓÜá∩╕Å Required tables do not exist - skipping question migration';
  END IF;
END $$;
