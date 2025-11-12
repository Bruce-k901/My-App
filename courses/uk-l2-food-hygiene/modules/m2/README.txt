
Module 2 — Food Hazards & Contamination (Content + Assets)
Version: 2025-11-07

Included
- courses/uk-l2-food-hygiene/modules/m2/module.json — module manifest
- courses/uk-l2-food-hygiene/modules/m2/pages.json — content/interaction/scenario/recap/quiz_ref
- courses/uk-l2-food-hygiene/modules/m2/quiz_m2.json — question bank with rationales
- courses/uk-l2-food-hygiene/modules/m2/media/*.svg — 5 SVG visuals
- courses/uk-l2-food-hygiene/modules/m2/media/lottie/*.json — 4 Lottie placeholders
- schemas/outcomes_m2.json — outcomes and mapping
- schemas/blueprint_m2.json — assessment blueprint
- components/props.d.ts — component prop definitions

Integration
1) Place 'courses' folder under your public assets or CDN.
2) Adapter: point quiz loader at quiz_m2.json (pool 'm2').
3) Renderer: support 'branch' page type with two options and result feedback.
4) Outcomes: record page_id to outcomes using schemas/outcomes_m2.json.

