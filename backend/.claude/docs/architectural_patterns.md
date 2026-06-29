# Architectural Patterns

## MVC + Service Layer

```
Routes (middleware composition) -> Controllers (validation, orchestration) -> Models (DB queries)
                                       |
                                   Services (external APIs, LLM, Cloudinary)
```

## File Naming Convention

- `entity.controller.js`, `entity.model.js`, `entity.routes.js`, `serviceName.service.js`
- Database: snake_case tables/columns (`user_profiles`, `is_primary`, `created_at`)
- Functions: camelCase (`getByUserId`, `listByUserId`, `createUser`)

## Middleware Composition (per-route)

Middleware is stacked per-route, not globally. Applied left-to-right:

```js
router.post('/path', auth, requireDb, uploadFile.single('field'), controller.action)
```

Key middleware:
- `auth` (`src/middleware/auth.js`) - extracts `x-user-id` header, sets `req.userId`, returns 401 if missing
- `requireDb` (`src/middleware/requireDb.js`) - checks DB pool is initialized, returns 503 if not
- `upload*` (`src/middleware/upload.js`) - three multer configs: `uploadPhoto` (5MB images), `uploadResume` (10MB PDF/DOC), `uploadCoverLetter` (5MB)

## Controller Pattern

Every controller follows this structure (see `src/controllers/profile.controller.js` for canonical example):

1. **Extract & coerce input:** `typeof body.field === 'string' ? body.field.trim() : null`
2. **Validate:** early return with 400 on bad input
3. **Call model** for DB operations
4. **Call service** for external integrations
5. **Return response** with appropriate status code

Error handling wraps DB calls:
```js
try {
  const result = await model.operation(...)
  res.json(result)
} catch (err) {
  const { status, body } = handleDbError(err, 'ContextName')
  return res.status(status).json(body)
}
```

## Model Pattern

Models are pure DB functions - no business logic, no request/response objects.

- Export individual async functions (not classes)
- All queries use parameterized `$1, $2` syntax (SQL injection prevention)
- Return `rows[0]` for single results, `rows` for lists, `null` for not found
- Ownership verification before mutations: `WHERE id = $1 AND user_id = $2`
- Upsert pattern: `INSERT ... ON CONFLICT (user_id) DO UPDATE SET ... RETURNING *`

## Error Handling

Standard error response: `{ error: "Human-readable message" }`

`handleDbError(err, context)` in `src/middleware/errorHandler.js` maps:
- PG code `23505` (unique violation) -> 409
- PG code `23503` (FK violation) -> 400
- PG code `42703` (undefined column) -> handled for backward compat
- Connection errors (ENOTFOUND, ECONNREFUSED) -> 503

Global error middleware in `src/app.js:67` catches unhandled errors.

## Authentication

Two patterns coexist:

1. **Middleware-protected routes:** `auth` middleware required, `req.userId` available
2. **Self-contained auth in controllers:** AI endpoints check `x-user-id` inside the handler, allowing optional auth

No JWT/sessions. Stateless header-based auth with `x-user-id`.

## Service Layer

Services encapsulate external integrations and return plain data:

- `src/services/ai.service.js` - Multi-provider LLM calls with fallback chain (user key -> custom URL -> Gemini)
- `src/services/jobSearch.service.js` - 4 job APIs (Adzuna, Jooble, Arbeitnow, Reed), all return `{ data, error, status }`
- `src/services/cloudinary.service.js` - Stream-based uploads, returns URL

## Dependency Injection Style

Function parameters over global state:
- Models receive `userId` as parameter (not from request)
- Services receive API keys as parameters (not from env directly in most cases)
- Controllers bridge: extract from `req`, pass to models/services

## API Response Conventions

- `res.status(201).json(object)` for creation
- `res.json(object)` for reads/updates
- `{ success: true, message: "...", data: ... }` for some AI endpoints
- `{ error: "..." }` for all errors

## CORS

Configured in `src/app.js:35-46`. Allows:
- Default localhost ports (5173, 5174, 3000, 4173)
- `ALLOWED_ORIGINS` env var (comma-separated)
- All `chrome-extension://` origins (browser extension support)
- All `https://` origins
