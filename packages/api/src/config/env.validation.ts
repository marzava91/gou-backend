// src/config/env.validation.ts
import * as Joi from 'joi';

export function validateEnv(cfg: Record<string, unknown>) {
  const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
    PORT: Joi.number().default(3000),

    DATABASE_URL: Joi.string().uri().required(),
    JWT_SECRET: Joi.string().min(16).required(),

    // agrega aquí lo que vayas usando:
    // SUPABASE_URL: Joi.string().uri().optional(),
    // SUPABASE_ANON_KEY: Joi.string().optional(),
  });

  const { error, value } = schema.validate(cfg, {
    allowUnknown: true,
    abortEarly: false, // reporta todos los errores de una vez
  });

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return value;
}
