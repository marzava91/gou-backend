// packages/api/src/modules/01-identity-and-access/02-auth/domain/rules/auth-account-resolution.rule.ts

export type ResolveSingleCandidateUserIdInput = {
  emailCandidateUserIds?: Iterable<string>;
  phoneCandidateUserIds?: Iterable<string>;
};

export type ResolveSingleCandidateUserIdResult =
  | {
      kind: 'resolved';
      userId: string;
      candidateUserIdsCount: 1;
      emailMatched: boolean;
      phoneMatched: boolean;
    }
  | {
      kind: 'conflict';
      candidateUserIdsCount: number;
      emailMatched: boolean;
      phoneMatched: boolean;
    }
  | null;

/**
 * Resolves a single canonical internal userId from verified candidate signals.
 *
 * Rules:
 * - If neither email nor phone yields candidates -> null
 * - If exactly one unique candidate is found -> resolved
 * - If multiple unique candidates are found -> conflict
 * - If email and phone each resolve but to different users -> conflict
 */
export function resolveSingleCandidateUserId(
  input: ResolveSingleCandidateUserIdInput,
): ResolveSingleCandidateUserIdResult {
  const emailIds = [...new Set(input.emailCandidateUserIds ?? [])];
  const phoneIds = [...new Set(input.phoneCandidateUserIds ?? [])];

  const emailMatched = emailIds.length > 0;
  const phoneMatched = phoneIds.length > 0;

  const allUniqueIds = [...new Set([...emailIds, ...phoneIds])];
  const candidateUserIdsCount = allUniqueIds.length;

  if (candidateUserIdsCount === 0) {
    return null;
  }

  if (candidateUserIdsCount === 1) {
    return {
      kind: 'resolved',
      userId: allUniqueIds[0],
      candidateUserIdsCount: 1,
      emailMatched,
      phoneMatched,
    };
  }

  return {
    kind: 'conflict',
    candidateUserIdsCount,
    emailMatched,
    phoneMatched,
  };
}
