import { settingsRepository, type SettingsRepository } from "./repository.js";

interface SettingDefault<T> {
  value: T;
  public: boolean;
}

/** Every known setting, its default, and whether it's safe to expose on the public endpoint. */
const DEFAULTS: {
  maintenanceMode: SettingDefault<boolean>;
  platformAnnouncement: SettingDefault<string>;
  supportEmail: SettingDefault<string>;
  minWithdrawalAmount: SettingDefault<number>;
} = {
  maintenanceMode: { value: false, public: true },
  platformAnnouncement: { value: "", public: true },
  supportEmail: { value: "support@foryou.example", public: true },
  minWithdrawalAmount: { value: 50, public: false },
};

export type SettingKey = keyof typeof DEFAULTS;
type Settings = { [K in SettingKey]: (typeof DEFAULTS)[K]["value"] };

export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  /** Merges stored overrides on top of the typed defaults — a key that's never been set just falls back silently. */
  async getAll(): Promise<Settings> {
    const rows = await this.repo.listAll();
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    const result = {} as Settings;
    for (const key of Object.keys(DEFAULTS) as SettingKey[]) {
      result[key] = (stored.has(key) ? stored.get(key) : DEFAULTS[key].value) as never;
    }
    return result;
  }

  async getPublic(): Promise<Partial<Settings>> {
    const all = await this.getAll();
    const result: Partial<Settings> = {};
    for (const key of Object.keys(DEFAULTS) as SettingKey[]) {
      if (DEFAULTS[key].public) result[key] = all[key] as never;
    }
    return result;
  }

  async get<K extends SettingKey>(key: K): Promise<Settings[K]> {
    const all = await this.getAll();
    return all[key];
  }

  async set(key: SettingKey, value: Settings[SettingKey], adminId: string): Promise<void> {
    await this.repo.upsert(key, value, adminId);
  }
}

export const settingsService = new SettingsService(settingsRepository);
