import { Module } from '@nestjs/common'; 
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../../prisma/prisma.module'; 
import { AuthController } from './auth.controller'; 
import { AuthService } from './auth.service'; 
import { AuthRepository } from './auth.repository'; 
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change_me',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}