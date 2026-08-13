import { NotFoundError } from "../../lib/http-errors.js";
import { productsRepository } from "../products/repository.js";
import { withImageUrls } from "../products/service.js";
import { wishlistRepository, type WishlistRepository } from "./repository.js";

export class WishlistService {
  constructor(private readonly repo: WishlistRepository) {}

  async add(customerId: string, productId: string): Promise<void> {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError("Product not found");
    await this.repo.add(customerId, productId);
  }

  remove(customerId: string, productId: string): Promise<void> {
    return this.repo.remove(customerId, productId);
  }

  async listMine(customerId: string) {
    const items = await this.repo.list(customerId);
    return items.map((item) => ({ ...item, product: withImageUrls(item.product) }));
  }
}

export const wishlistService = new WishlistService(wishlistRepository);
