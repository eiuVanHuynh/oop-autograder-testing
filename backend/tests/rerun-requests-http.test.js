// Rerun requests over HTTP (issue #97), with pg replaced by an in-memory stub like tests/health.test.js.
// What only this level can prove: POST /api/runs/:id/rerun-requests is REACHABLE even though
// routes/index.js mounts runs.routes on /runs first (a 404 here would mean the mount order eats it),
// and the guard chain really runs in the order requireAuth → requireRole → validate.
const Module = require("module");
const origLoad = Module._load;

const USERS = {
  1: { user_id: 1, user_role: "admin", user_status: "active" },
  2: { user_id: 2, user_role: "tester", user_status: "active" },
  3: { user_id: 3, user_role: "dev", user_status: "active" },
  4: { user_id: 4, user_role: "viewer", user_status: "active" },
};
const REQUEST_ROW = {
  request_id: 1,
  run_id: 7,
  status: "pending",
  requested_by: 3,
  run_config: { templateId: 4, env: "testing" },
  run_name: "Run_7",
};
let writes = [];

Module._load = function (req) {
  if (req === "pg") {
    return {
      Pool: class {
        async query(sql, p = []) {
          const s = sql.trim();
          if (s.includes("FROM users")) return { rows: [USERS[Number(p[0])]].filter(Boolean), rowCount: 1 };
          if (s.includes("FROM test_runs")) return { rows: [{ run_id: Number(p[0]) }], rowCount: 1 };
          if (s.startsWith("INSERT INTO rerun_requests")) {
            writes.push({ kind: "insert", params: p });
            return { rows: [{ request_id: 1 }], rowCount: 1 };
          }
          if (s.startsWith("UPDATE rerun_requests")) {
            writes.push({ kind: "update", params: p });
            return { rows: [{ request_id: 1 }], rowCount: 1 };
          }
          if (s.includes("FROM rerun_requests")) return { rows: [REQUEST_ROW], rowCount: 1 };
          return { rows: [], rowCount: 0 };
        }
        async end() {}
      },
    };
  }
  return origLoad.apply(this, arguments);
};

// Must come BEFORE require('../src/app'): config/env.js throws when a required var is missing.
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://u:p@localhost:5432/test";
process.env.JWT_SECRET = "test-secret";

const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");

const as = (userId) => jwt.sign({ user_id: userId }, process.env.JWT_SECRET);

test("POST /api/runs/:id/rerun-requests: Dev may ask, Viewer may not, no token = 401", async () => {
  writes = [];

  const anon = await request(app).post("/api/runs/7/rerun-requests").send({});
  assert.equal(anon.status, 401, "401, not 404: the route must be reachable past /runs");

  const dev = await request(app)
    .post("/api/runs/7/rerun-requests")
    .set("Authorization", `Bearer ${as(3)}`)
    .send({ reason: "the log stops halfway" });
  assert.equal(dev.status, 201);
  assert.equal(dev.body.data.status, "PENDING");
  assert.deepEqual(dev.body.data.runConfig, { templateId: 4, env: "testing" });
  assert.deepEqual(writes[0].params, [7, "the log stops halfway", 3]); // run from the URL, author from the token

  writes = [];
  const viewer = await request(app)
    .post("/api/runs/7/rerun-requests")
    .set("Authorization", `Bearer ${as(4)}`)
    .send({});
  assert.equal(viewer.status, 403);
  assert.equal(writes.length, 0, "a refused request must not reach the DB");
});

test("the body is checked, and it cannot choose what gets rerun", async () => {
  writes = [];
  const post = (body) =>
    request(app).post("/api/runs/7/rerun-requests").set("Authorization", `Bearer ${as(3)}`).send(body);

  assert.equal((await post({ templateId: 9 })).status, 400); // .strict(): no smuggling in a target
  assert.equal((await post({ reason: "x".repeat(501) })).status, 400);
  assert.equal(writes.length, 0);

  // A non-numeric run id is a 400 from validate, never a query with 'abc' in it.
  const bad = await request(app)
    .post("/api/runs/abc/rerun-requests")
    .set("Authorization", `Bearer ${as(3)}`)
    .send({});
  assert.equal(bad.status, 400);
});

test("approve / reject: Admin and Tester only; Dev is refused and nothing is written", async () => {
  writes = [];
  const decide = (verb, userId) =>
    request(app).post(`/api/rerun-requests/1/${verb}`).set("Authorization", `Bearer ${as(userId)}`).send();

  assert.equal((await decide("approve", 3)).status, 403); // dev
  assert.equal((await decide("reject", 4)).status, 403); // viewer
  assert.equal(writes.length, 0);

  const ok = await decide("approve", 1); // admin
  assert.equal(ok.status, 200);
  assert.deepEqual(writes[0].params, ["approved", 1, 1]); // status, who decided, request id

  const byTester = await decide("reject", 2);
  assert.equal(byTester.status, 200);
  assert.equal(writes[1].params[0], "rejected");
});

test("PATCH /api/rerun-requests/:id: Admin only, and the body must carry a known status", async () => {
  writes = [];
  const patch = (userId, body) =>
    request(app).patch("/api/rerun-requests/1").set("Authorization", `Bearer ${as(userId)}`).send(body);

  assert.equal((await patch(2, { status: "PENDING" })).status, 403, "tester may decide but not re-open");
  assert.equal((await patch(3, { status: "PENDING" })).status, 403); // dev
  assert.equal(writes.length, 0);

  const ok = await patch(1, { status: "PENDING" }); // admin; UPPERCASE as toApi returns it
  assert.equal(ok.status, 200);
  assert.equal(writes[0].params[0], "pending");

  assert.equal((await patch(1, { status: "nonsense" })).status, 400);
  assert.equal((await patch(1, {})).status, 400);
  assert.equal((await patch(1, { status: "PENDING", decidedBy: 9 })).status, 400); // .strict()
  assert.equal(writes.length, 1);
});

test("GET /api/rerun-requests: open to any signed-in user, 401 without a token", async () => {
  assert.equal((await request(app).get("/api/rerun-requests")).status, 401);
  const viewer = await request(app).get("/api/rerun-requests").set("Authorization", `Bearer ${as(4)}`);
  assert.equal(viewer.status, 200);
  assert.equal(viewer.body.data.length, 1);
  // An unknown query param is dropped, not a 400 (the .strip() in the schema).
  const filtered = await request(app)
    .get("/api/rerun-requests?status=PENDING&page=2")
    .set("Authorization", `Bearer ${as(4)}`);
  assert.equal(filtered.status, 200);
  assert.equal(
    (await request(app).get("/api/rerun-requests?status=nonsense").set("Authorization", `Bearer ${as(4)}`))
      .status,
    400,
  );
});
