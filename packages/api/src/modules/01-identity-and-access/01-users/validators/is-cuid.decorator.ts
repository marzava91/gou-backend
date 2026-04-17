// packages/api/src/modules/01-identity-and-access/01-users/validators/is-cuid.decorator.ts

import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * What this validator does
 * ------------------------
 * Validates that a value matches the expected CUID-like format used by this module.
 *
 * Important note
 * --------------
 * This decorator is implemented using the legacy decorator contract expected by
 * class-validator and NestJS validation flows.
 *
 * Good indicators
 * ---------------
 * - valid ids pass validation
 * - malformed ids are rejected consistently
 *
 * Bad indicators
 * --------------
 * - arbitrary strings pass as ids
 * - tests fail due to decorator signature mismatch
 */
export function IsCuid(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isCuid',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && /^c[a-z0-9]{24}$/i.test(value);
        },
      },
    });
  };
}
