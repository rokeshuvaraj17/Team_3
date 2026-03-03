export interface AutofillProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills?: string[];
}

/** Payload for table-based autofill from GET /api/autofill (user_autofill.data + custom_pairs, excluded_field_keys). */
export interface AutofillTablePayload {
  fields: Record<string, string>;
  excluded: string[];
  /** For AI semantic-match fallback (content script calls backend). */
  userId?: string;
  apiBase?: string;
  /** Resume text (e.g. from GET /api/resumes/:id/text) for AI to use when matching/filling. */
  resumeText?: string;
  /** Cover letter text (e.g. from GET /api/cover-letters/:id/text) for AI to use for message/cover fields. */
  coverLetterText?: string;
}

/** Payload for PDF-based autofill or shortcut. Shortcut sends no payload and content uses GET_PROFILE. */
export interface AutofillPayload {
  /** Table-based: merged data + custom_pairs from /api/autofill. When set, content uses applyAutofillEngine. */
  fields?: Record<string, string>;
  /** Keys to skip (from user_autofill.excluded_field_keys). */
  excluded?: string[];
  /** Extracted resume text (from GET /api/resumes/:id/text). When set with profile path, content parses it. */
  resumeText?: string;
  /** Extracted cover letter text (from GET /api/cover-letters/:id/text). */
  coverLetterText?: string;
  /** Pre-parsed profile (e.g. from GET_PROFILE shortcut). */
  profile?: AutofillProfile;
  resumeFileUrl?: string;
  coverLetterFileUrl?: string;
  skills?: string[];
}
