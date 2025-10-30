import { Injectable } from '@nestjs/common'; 
import { FirebaseProductsRepository } from './products.repository'; 

@Injectable()
export class ProductsService {
  constructor(private readonly repo: FirebaseProductsRepository) {}

  async list(query: any) {
    const { page = 1, limit = 20, search = '', sku, cursor } = query;
    return this.repo.getPaginated({ limit: Number(limit), search, sku, cursor });
  }

  async findOne(id: string) {
    return await this.repo.getById(id);
  }

  async create(data: any) {
    return await this.repo.create(data);
  }

  async update(id: string, data: any) {
    return await this.repo.update(id, data);
  }

  async delete(id: string) {
    return await this.repo.delete(id);
  }
}
