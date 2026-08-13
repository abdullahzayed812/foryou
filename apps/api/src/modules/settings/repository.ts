import { db } from "../../db/index.js";
import { platformSettings } from "./schema.js";

export class SettingsRepository {
  listAll() {
    return db.query.platformSettings.findMany();
  }

  async upsert(key: string, value: unknown, updatedById: string): Promise<void> {
    await db
      .insert(platformSettings)
      .values({ key, value, updatedById })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedById, updatedAt: new Date() },
      });
  }
}

export const settingsRepository = new SettingsRepository();
