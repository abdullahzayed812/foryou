import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const sentEmails: { to: string; subject: string; html: string }[] = [];

vi.mock("../../lib/mailer.js", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- idiomatic vitest mock-typing pattern
  const actual = await importOriginal<typeof import("../../lib/mailer.js")>();
  return {
    ...actual,
    sendMail: vi.fn(async (to: string, subject: string, html: string) => {
      sentEmails.push({ to, subject, html });
    }),
  };
});

const { createApp } = await import("../../app.js");

function extractOtp(html: string): string {
  const match = /<h2[^>]*>(\d{6})<\/h2>/.exec(html);
  if (!match?.[1]) throw new Error(`No OTP found in email HTML: ${html}`);
  return match[1];
}

describe("auth flow", () => {
  const app = createApp();

  beforeEach(() => {
    sentEmails.length = 0;
  });

  function uniqueEmail(): string {
    return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  }

  it("registers a customer, verifies OTP, and can then log in", async () => {
    const email = uniqueEmail();

    const registerRes = await request(app).post("/api/v1/auth/register/customer").send({
      email,
      password: "Password123",
      firstName: "Test",
      lastName: "Customer",
      governorate: "Cairo",
      city: "Maadi",
    });
    expect(registerRes.status).toBe(201);
    expect(sentEmails).toHaveLength(1);

    const code = extractOtp(sentEmails[0]!.html);

    const verifyRes = await request(app).post("/api/v1/auth/otp/verify").send({ email, code });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.accessToken).toEqual(expect.any(String));
    expect(verifyRes.headers["set-cookie"]).toBeDefined();

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "Password123" });
    expect(loginRes.status).toBe(200);

    const meRes = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);
    expect(meRes.body.roles).toEqual(["customer"]);
    expect(meRes.body.customerProfile.firstName).toBe("Test");
  });

  it("rejects login before the email is verified", async () => {
    const email = uniqueEmail();
    await request(app).post("/api/v1/auth/register/customer").send({
      email,
      password: "Password123",
      firstName: "Unverified",
      lastName: "User",
      governorate: "Giza",
      city: "Dokki",
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "Password123" });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("rejects a wrong OTP and does not consume the real one", async () => {
    const email = uniqueEmail();
    await request(app).post("/api/v1/auth/register/customer").send({
      email,
      password: "Password123",
      firstName: "Wrong",
      lastName: "Otp",
      governorate: "Cairo",
      city: "Zamalek",
    });

    const wrongRes = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ email, code: "000000" });
    expect(wrongRes.status).toBe(400);
    expect(wrongRes.body.error.code).toBe("OTP_INVALID");

    const code = extractOtp(sentEmails[0]!.html);
    const rightRes = await request(app).post("/api/v1/auth/otp/verify").send({ email, code });
    expect(rightRes.status).toBe(200);
  });

  it("rejects duplicate registration with the same email", async () => {
    const email = uniqueEmail();
    const payload = {
      email,
      password: "Password123",
      firstName: "Dup",
      lastName: "User",
      governorate: "Cairo",
      city: "Heliopolis",
    };
    const first = await request(app).post("/api/v1/auth/register/customer").send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/v1/auth/register/customer").send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("CONFLICT");
  });

  it("rejects access to a protected route with no token", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});
