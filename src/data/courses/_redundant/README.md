# Redundant course assets

Assets in this folder are **no longer used** and must not be referenced by the app.

## `level2-food-safety-REDUNDANT.json`

- **Legacy id:** `uk-l2-food-safety-v3`
- **Reason:** Original food safety stub; empty lessons, never fully built.
- **Canonical replacement:** Food Safety now uses the **Learn** flow:
  - **URL:** `/learn/uk-l2-food-safety`
  - **Source:** `src/data/courses/level2-food-safety.json` (CourseLayout v3)
- **Nav:** All course links point to Learn. Old learn stub, PlayerShell, and selfstudy URLs redirect → `/learn/uk-l2-food-safety`.

Do not import or use this file. Historical reference only.

---

## PlayerShell & V1 selfstudy (food hygiene)

- **PlayerShell:** `courses/uk-l2-food-hygiene` (Match each duty, m1–m7, etc.). Served at `/training/courses/l2-food-hygiene/start` — **redirects** → `/learn/uk-l2-food-safety`. No longer presented.
- **Selfstudy:** `public/selfstudy/uk-l2-food-hygiene/uk_l2_food_hygiene_selfstudy_v1_0`. **Redirects** → `/learn/uk-l2-food-safety`. `SelfStudyPlayer` is deprecated; no routes render it.
