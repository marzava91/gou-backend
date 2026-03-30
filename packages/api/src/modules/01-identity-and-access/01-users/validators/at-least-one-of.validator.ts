// packages/api/src/modules/01-identity-and-access/01-users/validators/at-least-one-of.validator.ts

// packages/api/src/modules/01-identity-and-access/01-users/validators/at-least-one-of.validator.ts

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function AtLeastOneOf(
  properties: string[],
  validationOptions?: ValidationOptions,
): ClassDecorator {
  return function (constructor: Function) {
    registerDecorator({
      name: 'atLeastOneOf',
      target: constructor,
      propertyName: undefined as never,
      constraints: [properties],
      options: validationOptions,
      validator: {
        validate(_: unknown, args: ValidationArguments) {
          const [fields] = args.constraints as [string[]];
          const object = args.object as Record<string, unknown>;

          return fields.some((field) => {
            const value = object[field];

            if (typeof value === 'string') {
              return value.trim().length > 0;
            }

            return value !== undefined && value !== null;
          });
        },
        defaultMessage(args: ValidationArguments) {
          const [fields] = args.constraints as [string[]];
          return `at_least_one_of_${fields.join('_or_')}_required`;
        },
      },
    });
  };
}