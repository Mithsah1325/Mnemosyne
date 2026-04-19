import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.AUTH_MODE = "none";
process.env.USE_MOCK_PATIENT_DATA = "true";

const { createApp } = await import("../src/app.js");
const app = createApp();

test("GET /api/health returns ok", async () => {
  const response = await request(app).get("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("POST /api/call/message validates input", async () => {
  const response = await request(app).post("/api/call/message").send({ transcript: "", patientId: "bad id" });
  assert.equal(response.status, 400);
});
