# Autofill Form Fields — Page, API & Database

## Page URL

- **Web app:** `http://localhost:5173/app/autofill-form-fields`
- **Route:** `/app/autofill-form-fields` (React Router)
- **Component:** `frontend/src/pages/AutofillFormFieldsPage.tsx`

---

## Purpose

This page lets users **manage the values used to auto-fill job application forms** (e.g. on company career sites, Workday, Greenhouse, Lever). Data is merged with the user’s **Profile** on the server; users can edit any field and choose **which fields the autofill (e.g. Chrome extension) is allowed to fill**.

---

## What the page does

1. **Loads autofill data**  
   On mount, it calls `GET /api/autofill` (with `x-user-id`). The response includes:
   - `data` — key/value map of all autofill fields (pre-filled from profile + stored overrides)
   - `excluded_field_keys` — list of field keys that autofill must **not** fill
   - `from_profile` — list of keys that currently come from the user’s profile (shown as “(from profile)” in the UI)
   - `custom_pairs` — user-defined key/value pairs for custom or site-specific form fields

2. **Renders a form** with sections:
   - **Personal & contact:** first/middle/last name, suffix, full name, preferred name, pronouns, email(s), phone(s), DOB, age, place of birth, citizenship, nationality, LinkedIn/website/portfolio/GitHub/Twitter URLs
   - **Address:** line 1 & 2, city, state, ZIP, country
   - **Professional:** headline, current job title, company, years of experience, job type preference, summary
   - **Work authorization & EEO (voluntary):** work authorization, sponsorship, veteran/disability/race/gender (optional)
   - **Salary:** min/max expectation, type (annual/hourly), currency
   - **Education:** highest degree, university, graduation year, major, GPA, second degree/major
   - **Application preferences:** how did you hear, referral name, desired start date, willing to relocate/travel, notice period, cover letter note, emergency contact, driver license, security clearance, SSN last 4

3. **Custom key/value pairs**  
   Users can add arbitrary “key” (e.g. field name or ID) and “value” pairs. These are used by autofill when it finds a matching field on a job application page.

4. **Autofill settings (modal)**  
   “Choose which fields autofill can fill”: checkboxes for every standard field. **Unchecked** = field key is added to `excluded_field_keys` so autofill will skip it.

5. **Save**  
   Submits `PUT /api/autofill` with `data`, `excluded_field_keys`, and `custom_pairs`. Backend upserts into the database and returns merged `data` and `from_profile`.

---

## Database storage

### Table: `public.user_autofill`

| Column               | Type      | Description |
|----------------------|-----------|-------------|
| `id`                 | uuid      | Primary key (default `gen_random_uuid()`) |
| `user_id`            | uuid      | FK to `public.users(id)` ON DELETE CASCADE; **unique** (one row per user) |
| `data`               | jsonb     | Object: field key → string value. Keys are from a fixed set (e.g. `first_name`, `last_name`, `email`, `phone`, `linkedin_url`, `city`, `state`, `zip_code`, `country`, …). Default `'{}'`. |
| `excluded_field_keys`| jsonb     | Array of field keys that autofill must **not** fill (e.g. `["ssn_last4","salary_expectation_min"]`). Default `'[]'`. |
| `created_at`         | timestamptz | Set on insert |
| `updated_at`         | timestamptz | Set on insert/update |

- **Upsert:** backend uses `INSERT ... ON CONFLICT (user_id) DO UPDATE` so each user has exactly one row.

### Table: `public.user_autofill_custom_fields`

| Column         | Type      | Description |
|----------------|-----------|-------------|
| `id`           | uuid      | Primary key |
| `user_id`      | uuid      | FK to `public.users(id)` ON DELETE CASCADE |
| `field_key`    | text      | User-defined key (e.g. `custom_question_1`, or a form field name/ID from a job site) |
| `field_value`  | text      | Value to fill when autofill finds a matching field |
| `display_order`| int       | Order when listing (0, 1, 2, …) |
| `created_at`   | timestamptz | |
| `updated_at`   | timestamptz | |

- **Replace on save:** on `PUT /api/autofill`, the backend deletes all existing `user_autofill_custom_fields` for the user and re-inserts from the request’s `custom_pairs` (up to 100, with `field_key` trimmed to 200 chars and `field_value` to 2000).

---

## API

### GET `/api/autofill`

- **Headers:** `x-user-id: <uuid>` (required).
- **Response (200):**
  - `data`: merged key/value map (profile + stored autofill overrides). Keys are from the fixed autofill field set.
  - `excluded_field_keys`: string[].
  - `from_profile`: string[] (keys whose value came from profile when no override was stored).
  - `custom_pairs`: `{ id?, field_key, field_value }[]`.

Backend loads: `users.email`, `user_profiles` (display_name, headline, summary, location, state, phone, website_url, linkedin_url, etc.), `user_autofill` (data, excluded_field_keys), `user_autofill_custom_fields`. It merges profile into a full `data` object and marks which keys came from profile in `from_profile`.

### PUT `/api/autofill`

- **Headers:** `Content-Type: application/json`, `x-user-id: <uuid>`.
- **Body:**
  - `data`: object (only allowed keys from the fixed list are stored).
  - `excluded_field_keys`: string[] (only allowed keys are stored).
  - `custom_pairs`: `{ field_key: string, field_value: string }[]` (trimmed and length-limited).
- **Response (200):** same shape as GET (`data`, `excluded_field_keys`, `from_profile`, `custom_pairs`) after save.

---

## Fixed field keys (allowed in `data` and `excluded_field_keys`)

Defined in backend `AUTOFILL_FIELD_KEYS` and frontend `AUTOFILL_FIELD_KEYS` / `FIELD_META`:

- Personal: `first_name`, `middle_name`, `last_name`, `suffix`, `full_name`, `preferred_name`, `pronouns`, `email`, `phone`, `phone_alt`, `email_alt`, `date_of_birth`, `age`, `place_of_birth`, `citizenship_country`, `nationality`
- Links: `linkedin_url`, `website_url`, `portfolio_url`, `github_url`, `twitter_url`
- Address: `address_line1`, `address_line2`, `city`, `state`, `zip_code`, `country`
- Professional: `headline`, `summary`, `current_job_title`, `current_company`, `years_of_experience`, `job_type_preference`
- EEO: `work_authorization`, `requires_sponsorship`, `veteran_status`, `disability_status`, `race_ethnicity`, `gender`
- Salary: `salary_expectation_min`, `salary_expectation_max`, `salary_type`, `salary_currency`
- Education: `highest_degree`, `university_name`, `graduation_year`, `major_field`, `gpa`, `second_degree`, `second_major`
- Application: `how_did_you_hear`, `referral_employee_name`, `desired_start_date`, `willing_to_relocate`, `willing_to_travel`, `notice_period`, `cover_letter_note`, `emergency_contact_name`, `emergency_contact_phone`, `driver_license_number`, `security_clearance`, `ssn_last4`

---

## Relation to Chrome extension autofill

- The **extension** can use profile + stored autofill in two ways:
  1. **Shortcut (Ctrl+Shift+F):** background script returns profile from `GET /api/profile`; that profile is used to fill fields on the page.
  2. **PDF-based flow:** user selects a resume/cover letter in the extension; backend returns extracted text; content script parses resume text into a profile and fills fields. Optionally the extension could also call `GET /api/autofill` to get this structured data and use it for filling (e.g. to respect `excluded_field_keys` and use `custom_pairs`).

- The **web page** at `/app/autofill-form-fields` is the place where users **edit and persist** the structured autofill data and exclusions that can be consumed by the extension or any other client that calls `GET /api/autofill`.

---

## Migrations

- `backend/migrations/create_autofill.sql` — creates `user_autofill`.
- `backend/migrations/create_autofill_custom_fields.sql` — creates `user_autofill_custom_fields`.

Run these so the tables exist before using the page or the API.

---

## Copy-paste description for ChatGPT

Use the block below as context when asking ChatGPT about this feature (e.g. “How does autofill work?”, “What is stored in the DB for autofill?”, “Add a new autofill field”).

```text
AUTOFILL FORM FIELDS (page and database)

- Page: http://localhost:5173/app/autofill-form-fields. Route: /app/autofill-form-fields. React component: AutofillFormFieldsPage.tsx.

- Purpose: Users manage the values used to auto-fill job application forms (e.g. on company career sites). Data is merged with the user's Profile on the server. Users can edit every field and choose which fields the autofill (e.g. Chrome extension) must NOT fill.

- Database:
  - user_autofill: one row per user (user_id unique). Columns: user_id (FK users), data (jsonb, key→value for field keys like first_name, last_name, email, phone, linkedin_url, city, state, zip_code, country, salary_expectation_min, etc.), excluded_field_keys (jsonb array of keys to exclude from autofill), created_at, updated_at.
  - user_autofill_custom_fields: per-user list of custom key/value pairs (field_key, field_value, display_order) for site-specific or one-off form fields. Replaced entirely on each save.

- API:
  - GET /api/autofill (header x-user-id): returns data (merged from profile + user_autofill.data), excluded_field_keys, from_profile (keys that came from profile), custom_pairs (from user_autofill_custom_fields).
  - PUT /api/autofill (header x-user-id, body: data, excluded_field_keys, custom_pairs): upserts user_autofill, replaces user_autofill_custom_fields, returns same shape as GET.

- Fixed field keys (allowed in data and excluded_field_keys) include: first_name, middle_name, last_name, suffix, full_name, preferred_name, pronouns, email, email_alt, phone, phone_alt, date_of_birth, age, place_of_birth, citizenship_country, nationality, linkedin_url, website_url, portfolio_url, github_url, twitter_url, address_line1, address_line2, city, state, zip_code, country, headline, summary, current_job_title, current_company, years_of_experience, job_type_preference, work_authorization, requires_sponsorship, veteran_status, disability_status, race_ethnicity, gender, salary_expectation_min/max, salary_type, salary_currency, highest_degree, university_name, graduation_year, major_field, gpa, second_degree, second_major, how_did_you_hear, referral_employee_name, desired_start_date, willing_to_relocate, willing_to_travel, notice_period, cover_letter_note, emergency_contact_name/phone, driver_license_number, security_clearance, ssn_last4.

- UI: Form sections (Personal & contact, Address, Professional, EEO, Salary, Education, Application preferences), custom key/value pairs section, and a settings modal to check/uncheck which fields autofill is allowed to fill (unchecked = key in excluded_field_keys). Save sends PUT and refreshes state from response.
```
