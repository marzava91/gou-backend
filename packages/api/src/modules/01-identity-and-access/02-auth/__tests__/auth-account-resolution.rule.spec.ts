// packages/api/src/modules/01-identity-and-access/02-auth/__tests__/auth-account-resolution.rule.spec.ts

import { resolveSingleCandidateUserId } from '../domain/rules/auth-account-resolution.rule';

describe('resolveSingleCandidateUserId', () => {
  it('returns null when no candidates exist', () => {
    expect(
      resolveSingleCandidateUserId({
        emailCandidateUserIds: [],
        phoneCandidateUserIds: [],
      }),
    ).toBeNull();
  });

  it('resolves when only email yields one user', () => {
    expect(
      resolveSingleCandidateUserId({
        emailCandidateUserIds: ['user-1'],
        phoneCandidateUserIds: [],
      }),
    ).toEqual({
      kind: 'resolved',
      userId: 'user-1',
      candidateUserIdsCount: 1,
      emailMatched: true,
      phoneMatched: false,
    });
  });

  it('resolves when email and phone point to the same user', () => {
    expect(
      resolveSingleCandidateUserId({
        emailCandidateUserIds: ['user-1'],
        phoneCandidateUserIds: ['user-1'],
      }),
    ).toEqual({
      kind: 'resolved',
      userId: 'user-1',
      candidateUserIdsCount: 1,
      emailMatched: true,
      phoneMatched: true,
    });
  });

  it('returns conflict when email resolves to multiple users', () => {
    expect(
      resolveSingleCandidateUserId({
        emailCandidateUserIds: ['user-1', 'user-2'],
        phoneCandidateUserIds: [],
      }),
    ).toEqual({
      kind: 'conflict',
      candidateUserIdsCount: 2,
      emailMatched: true,
      phoneMatched: false,
    });
  });

  it('returns conflict when email and phone resolve to different users', () => {
    expect(
      resolveSingleCandidateUserId({
        emailCandidateUserIds: ['user-1'],
        phoneCandidateUserIds: ['user-2'],
      }),
    ).toEqual({
      kind: 'conflict',
      candidateUserIdsCount: 2,
      emailMatched: true,
      phoneMatched: true,
    });
  });
});
