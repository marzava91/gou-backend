import { Injectable } from '@nestjs/common'; import { PrismaService } from '../../prisma/prisma.service';
@Injectable() export class SettingsRepository { constructor(private prisma:PrismaService){} }