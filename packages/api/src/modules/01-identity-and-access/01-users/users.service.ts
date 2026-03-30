// packages\api\src\modules\01-identity-and-access\01-users\users.service.ts

import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  User,
  UserContactChangeStatus,
  UserContactChangeType,
  UserStatus,
} from '@prisma/client';

import { canTransitionUserStatus } from './domain/rules/user-status-transition.rule';
import {
  ContactVerificationRequiredError,
  DuplicatePrimaryEmailError,
  DuplicatePrimaryPhoneError,
  EmptyUserProfileUpdateError,
  InvalidUserStatusTransitionError,
  NewPrimaryEmailMatchesCurrentError,
  NewPrimaryPhoneMatchesCurrentError,
  UserAlreadyActiveError,
  UserAlreadyAnonymizedError,
  UserAlreadyDeactivatedError,
  UserAlreadySuspendedError,
  UserConcurrentModificationError,
  UserNotFoundError,
} from './domain/errors/user.errors';

import { UserDomainEvents } from './domain/events/user.events';
import {
  USER_AUDIT_ACTIONS,
  USER_DEFAULTS,
  UserAuditAction,
} from './domain/constants/users.constants';

import { UsersRepository } from './users.repository';
import { UserContactChangeRequestsRepository } from './repositories/user-contact-change-requests.repository';

import { CreateUserDto } from './dto/commands/create-user.dto';
import { UpdateUserProfileDto } from './dto/commands/update-user-profile.dto';
import { SuspendUserDto } from './dto/commands/suspend-user.dto';
import { ReactivateUserDto } from './dto/commands/reactivate-user.dto';
import { DeactivateUserDto } from './dto/commands/deactivate-user.dto';
import { AnonymizeUserDto } from './dto/commands/anonymize-user.dto';
import { RequestPrimaryEmailChangeDto } from './dto/commands/request-primary-email-change.dto';
import { ConfirmPrimaryEmailChangeDto } from './dto/commands/confirm-primary-email-change.dto';
import { RequestPrimaryPhoneChangeDto } from './dto/commands/request-primary-phone-change.dto';
import { ConfirmPrimaryPhoneChangeDto } from './dto/commands/confirm-primary-phone-change.dto';
import { ListUsersQueryDto } from './dto/queries/list-users-query.dto';

import { UserResponseMapper } from './mappers/user-response.mapper';

import { USER_AUDIT_PORT } from './ports/user-audit.port';
import type { UserAuditPort } from './ports/user-audit.port';
import { USER_EVENTS_PORT } from './ports/user-events.port';
import type { UserEventsPort } from './ports/user-events.port';
import { USER_CONTACT_VERIFICATION_PORT } from './ports/user-contact-verification.port';
import type { UserContactVerificationPort } from './ports/user-contact-verification.port';

import {
  assertAtLeastOneContact,
  assertEmailOperationalConstraints,
  assertValidE164Phone,
  normalizeEmail,
  normalizePhone,
} from './validators/user-contact.validator';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userContactChangeRequestsRepository: UserContactChangeRequestsRepository,

    @Inject(USER_AUDIT_PORT)
    private readonly userAuditPort: UserAuditPort,

    @Inject(USER_EVENTS_PORT)
    private readonly userEventsPort: UserEventsPort,

    @Inject(USER_CONTACT_VERIFICATION_PORT)
    private readonly userContactVerificationPort: UserContactVerificationPort,
  ) {}


  async createUser(dto: CreateUserDto, actorUserId?: string) {
    assertAtLeastOneContact(dto);

    const normalizedPrimaryEmail = dto.primaryEmail
      ? this.normalizeAndValidateEmail(dto.primaryEmail)
      : null;

    const normalizedPrimaryPhone = dto.primaryPhone
      ? this.normalizeAndValidatePhone(dto.primaryPhone)
      : null;

    if (normalizedPrimaryEmail) {
      const existingByEmail =
        await this.usersRepository.findByPrimaryEmail(normalizedPrimaryEmail);
      if (existingByEmail) throw new DuplicatePrimaryEmailError();
    }

    if (normalizedPrimaryPhone) {
      const existingByPhone =
        await this.usersRepository.findByPrimaryPhone(normalizedPrimaryPhone);
      if (existingByPhone) throw new DuplicatePrimaryPhoneError();
    }

    let created: User;

    try {
      created = await this.usersRepository.create({
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        displayName: dto.displayName ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        primaryEmail: normalizedPrimaryEmail,
        primaryPhone: normalizedPrimaryPhone,
        emailVerified: false,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
      });
    } catch (error) {
      this.mapUserUniqueConstraintError(error);
      throw error;
    }

    await this.recordAudit(
      USER_AUDIT_ACTIONS.CREATE,
      created.id,
      actorUserId ?? null,
      {
        primaryEmail: created.primaryEmail,
        primaryPhone: created.primaryPhone,
      },
    );

    await this.userEventsPort.publish(UserDomainEvents.USER_CREATED, {
      userId: created.id,
      status: created.status,
    });

    return UserResponseMapper.toResponse(created);
  }

  async getUserById(id: string) {
    const user = await this.getRequiredUser(id);
    return UserResponseMapper.toResponse(user);
  }

  async getCurrentProfile(currentUserId: string) {
    return this.getUserById(currentUserId);
  }

  async listUsers(query: ListUsersQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const result = await this.usersRepository.list({
      q: query.q,
      status: query.status,
      emailVerified: query.emailVerified,
      phoneVerified: query.phoneVerified,
      createdFrom: query.createdFrom
        ? this.toStartOfDay(query.createdFrom)
        : undefined,
      createdTo: query.createdTo
        ? this.toEndOfDay(query.createdTo)
        : undefined,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      skip,
      take: query.limit,
    });

    return {
      items: result.items.map(UserResponseMapper.toSummary),
      page: query.page,
      limit: query.limit,
      total: result.total,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateUserProfileDto,
    actorUserId?: string,
  ) {
    if (!this.hasProfileUpdateFields(dto)) {
      throw new EmptyUserProfileUpdateError();
    }

    const user = await this.getRequiredUser(userId);
    this.assertUserNotAnonymized(user);

    const updated = await this.usersRepository.updateByIdAndVersion(
      userId,
      user.version,
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
      },
    );

    if (!updated) {
      throw new UserConcurrentModificationError();
    }

    await this.recordAudit(
      USER_AUDIT_ACTIONS.PROFILE_UPDATE,
      userId,
      actorUserId ?? userId,
      { updatedFields: this.buildUpdatedFields(dto) },
    );

    await this.userEventsPort.publish(UserDomainEvents.USER_PROFILE_UPDATED, {
      userId,
    });

    return UserResponseMapper.toResponse(updated);
  }

  async suspendUser(
    userId: string,
    dto: SuspendUserDto,
    actorUserId?: string,
  ) {
    const user = await this.getRequiredUser(userId);

    if (user.status === UserStatus.SUSPENDED) {
      throw new UserAlreadySuspendedError();
    }

    this.assertTransitionAllowed(user.status, UserStatus.SUSPENDED);

    const updated = await this.usersRepository.updateByIdAndVersion(
      userId,
      user.version,
      {
        status: UserStatus.SUSPENDED,
      },
    );

    if (!updated) {
      throw new UserConcurrentModificationError();
    }

    await this.recordAudit(
      USER_AUDIT_ACTIONS.SUSPEND,
      userId,
      actorUserId ?? null,
      { reason: dto.reason ?? null },
    );

    await this.userEventsPort.publish(UserDomainEvents.USER_SUSPENDED, {
      userId,
      status: updated.status,
    });

    return UserResponseMapper.toResponse(updated);
  }

  async reactivateUser(
    userId: string,
    dto: ReactivateUserDto,
    actorUserId?: string,
  ) {
    const user = await this.getRequiredUser(userId);

    if (user.status === UserStatus.ACTIVE) {
      throw new UserAlreadyActiveError();
    }

    this.assertTransitionAllowed(user.status, UserStatus.ACTIVE);

    const updated = await this.usersRepository.updateByIdAndVersion(
      userId,
      user.version,
      {
        status: UserStatus.ACTIVE,
      },
    );

    if (!updated) {
      throw new UserConcurrentModificationError();
    }

    await this.recordAudit(
      USER_AUDIT_ACTIONS.REACTIVATE,
      userId,
      actorUserId ?? null,
      { reason: dto.reason ?? null },
    );

    await this.userEventsPort.publish(UserDomainEvents.USER_REACTIVATED, {
      userId,
      status: updated.status,
    });

    return UserResponseMapper.toResponse(updated);
  }

  async deactivateUser(
    userId: string,
    dto: DeactivateUserDto,
    actorUserId?: string,
  ) {
    const user = await this.getRequiredUser(userId);

    if (user.status === UserStatus.DEACTIVATED) {
      throw new UserAlreadyDeactivatedError();
    }

    this.assertTransitionAllowed(user.status, UserStatus.DEACTIVATED);

    const updated = await this.usersRepository.updateByIdAndVersion(
      userId,
      user.version,
      {
        status: UserStatus.DEACTIVATED,
        deactivatedAt: new Date(),
      },
    );

    if (!updated) {
      throw new UserConcurrentModificationError();
    }

    await this.recordAudit(
      USER_AUDIT_ACTIONS.DEACTIVATE,
      userId,
      actorUserId ?? null,
      { reason: dto.reason ?? null },
    );

    await this.userEventsPort.publish(UserDomainEvents.USER_DEACTIVATED, {
      userId,
      status: updated.status,
      deactivatedAt: updated.deactivatedAt,
    });

    return UserResponseMapper.toResponse(updated);
  }

  async anonymizeUser(
    userId: string,
    dto: AnonymizeUserDto,
    actorUserId?: string,
  ) {
    const user = await this.getRequiredUser(userId);

    if (user.status === UserStatus.ANONYMIZED) {
      throw new UserAlreadyAnonymizedError();
    }

    this.assertTransitionAllowed(user.status, UserStatus.ANONYMIZED);

    const updated = await this.usersRepository.updateByIdAndVersion(
      userId,
      user.version,
      {
        status: UserStatus.ANONYMIZED,
        anonymizedAt: new Date(),
        firstName: null,
        lastName: null,
        displayName: USER_DEFAULTS.ANONYMIZED_DISPLAY_NAME,
        avatarUrl: null,
        primaryEmail: null,
        primaryPhone: null,
        emailVerified: false,
        phoneVerified: false,
      },
    );

    if (!updated) {
      throw new UserConcurrentModificationError();
    }

    await this.recordAudit(
      USER_AUDIT_ACTIONS.ANONYMIZE,
      userId,
      actorUserId ?? null,
      { reason: dto.reason ?? null },
    );

    await this.userEventsPort.publish(UserDomainEvents.USER_ANONYMIZED, {
      userId,
      status: updated.status,
      anonymizedAt: updated.anonymizedAt,
    });

    return UserResponseMapper.toResponse(updated);
  }

  async requestPrimaryEmailChange(
    userId: string,
    dto: RequestPrimaryEmailChangeDto,
    actorUserId?: string,
  ) {
    return this.requestPrimaryContactChange({
      userId,
      actorUserId,
      type: UserContactChangeType.PRIMARY_EMAIL,
      rawValue: dto.newPrimaryEmail,
    });
  }

  async confirmPrimaryEmailChange(
    userId: string,
    dto: ConfirmPrimaryEmailChangeDto,
    actorUserId?: string,
  ) {
    return this.confirmPrimaryContactChange({
      userId,
      actorUserId,
      type: UserContactChangeType.PRIMARY_EMAIL,
      verificationToken: dto.verificationToken,
    });
  }

  async requestPrimaryPhoneChange(
    userId: string,
    dto: RequestPrimaryPhoneChangeDto,
    actorUserId?: string,
  ) {
    return this.requestPrimaryContactChange({
      userId,
      actorUserId,
      type: UserContactChangeType.PRIMARY_PHONE,
      rawValue: dto.newPrimaryPhone,
    });
  }

  async confirmPrimaryPhoneChange(
    userId: string,
    dto: ConfirmPrimaryPhoneChangeDto,
    actorUserId?: string,
  ) {
    return this.confirmPrimaryContactChange({
      userId,
      actorUserId,
      type: UserContactChangeType.PRIMARY_PHONE,
      verificationToken: dto.verificationToken,
    });
  }

  private ensureConcurrentUpdate<T>(value: T | null): T {
    if (!value) {
      throw new UserConcurrentModificationError();
    }

    return value;
  }

  private async requestPrimaryContactChange(input: {
    userId: string;
    actorUserId?: string;
    type: UserContactChangeType;
    rawValue: string;
  }) {
    const user = await this.getRequiredUser(input.userId);
    this.assertUserNotAnonymized(user);

    const normalizedValue =
      input.type === UserContactChangeType.PRIMARY_EMAIL
        ? this.normalizeAndValidateEmail(input.rawValue)
        : this.normalizeAndValidatePhone(input.rawValue);

    if (input.type === UserContactChangeType.PRIMARY_EMAIL) {
      if (user.primaryEmail && normalizeEmail(user.primaryEmail) === normalizedValue) {
        throw new NewPrimaryEmailMatchesCurrentError();
      }

      const existing = await this.usersRepository.findByPrimaryEmail(normalizedValue);

      if (existing && existing.id !== user.id) {
        throw new DuplicatePrimaryEmailError();
      }
    } else {
      if (user.primaryPhone && normalizePhone(user.primaryPhone) === normalizedValue) {
        throw new NewPrimaryPhoneMatchesCurrentError();
      }

      const existing = await this.usersRepository.findByPrimaryPhone(normalizedValue);

      if (existing && existing.id !== user.id) {
        throw new DuplicatePrimaryPhoneError();
      }
    }

    const existingPending =
      await this.userContactChangeRequestsRepository.findLatestActiveByUserIdAndType(
        user.id,
        input.type,
      );

    if (
      existingPending &&
      existingPending.newValue === normalizedValue &&
      existingPending.status === UserContactChangeStatus.PENDING &&
      existingPending.expiresAt > new Date()
    ) {
      return {
        requested: true,
        verificationRef: existingPending.verificationRef,
        expiresAt: existingPending.expiresAt,
      };
    }

    // TODO(users-hardening): this flow still has an operational race window between:
    // reading an existing active request, cancelling it, requesting external verification,
    // and creating the new pending request. Reassess whether this should later be coordinated
    // with stronger transactional guarantees and/or idempotency rules.
    if (existingPending) {
      await this.userContactChangeRequestsRepository.cancelActiveByUserIdAndType(
        user.id,
        input.type,
      );
    }

    const verification =
      input.type === UserContactChangeType.PRIMARY_EMAIL
        ? await this.userContactVerificationPort.requestEmailChangeVerification({
            userId: user.id,
            newPrimaryEmail: normalizedValue,
          })
        : await this.userContactVerificationPort.requestPhoneChangeVerification({
            userId: user.id,
            newPrimaryPhone: normalizedValue,
          });

    await this.userContactChangeRequestsRepository.create({
      userId: user.id,
      type: input.type,
      newValue: normalizedValue,
      verificationRef: verification.verificationRef,
      status: UserContactChangeStatus.PENDING,
      expiresAt: verification.expiresAt,
    });

    const auditAction =
      input.type === UserContactChangeType.PRIMARY_EMAIL
        ? USER_AUDIT_ACTIONS.EMAIL_CHANGE_REQUEST
        : USER_AUDIT_ACTIONS.PHONE_CHANGE_REQUEST;

    const eventName =
      input.type === UserContactChangeType.PRIMARY_EMAIL
        ? UserDomainEvents.USER_PRIMARY_EMAIL_CHANGE_REQUESTED
        : UserDomainEvents.USER_PRIMARY_PHONE_CHANGE_REQUESTED;

    await this.recordAudit(
      auditAction,
      user.id,
      input.actorUserId ?? user.id,
      {
        type: input.type,
        verificationRef: verification.verificationRef,
      },
    );

    await this.userEventsPort.publish(eventName, {
      userId: user.id,
      type: input.type,
      verificationRef: verification.verificationRef,
      expiresAt: verification.expiresAt,
    });

    return {
      requested: true,
      verificationRef: verification.verificationRef,
      expiresAt: verification.expiresAt,
    };
  }

  private async confirmPrimaryContactChange(input: {
    userId: string;
    actorUserId?: string;
    type: UserContactChangeType;
    verificationToken: string;
  }) {
    const user = await this.getRequiredUser(input.userId);
    this.assertUserNotAnonymized(user);

    const verification =
      input.type === UserContactChangeType.PRIMARY_EMAIL
        ? await this.userContactVerificationPort.confirmEmailChangeVerification({
            userId: input.userId,
            verificationToken: input.verificationToken,
          })
        : await this.userContactVerificationPort.confirmPhoneChangeVerification({
            userId: input.userId,
            verificationToken: input.verificationToken,
          });

    if (
      (input.type === UserContactChangeType.PRIMARY_EMAIL &&
        verification.type !== 'email') ||
      (input.type === UserContactChangeType.PRIMARY_PHONE &&
        verification.type !== 'phone')
    ) {
      throw new ContactVerificationRequiredError();
    }

    const rawVerifiedValue =
      verification.type === 'email'
        ? verification.newPrimaryEmail
        : verification.newPrimaryPhone;

    if (
      !verification.verified ||
      !rawVerifiedValue ||
      !verification.verificationRef
    ) {
      throw new ContactVerificationRequiredError();
    }

    const normalizedValue =
      verification.type === 'email'
        ? this.normalizeAndValidateEmail(rawVerifiedValue)
        : this.normalizeAndValidatePhone(rawVerifiedValue);

    if (verification.type === 'email') {
      const existing =
        await this.usersRepository.findByPrimaryEmail(normalizedValue);

      if (existing && existing.id !== input.userId) {
        throw new DuplicatePrimaryEmailError();
      }
    } else {
      const existing =
        await this.usersRepository.findByPrimaryPhone(normalizedValue);

      if (existing && existing.id !== input.userId) {
        throw new DuplicatePrimaryPhoneError();
      }
    }

    const activeRequest =
      await this.userContactChangeRequestsRepository.findPendingByVerificationRef(
        verification.verificationRef,
      );

    if (
      !activeRequest ||
      activeRequest.userId !== input.userId ||
      activeRequest.type !== input.type
    ) {
      throw new ContactVerificationRequiredError();
    }

    // TODO(users-hardening): wrap request verification + user update + request consumption
    // in a single DB transaction to avoid partial state if one step fails.
    await this.userContactChangeRequestsRepository.markVerifiedById(
      activeRequest.id,
    );

    let updated: User;

    try {
      updated =
        verification.type === 'email'
          ? this.ensureConcurrentUpdate(
              await this.usersRepository.updatePrimaryEmailByIdAndVersion(
                input.userId,
                user.version,
                normalizedValue,
              ),
            )
          : this.ensureConcurrentUpdate(
              await this.usersRepository.updatePrimaryPhoneByIdAndVersion(
                input.userId,
                user.version,
                normalizedValue,
              ),
            );
    } catch (error) {
      this.mapUserUniqueConstraintError(error);
      throw error;
    }

    await this.userContactChangeRequestsRepository.markConsumedById(
      activeRequest.id,
    );

    const auditAction =
      input.type === UserContactChangeType.PRIMARY_EMAIL
        ? USER_AUDIT_ACTIONS.EMAIL_CHANGE_CONFIRM
        : USER_AUDIT_ACTIONS.PHONE_CHANGE_CONFIRM;

    const eventName =
      input.type === UserContactChangeType.PRIMARY_EMAIL
        ? UserDomainEvents.USER_PRIMARY_EMAIL_CHANGED
        : UserDomainEvents.USER_PRIMARY_PHONE_CHANGED;

    await this.recordAudit(
      auditAction,
      input.userId,
      input.actorUserId ?? input.userId,
      {
        type: input.type,
        verificationRef: verification.verificationRef,
      },
    );

    await this.userEventsPort.publish(eventName, {
      userId: input.userId,
      type: input.type,
    });

    return UserResponseMapper.toResponse(updated);
  }


  private async getRequiredUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new UserNotFoundError();
    return user;
  }

  private assertUserNotAnonymized(user: User): void {
    if (user.status === UserStatus.ANONYMIZED || user.anonymizedAt) {
      throw new UserAlreadyAnonymizedError();
    }
  }

  private assertTransitionAllowed(
    currentStatus: UserStatus,
    nextStatus: UserStatus,
  ): void {
    if (!canTransitionUserStatus(currentStatus, nextStatus)) {
      throw new InvalidUserStatusTransitionError();
    }
  }

  private normalizeAndValidateEmail(email: string): string {
    const normalized = normalizeEmail(email);
    assertEmailOperationalConstraints(normalized);
    return normalized;
  }

  private normalizeAndValidatePhone(phone: string): string {
    const normalized = normalizePhone(phone);
    assertValidE164Phone(normalized);
    return normalized;
  }

  private async recordAudit(
    action: UserAuditAction,
    targetUserId: string,
    actorUserId?: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.userAuditPort.record({
      action,
      actorUserId: actorUserId ?? null,
      targetUserId,
      metadata,
    });
  }

  private buildUpdatedFields(dto: UpdateUserProfileDto): string[] {
    return Object.keys(dto).filter(
      (key) => dto[key as keyof UpdateUserProfileDto] !== undefined,
    );
  }

  private hasProfileUpdateFields(dto: UpdateUserProfileDto): boolean {
    return (
      dto.firstName !== undefined ||
      dto.lastName !== undefined ||
      dto.displayName !== undefined ||
      dto.avatarUrl !== undefined
    );
  }

  private toStartOfDay(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toEndOfDay(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // =============================
  // Prisma Error Mapping (local)
  // =============================

  private mapUserUniqueConstraintError(error: unknown): never {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      throw error;
    }

    const targetFields = this.extractPrismaUniqueTargetFields(error);

    if (targetFields.includes('primaryEmail')) {
      throw new DuplicatePrimaryEmailError();
    }

    if (targetFields.includes('primaryPhone')) {
      throw new DuplicatePrimaryPhoneError();
    }

    throw error;
  }

  private extractPrismaUniqueTargetFields(
    error: Prisma.PrismaClientKnownRequestError,
  ): string[] {
    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.filter(
        (value): value is string => typeof value === 'string',
      );
    }

    if (typeof target === 'string') {
      return [target];
    }

    return [];
  }

}

