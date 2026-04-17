// packages\api\src\modules\01-identity-and-access\01-users\users.repository.ts

import { Injectable } from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  USER_LIST_SORT_FIELDS,
  USER_SORT_DIRECTIONS,
} from './domain/constants/users.constants';

import type {
  UserListSortField,
  UserSortDirection,
} from './domain/constants/users.constants';

export interface ListUsersRepositoryParams {
  q?: string;
  status?: UserStatus;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
  skip: number;
  take: number;
  sortBy: UserListSortField;
  sortDir: UserSortDirection;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Expects canonical normalized lowercase email.
   */
  async findByPrimaryEmail(primaryEmail: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { primaryEmail },
    });
  }

  /**
   * Expects canonical normalized E.164 phone.
   */
  async findByPrimaryPhone(primaryPhone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { primaryPhone },
    });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { id },
    });

    return count > 0;
  }

  /**
   * Expects canonical normalized lowercase email.
   */
  async existsByPrimaryEmail(primaryEmail: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { primaryEmail },
    });

    return count > 0;
  }

  /**
   * Expects canonical normalized E.164 phone.
   */
  async existsByPrimaryPhone(primaryPhone: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { primaryPhone },
    });

    return count > 0;
  }

  async updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Optimistic locking update.
   * Returns null when version mismatch occurs.
   */
  async updateByIdAndVersion(
    id: string,
    version: number,
    data: Prisma.UserUpdateInput,
  ): Promise<User | null> {
    const result = await this.prisma.user.updateMany({
      where: { id, version },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Confirms and updates the user's canonical primary email.
   * Expects canonical normalized lowercase email.
   */
  async updatePrimaryEmailById(
    id: string,
    primaryEmail: string,
    options?: {
      emailVerified?: boolean;
      incrementVersion?: boolean;
    },
  ): Promise<User> {
    const incrementVersion = options?.incrementVersion ?? true;
    const emailVerified = options?.emailVerified ?? true;

    return this.prisma.user.update({
      where: { id },
      data: {
        primaryEmail,
        emailVerified,
        ...(incrementVersion ? { version: { increment: 1 } } : {}),
      },
    });
  }

  /**
   * Optimistic locking version for primary email update.
   */
  async updatePrimaryEmailByIdAndVersion(
    id: string,
    version: number,
    primaryEmail: string,
    options?: {
      emailVerified?: boolean;
    },
  ): Promise<User | null> {
    const emailVerified = options?.emailVerified ?? true;

    const result = await this.prisma.user.updateMany({
      where: { id, version },
      data: {
        primaryEmail,
        emailVerified,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Confirms and updates the user's canonical primary phone.
   * Expects canonical normalized E.164 phone.
   */
  async updatePrimaryPhoneById(
    id: string,
    primaryPhone: string,
    options?: {
      phoneVerified?: boolean;
      incrementVersion?: boolean;
    },
  ): Promise<User> {
    const incrementVersion = options?.incrementVersion ?? true;
    const phoneVerified = options?.phoneVerified ?? true;

    return this.prisma.user.update({
      where: { id },
      data: {
        primaryPhone,
        phoneVerified,
        ...(incrementVersion ? { version: { increment: 1 } } : {}),
      },
    });
  }

  /**
   * Optimistic locking version for primary phone update.
   */
  async updatePrimaryPhoneByIdAndVersion(
    id: string,
    version: number,
    primaryPhone: string,
    options?: {
      phoneVerified?: boolean;
    },
  ): Promise<User | null> {
    const phoneVerified = options?.phoneVerified ?? true;

    const result = await this.prisma.user.updateMany({
      where: { id, version },
      data: {
        primaryPhone,
        phoneVerified,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async list(
    params: ListUsersRepositoryParams,
  ): Promise<{ items: User[]; total: number }> {
    const where = this.buildListWhere(params);
    const orderBy = this.buildOrderBy(params.sortBy, params.sortDir);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  private buildListWhere(
    params: ListUsersRepositoryParams,
  ): Prisma.UserWhereInput {
    return {
      ...(params.status ? { status: params.status } : {}),
      ...(typeof params.emailVerified === 'boolean'
        ? { emailVerified: params.emailVerified }
        : {}),
      ...(typeof params.phoneVerified === 'boolean'
        ? { phoneVerified: params.phoneVerified }
        : {}),
      ...(params.createdFrom || params.createdTo
        ? {
            createdAt: {
              ...(params.createdFrom ? { gte: params.createdFrom } : {}),
              ...(params.createdTo ? { lte: params.createdTo } : {}),
            },
          }
        : {}),
      ...(params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: 'insensitive' } },
              { lastName: { contains: params.q, mode: 'insensitive' } },
              { displayName: { contains: params.q, mode: 'insensitive' } },
              { primaryEmail: { contains: params.q, mode: 'insensitive' } },
              { primaryPhone: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private buildOrderBy(
    sortBy: UserListSortField,
    sortDir: UserSortDirection,
  ): Prisma.UserOrderByWithRelationInput {
    switch (sortBy) {
      case USER_LIST_SORT_FIELDS.CREATED_AT:
        return { createdAt: sortDir };
      case USER_LIST_SORT_FIELDS.UPDATED_AT:
        return { updatedAt: sortDir };
      case USER_LIST_SORT_FIELDS.DISPLAY_NAME:
        return { displayName: sortDir };
      case USER_LIST_SORT_FIELDS.PRIMARY_EMAIL:
        return { primaryEmail: sortDir };
      case USER_LIST_SORT_FIELDS.PRIMARY_PHONE:
        return { primaryPhone: sortDir };
      case USER_LIST_SORT_FIELDS.STATUS:
        return { status: sortDir };
      default:
        return { createdAt: USER_SORT_DIRECTIONS.DESC };
    }
  }
}
