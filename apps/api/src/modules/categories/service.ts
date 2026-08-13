import type { CreateCategoryInput, UpdateCategoryInput } from "@foryou/shared";
import { ConflictError, NotFoundError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { categoriesRepository, type CategoriesRepository } from "./repository.js";
import "./events.js";

export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  list() {
    return this.repo.findAll();
  }

  async get(id: string) {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundError("Category not found");
    return category;
  }

  async create(input: CreateCategoryInput) {
    if (await this.repo.findBySlug(input.slug))
      throw new ConflictError("That slug is already in use");
    if (input.parentId) await this.get(input.parentId);
    const category = await this.repo.create(input);
    eventBus.publish("category.created", { categoryId: category.id });
    return category;
  }

  async update(id: string, input: UpdateCategoryInput) {
    await this.get(id);
    if (input.slug) {
      const existing = await this.repo.findBySlug(input.slug);
      if (existing && existing.id !== id) throw new ConflictError("That slug is already in use");
    }
    if (input.parentId) await this.get(input.parentId);
    const updated = await this.repo.update(id, input);
    eventBus.publish("category.updated", { categoryId: id });
    return updated;
  }

  async delete(id: string) {
    await this.get(id);
    await this.repo.delete(id);
    eventBus.publish("category.deleted", { categoryId: id });
  }
}

export const categoriesService = new CategoriesService(categoriesRepository);
