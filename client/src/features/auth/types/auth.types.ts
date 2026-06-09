import type { Session, User } from '@supabase/supabase-js';

export interface SignInPayload {
  email: string;
  password: string;
}

export type SignInResult =
  | {
      status: 'authenticated';
      session: Session;
      user: User;
    }
  | {
      status: 'email_verification_required';
      email: string;
    };