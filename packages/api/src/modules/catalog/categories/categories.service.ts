// packages\api\src\modules\catalog\categories\categories.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { MoveCategoryDto } from './dto/move-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private repo: CategoriesRepository) {}

  async list(tenantId: string, q: QueryCategoriesDto) {
    const includeInactive = !!q.includeInactive;

    // typeahead
    if (q.q && q.q.trim().length) {
      const rows = await this.repo.search({
        tenantId,
        q: q.q.trim(),
        includeInactive,
        take: 30,
      });
      return { data: rows };
    }

    // children or roots
    const parentId = q.parentId ? q.parentId : null;
    const rows = await this.repo.listByParent({
      tenantId,
      parentId,
      includeInactive,
    });
    return { data: rows };
  }

  async tree(tenantId: string, includeInactive = false) {
    const all = await this.repo.listAll({ tenantId, includeInactive });
    return { data: all };
  }

  async get(tenantId: string, id: string) {
    const row = await this.repo.findById(tenantId, id);
    if (!row) throw new NotFoundException('Category not found');
    return { data: row };
  }

  async create(tenantId: string, dto: CreateCategoryDto) {
    const parentId = dto.parentId ?? null;

    // si parentId viene, valida que exista y sea del tenant
    if (parentId) {
      const parent = await this.repo.findById(tenantId, parentId);
      if (!parent) throw new BadRequestException('parentId inválido');
    }

    // evitar duplicados en mismo nivel (además del unique)
    const dup = await this.repo.existsSameLevel({
      tenantId,
      parentId,
      name: dto.name.trim(),
    });
    if (dup)
      throw new BadRequestException(
        'Ya existe una categoría con ese nombre en ese nivel',
      );

    // Si guardas depth/path: aquí los calculas.
    // Por ahora lo dejamos simple.
    const row = await this.repo.create(tenantId, {
      name: dto.name.trim(),
      parentId,
      imageUrl: dto.imageUrl ?? null,
      isFeatured: dto.isFeatured ?? false,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      // depth/path: setear si aplica
    });

    return { data: row };
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    const current = await this.repo.findById(tenantId, id);
    if (!current) throw new NotFoundException('Category not found');

    if (dto.name) {
      const dup = await this.repo.existsSameLevel({
        tenantId,
        parentId: current.parentId,
        name: dto.name.trim(),
        excludeId: id,
      });
      if (dup)
        throw new BadRequestException(
          'Ya existe una categoría con ese nombre en ese nivel',
        );
    }

    const row = await this.repo.update(tenantId, id, {
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });

    return { data: row };
  }

  async move(tenantId: string, id: string, dto: MoveCategoryDto) {
    const current = await this.repo.findById(tenantId, id);
    if (!current) throw new NotFoundException('Category not found');

    const newParentId = dto.newParentId ?? null;

    if (newParentId) {
      const parent = await this.repo.findById(tenantId, newParentId);
      if (!parent) throw new BadRequestException('newParentId inválido');

      // prevenir ciclos: no puedes mover un nodo debajo de uno de sus descendientes.
      // En adjacency list, esto requiere recorrer hacia arriba desde newParent y ver si llegas a id.
      // MVP: validación simple (rápida) — en producción, haz el check completo.
      if (newParentId === id)
        throw new BadRequestException('No puedes asignar parent a sí mismo');
    }

    // duplicado en nuevo nivel (mismo nombre)
    const dup = await this.repo.existsSameLevel({
      tenantId,
      parentId: newParentId,
      name: current.name,
      excludeId: id,
    });
    if (dup)
      throw new BadRequestException(
        'En el destino ya existe una categoría con ese nombre',
      );

    const row = await this.repo.update(tenantId, id, {
      parent: newParentId
        ? { connect: { id: newParentId } }
        : { disconnect: true },
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });

    return { data: row };
  }

  async toggleActive(tenantId: string, id: string, isActive: boolean) {
    const current = await this.repo.findById(tenantId, id);
    if (!current) throw new NotFoundException('Category not found');

    const row = await this.repo.update(tenantId, id, { isActive });
    return { data: row };
  }

  async remove(tenantId: string, id: string) {
    const current = await this.repo.findById(tenantId, id);
    if (!current) throw new NotFoundException('Category not found');

    // Regla recomendada:
    // - si tiene hijos => no borrar duro, o pedir confirmación de "promover hijos a root".
    const children = await this.repo.listChildrenIds(tenantId, id);
    if (children.length) {
      throw new BadRequestException(
        'No se puede eliminar: la categoría tiene subcategorías',
      );
    }

    // Si hay items vinculados, puedes:
    // - impedir,
    // - o permitir y cascade limpiar ItemCategory (en tu schema es cascade).
    await this.repo.delete(tenantId, id);

    return { data: { id } };
  }
}
