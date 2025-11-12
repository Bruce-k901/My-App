# Level 2 Food Hygiene Course Authoring

This folder contains the modular self-study content, schemas, and player components for the Level 2 Food Hygiene and Safety course.

## Structure

```
courses/uk-l2-food-hygiene/
  course.json                      # Course manifest (order of modules, version)
  README.md                        # Authoring guide
  components/                      # Reusable UI building blocks
  modules/
    m1/
      module.json                  # Module manifest (page order, quiz settings)
      pages.json                   # Array of page definitions
      media/                       # Local SVG/PNG assets referenced by pages
      m1.spec.ts                   # Tests for module content and flows
    m2/
      module.json
      pages.json
      quiz.json
      outcomes.json                # Learning outcome mapping
      blueprint.json               # Assessment coverage blueprint
      media/                       # Module 2 SVG/Lottie assets
      m2.spec.ts                   # Tests for module 2 content
  player/
    PlayerShell.tsx                # High-level player container
    Renderer.tsx                   # Maps Page types to components
    useAttemptStore.ts             # Zustand store for learner attempt state
    routes.md                      # Docs for player routes and navigation
  schemas/
    course.ts                      # Zod schema for course manifest
    module.ts                      # Zod schema for module manifest
    page.ts                        # Zod schema for individual pages
    quiz.ts                        # Zod schema for quiz pools
    outcomes.ts                    # Outcomes + mapping schema
    blueprint.ts                   # Assessment blueprint schema
    validate.ts                    # Helper for schema validation
    zod.ts                         # Re-export of zod library
```

## Authoring workflow

1. Duplicate an existing module folder (for example `modules/m1`) and rename it (`modules/m3`).
2. Update `module.json` with the new module ID, title, duration, page order, and quiz configuration.
3. Edit `pages.json` and add/remove entries using the schemas in `schemas/page.ts` as a reference (include `outcomes` where possible).
4. Place any SVG/PNG/Lottie assets referenced by the module into its `media/` folder.
5. Run `npm run lint` and `npm test` to ensure validation and tests continue to pass.
6. Refresh `/dev/course-preview?module=<moduleId>` to hot-load the JSON and confirm the module renders correctly.
7. Update `course.json` to include the new module entry in order.

### Quiz pools

- Each module can define a `quiz` section in `module.json`. Add the corresponding questions to `modules/<moduleId>/quiz.json`.
- Module 2 uses a structured `quiz.json` (`pool_id` + `items`). Parse with `quizSchema` to attach the items to the pool map.
- Question entries should follow the `Page` schema (`single_choice`, `multi_choice`, etc.). Provide rationales to help authors review intent.
- The `count` property in the manifest controls how many items are randomly drawn. Ensure the pool contains at least that many questions.

### Outcomes and blueprint

- Add `outcomes.json` to map every page/quiz to Level 2 learning outcomes (see `schemas/outcomes.ts`).
- Add `blueprint.json` to describe topic coverage and desired question counts (see `schemas/blueprint.ts`).
- These files are bundled into the payload metadata and surface on certificates/accreditation packs.

### Certificates

- When a learner completes a module, the latest payload is saved to `localStorage` under the key `selfstudy:l2-food-hygiene:last-payload`.
- The certificate view at `/training/courses/l2-food-hygiene/certificate` reads that payload and renders learner details, timestamps, scores, and covered outcomes.
- If no payload is present (the learner has not finished the course), the certificate page prompts them to complete the module first.

## Validation utilities

The schemas export TypeScript types and runtime validators. Use them in tests or data scripts:

```ts
import fs from "node:fs";
import { pagesSchema } from "../schemas/page";
import { safeParseOrThrow } from "../schemas/validate";

const pages = JSON.parse(fs.readFileSync("modules/m1/pages.json", "utf-8"));
const parsed = safeParseOrThrow(pagesSchema, pages, "modules/m1/pages.json");
```

## Module catalogue

- `m1` — Introduction and Legal Duties (foundations, due diligence)
- `m2` — Food Hazards & Contamination (hazard types, cross-contact, allergen scenario)

## Styling tokens

All components follow the Checkly glass aesthetic: dark surfaces, magenta accents (`#ec4899`), blue progress indicators, rounded `2xl` radii, and Manrope fonts inherited from the global theme.

## Testing guidance

- Module specs should cover page ordering, schema validation, quiz pools, outcomes, and blueprint presence.
- Player integration tests should assert autosave, scoring, payload submission, and metadata persistence.

Happy authoring!
