Self-study Course Package: Level 2 Food Hygiene (UK)
Version: selfstudy-1.0 (2025-11-07)

Includes
- course_manifest.json: ordered flow from onboarding to completion
- pages/: JSON for each page type (content, interaction, quiz, final_quiz, completion)
- schemas/schemas.json: learner_profile and result_payload shapes
- media/: SVG placeholders
- demo/index.html: view the flow locally without a server

Integration
1. Render onboarding and store learner fields.
2. Iterate manifest.flow, render each JSON page by type.
3. For module quizzes, use your real bank or the inline pool in demo to assemble 5 items per module.
4. Build a result payload matching schemas.result_payload and POST it to your training matrix endpoint.