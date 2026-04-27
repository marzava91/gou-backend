// packages\api\src\modules\01-identity-and-access\02-auth\domain\rules\auth-verification-challenge-status-transition.rule.ts

import { AuthVerificationChallengeStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<
  AuthVerificationChallengeStatus,
  AuthVerificationChallengeStatus[]
> = {
  [AuthVerificationChallengeStatus.ISSUED]: [
    AuthVerificationChallengeStatus.VALIDATED,
    AuthVerificationChallengeStatus.CONSUMED,
    AuthVerificationChallengeStatus.FAILED,
    AuthVerificationChallengeStatus.EXPIRED,
  ],
  [AuthVerificationChallengeStatus.VALIDATED]: [
    AuthVerificationChallengeStatus.CONSUMED,
  ],
  [AuthVerificationChallengeStatus.FAILED]: [],
  [AuthVerificationChallengeStatus.EXPIRED]: [],
  [AuthVerificationChallengeStatus.CONSUMED]: [],
};

export function canTransitionAuthVerificationChallengeStatus(
  from: AuthVerificationChallengeStatus,
  to: AuthVerificationChallengeStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
