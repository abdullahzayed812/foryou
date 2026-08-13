import { Router } from "express";
import { z } from "zod";
import { listProductsQuerySchema } from "@foryou/shared";
import { searchService } from "./service.js";

export const searchRouter = Router();

searchRouter.get("/", async (req, res) => {
  const query = listProductsQuerySchema.parse(req.query);
  res.json(await searchService.search(query));
});

const suggestQuerySchema = z.object({ q: z.string().min(1).max(100) });

searchRouter.get("/suggest", async (req, res) => {
  const { q } = suggestQuerySchema.parse(req.query);
  res.json(await searchService.suggest(q));
});
