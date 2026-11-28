// Rerun requests (issue #97): service rules with fake repositories, plus the RBAC matrix of the routes.
// No PostgreSQL needed. Only the branching parts — the rules whose breakage nobody would notice right away.
const test = require("node:test");
const assert = require("node:assert");
const RerunRequestsService = require("../src/services/rerunRequests.service");

const svc = (rerunRequestRepository, runRepository = { findById: async () => ({ run_id: 5 }) }) =>
  new RerunRequestsService({ rerunRequestRepository, runRepository });

test("request: unknown run → 404, nothing written", async () => {
  const s = svc(
    { createRequest: async () => assert.fail("must not write for a run that does not exist") },
    { findById: async () => null },
  );
  await assert.rejects(() => s.createForRun(99, {}, 3), { status: 404 });
});

test("request: a second pending request for the same run → 409", async () => {
  // ux_rerun_requests_pending raises 23505; without this branch it would surface as a 500.
  // The constraint name is what Postgres really reports here (checked against the DB).
  const s = svc({
    createRequest: async () => {
      throw Object.assign(new Error("duplicate key"), {
        code: "23505",
        constraint: "ux_rerun_requests_pending",
      });
    },
  });
  await assert.rejects(() => s.createForRun(5, {}, 3), { status: 409, code: "REQUEST_PENDING" });
});

test("request: another DB error, or a duplicate on another index, bubbles up as itself", async () => {
  const failing = (extra) =>
    svc({
      createRequest: async () => {
        throw Object.assign(new Error("db said no"), extra);
      },
    });

  await assert.rejects(() => failing({ code: "08006" }).createForRun(5, {}, 3), { code: "08006" });
  // A primary-key collision must NOT be reported as "a request is already pending".
  await assert.rejects(
    () => failing({ code: "23505", constraint: "rerun_requests_pkey" }).createForRun(5, {}, 3),
    { constraint: "rerun_requests_pkey" },
  );
});

test("request: the run vanished between the write and the read → 404, not a crash", async () => {
  // createRequest INSERTs then re-reads through a JOIN on test_runs; deleting the run cascades the
  // request away, so the row can be gone. toApi(null) would throw a TypeError = 500 with no message.
  const s = svc({ createRequest: async () => null });
  await assert.rejects(() => s.createForRun(5, {}, 3), { status: 404 });
});

test("request: the reply carries the old run's config so the UI can prefill Run Test", async () => {
  const s = svc({
    createRequest: async (row) => ({
      request_id: 1,
      run_id: row.run_id,
      status: "pending",
      requested_by: row.requested_by,
      run_config: '{"templateId":4,"env":"testing"}', // text column: must come back parsed
    }),
  });
  const data = await s.createForRun(5, { reason: "log is empty" }, 3);
  assert.equal(data.status, "PENDING"); // toApi uppercases enums
  assert.deepEqual(data.runConfig, { templateId: 4, env: "testing" });
});

test("decide: unknown id → 404; deciding twice → 409", async () => {
  const notFound = svc({ decide: async () => null, findById: async () => null });
  await assert.rejects(() => notFound.decide(7, "approved", 1), { status: 404 });

  const decided = svc({
    decide: async () => null, // the UPDATE carries "AND status = 'pending'", so no row comes back
    findById: async () => ({ request_id: 7, status: "rejected" }),
  });
  await assert.rejects(() => decided.decide(7, "approved", 1), {
    status: 409,
    code: "ALREADY_DECIDED",
  });
});

test("decide: approving records who decided and does NOT start a run", async () => {
  let written;
  const s = svc({
    decide: async (id, status, by) => {
      written = { id, status, by };
      return { request_id: id, status, decided_by: by, run_config: null };
    },
  });
  const data = await s.decide(7, "approved", 1);
  assert.deepEqual(written, { id: 7, status: "approved", by: 1 });
  assert.equal(data.status, "APPROVED");
  assert.equal(data.runConfig, null); // a run with no config must not 500 the queue page
});

// Issue #97 asks for the permission matrix of all four roles. requireRole exposes .roles, so the
// assertion reads the app's own middleware instead of a hand-written doc table.
test("RBAC: Dev may request a rerun but may not decide, run or cancel one", () => {
  const rolesOf = (layers, path, method) => {
    const layer = layers.find(
      (l) => l.route && l.route.path === path && l.route.methods[method],
    );
    assert.ok(layer, `route ${method.toUpperCase()} ${path} is not declared`);
    const guard = layer.route.stack.map((h) => h.handle).find((h) => h.roles);
    return guard ? guard.roles : ["admin", "tester", "dev", "viewer"]; // no requireRole = any signed-in user
  };

  const rerun = require("../src/routes/rerunRequests.routes").stack;
  const runs = require("../src/routes/runs.routes").stack;

  assert.deepEqual(rolesOf(rerun, "/runs/:id/rerun-requests", "post"), ["admin", "tester", "dev"]);
  assert.deepEqual(rolesOf(rerun, "/rerun-requests/:id/approve", "post"), ["admin", "tester"]);
  assert.deepEqual(rolesOf(rerun, "/rerun-requests/:id/reject", "post"), ["admin", "tester"]);
  assert.deepEqual(rolesOf(runs, "/:id/rerun", "post"), ["admin", "tester"]);
  assert.deepEqual(rolesOf(runs, "/:id/cancel", "post"), ["admin", "tester"]);
  // Viewer is the only role with no write at all: it is not in any list above.
  assert.ok(!rolesOf(rerun, "/runs/:id/rerun-requests", "post").includes("viewer"));
});
