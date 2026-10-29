/**
 * Review author normalisation.
 *
 * Legacy/editorial reviews have no `userId` — they were written by the site
 * itself. Instead of inventing a fake account we expose a stable, honest
 * author shape so every card can render without null-checks.
 */
export type ReviewAuthor = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: 'USER' | 'ADMIN';
  bio?: string | null;
};

type AuthorFields = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  authorName?: string | null;
  editorial?: boolean | null;
};

export type Authored<T> = Omit<T, 'user' | 'editorial'> & { user: ReviewAuthor; editorial: boolean };

export function withAuthor<T extends { id: string }>(review: T & AuthorFields): Authored<T> {
  const editorial = Boolean(review.editorial);
  const existing = review.user;
  if (existing) {
    return {
      ...review,
      editorial,
      user: { ...existing, role: (existing.role ?? 'USER') as ReviewAuthor['role'] }
    } as Authored<T>;
  }
  const name = review.authorName?.trim() || 'CINE·MOOD Editorial';
  return {
    ...review,
    editorial,
    user: {
      id: `editorial:${review.id}`,
      name,
      // deterministic seed — never surfaced, only used for avatar gradients
      email: 'editorial@cinemood.app',
      image: null,
      role: (editorial ? 'ADMIN' : 'USER') as ReviewAuthor['role']
    }
  } as Authored<T>;
}

export const withAuthors = <T extends { id: string }>(rows: (T & AuthorFields)[]): Authored<T>[] => rows.map(withAuthor);
