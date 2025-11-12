# Training Course Routes

- `/training/courses/l2-food-hygiene/start`
  - Loads the unified player shell, onboarding, and modules.
  - Reads manifests from `courses/uk-l2-food-hygiene/course.json` and module folders.
  - Persists attempt state to `localStorage` and submits to the training matrix ingest API on completion.

- `/dev/course-preview?module=<moduleId>`
  - Developer preview for authoring. Hot-loads the requested `modules/<moduleId>/pages.json` and renders using the renderer component without scoring or persistence.

API endpoints

- `POST /api/training-matrix/ingest`
  - Receives attempt payloads matching the documented schema.
  - Currently returns `{ ok: true }` until database integration is complete.
