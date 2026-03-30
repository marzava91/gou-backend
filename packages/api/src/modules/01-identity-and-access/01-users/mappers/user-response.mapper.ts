// packages\api\src\modules\01-identity-and-access\01-users\mappers\user-response.mapper.ts

import { User } from '@prisma/client';
import { UserResponseDto } from '../dto/responses/user-response.dto';
import { UserSummaryResponseDto } from '../dto/responses/user-summary-response.dto';

export class UserResponseMapper {
  static toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      primaryEmail: user.primaryEmail,
      primaryPhone: user.primaryPhone,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      status: user.status,
      deactivatedAt: user.deactivatedAt,
      anonymizedAt: user.anonymizedAt,
      version: user.version,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toSummary(user: User): UserSummaryResponseDto {
    return {
      id: user.id,
      displayName: user.displayName,
      primaryEmail: user.primaryEmail,
      primaryPhone: user.primaryPhone,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}