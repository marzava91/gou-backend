// packages\api\src\modules\01-identity-and-access\06-invitations\policies\invitation-access.policy.ts

import { Injectable } from '@nestjs/common';
import type { AuthenticatedInvitationActor } from '../domain/types/invitation.types';

@Injectable()
export class InvitationAccessPolicy {
  /**
   * Crear invitaciones
   */
  canCreateInvitation(
    actor: AuthenticatedInvitationActor | null | undefined,
  ): boolean {
    return !!actor?.isPlatformAdmin;
  }

  /**
   * Reenviar invitaciones
   */
  canResendInvitation(
    actor: AuthenticatedInvitationActor | null | undefined,
  ): boolean {
    return !!actor?.isPlatformAdmin;
  }

  /**
   * Revocar invitaciones (estado SENT → REVOKED)
   */
  canRevokeInvitation(
    actor: AuthenticatedInvitationActor | null | undefined,
  ): boolean {
    return !!actor?.isPlatformAdmin;
  }

  /**
   * Cancelar invitaciones (estado PROPOSED → CANCELED)
   */
  canCancelInvitation(
    actor: AuthenticatedInvitationActor | null | undefined,
  ): boolean {
    return !!actor?.isPlatformAdmin;
  }

  /**
   * Declinar invitación (acción del destinatario)
   * ⚠️ En MVP lo dejamos abierto (sin actor autenticado)
   */
  canDeclineInvitation(
    actor: AuthenticatedInvitationActor | null | undefined,
  ): boolean {
    // Puede ser público (token-based flow)
    return true;
  }

  /**
   * Aceptar invitación (flujo por token)
   * ⚠️ No depende del actor autenticado
   */
  canAcceptInvitation(): boolean {
    return true;
  }

  /**
   * Leer invitaciones (panel admin)
   */
  canReadInvitation(
    actor: AuthenticatedInvitationActor | null | undefined,
  ): boolean {
    return !!actor?.isPlatformAdmin;
  }
}