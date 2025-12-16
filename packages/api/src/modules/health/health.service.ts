import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const startedAt = Date.now();

    // Query simple, rápida y compatible con Postgres
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - startedAt;

      return {
        status: "ok",
        service: "api",
        time: new Date().toISOString(),
        db: { status: "ok", latencyMs },
      };
    } catch (e) {
      const latencyMs = Date.now() - startedAt;

      return {
        status: "degraded",
        service: "api",
        time: new Date().toISOString(),
        db: {
          status: "error",
          latencyMs,
          // NO expongas detalles sensibles en prod
          error: process.env.NODE_ENV === "production" ? "DB_UNREACHABLE" : String(e),
        },
      };
    }
  }
}
