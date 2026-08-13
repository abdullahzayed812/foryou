import { describe, it, expect } from "vitest";
import { isImportDescriptionAllowed } from "@foryou/shared";

describe("isImportDescriptionAllowed", () => {
  it.each([
    "عايزه بسعر 500 جنيه",
    "ميزانيتي 5000",
    "السعر في حدود 1000",
    "عايز حاجة من 1000 إلى 2000 جنيه",
    "500 EGP",
    "budget 500",
    "price 100 USD",
  ])("rejects %j", (description) => {
    expect(isImportDescriptionAllowed(description)).toBe(false);
  });

  it.each([
    "عايز iPhone 15",
    "عايز iPhone 15 سعة 256GB",
    "عايز لابتوب RAM 16GB",
    "عايز 3 قطع",
    "مقاس 42",
    "عايز اللون الأسود",
  ])("allows %j", (description) => {
    expect(isImportDescriptionAllowed(description)).toBe(true);
  });

  it("allows an empty or whitespace-only description", () => {
    expect(isImportDescriptionAllowed("")).toBe(true);
    expect(isImportDescriptionAllowed("   ")).toBe(true);
  });

  it("catches deliberately spaced-out keywords", () => {
    expect(isImportDescriptionAllowed("س ع ر 500")).toBe(false);
  });

  it("catches keywords regardless of hamza/taa marbuta variant", () => {
    expect(isImportDescriptionAllowed("أسعار الجملة")).toBe(false);
    expect(isImportDescriptionAllowed("500 جنية")).toBe(false);
  });

  it("does not flag an unrelated English word containing a keyword substring", () => {
    expect(isImportDescriptionAllowed("I want a costume like in the movie")).toBe(true);
  });
});
