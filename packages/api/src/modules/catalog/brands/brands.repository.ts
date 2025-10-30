import { Injectable } from '@nestjs/common'; import { PrismaService } from '../../../prisma/prisma.service';
@Injectable() export class BrandsRepository { constructor(private prisma:PrismaService){} }