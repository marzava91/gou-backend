import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async get(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          include: { product: true },
        },
      },
    });
  }

  async productsByCategory(categoryId: string, page = 1, pageSize = 24) {
    return this.prisma.product.findMany({
      where: { categories: { some: { categoryId } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: 'asc' },
    });
  }
}
