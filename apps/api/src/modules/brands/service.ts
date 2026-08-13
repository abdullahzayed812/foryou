import type { CreateBrandInput, UpdateBrandInput } from "@foryou/shared";
import { ConflictError, NotFoundError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { brandsRepository, type BrandsRepository } from "./repository.js";
import "./events.js";

export class BrandsService {
  constructor(private readonly repo: BrandsRepository) {}

  list() {
    return this.repo.findAll();
  }

  async get(id: string) {
    const brand = await this.repo.findById(id);
    if (!brand) throw new NotFoundError("Brand not found");
    return brand;
  }

  async getBySlug(slug: string) {
    const brand = await this.repo.findBySlug(slug);
    if (!brand) throw new NotFoundError("Brand not found");
    return brand;
  }

  async create(input: CreateBrandInput) {
    if (await this.repo.findBySlug(input.slug))
      throw new ConflictError("That slug is already in use");
    const brand = await this.repo.create(input);
    eventBus.publish("brand.created", { brandId: brand.id });
    return brand;
  }

  async update(id: string, input: UpdateBrandInput) {
    await this.get(id);
    if (input.slug) {
      const existing = await this.repo.findBySlug(input.slug);
      if (existing && existing.id !== id) throw new ConflictError("That slug is already in use");
    }
    const updated = await this.repo.update(id, input);
    eventBus.publish("brand.updated", { brandId: id });
    return updated;
  }

  async delete(id: string) {
    await this.get(id);
    await this.repo.delete(id);
    eventBus.publish("brand.deleted", { brandId: id });
  }
}

export const brandsService = new BrandsService(brandsRepository);
