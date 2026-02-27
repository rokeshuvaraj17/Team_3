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
  skills?: string[];
}

export interface AutofillPayload {
  profile: AutofillProfile;
  resumeText?: string;
  coverLetterText?: string;
  coverLetterFileUrl?: string;
  skills?: string[];
}
