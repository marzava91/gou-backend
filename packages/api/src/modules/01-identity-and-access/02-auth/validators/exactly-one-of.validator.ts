// packages\api\src\modules\01-identity-and-access\02-auth\validators\exactly-one-of.validator.ts

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function ExactlyOneOf<T extends object>(
  properties: (keyof T)[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'exactlyOneOf',
      target: object.constructor,
      propertyName,
      constraints: [properties],
      options: validationOptions,
      validator: {
        validate(_: unknown, args: ValidationArguments) {
          const [fields] = args.constraints as [(keyof T)[]];
          const obj = args.object as Record<string, unknown>;

          const presentCount = fields.filter((field) => {
            const value = obj[field as string];

            if (typeof value === 'string') {
              return value.trim().length > 0;
            }

            return value !== undefined && value !== null;
          }).length;

          return presentCount === 1;
        },
        defaultMessage(args: ValidationArguments) {
          const [fields] = args.constraints as [string[]];
          return `Exactly one of [${fields.join(', ')}] must be provided.`;
        },
      },
    });
  };
}