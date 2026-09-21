import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createTcpServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const scratch = await mkdtemp(join(tmpdir(), "saos-qa-"));
const cert = join(scratch, "cert.pem");
const key = join(scratch, "key.pem");
execFileSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-sha256",
    "-nodes",
    "-days",
    "1",
    "-keyout",
    key,
    "-out",
    cert,
    "-subj",
    "/CN=127.0.0.1",
    "-addext",
    "subjectAltName=IP:127.0.0.1",
  ],
  { stdio: "ignore" },
);

const ci = [
  {
    sys_id: "app-1",
    sys_domain: "global",
    name: "Billing API",
    sys_class_name: "cmdb_ci_service",
    assigned_to: "",
    owned_by: "",
    managed_by: "",
    support_group: "",
    last_discovered: "2026-09-18 10:00:00",
    sys_updated_on: "2026-09-18 10:00:00",
  },
  {
    sys_id: "host-1",
    sys_domain: "global",
    name: "billing-01",
    sys_class_name: "cmdb_ci_server",
    assigned_to: "owner-1",
    owned_by: "",
    managed_by: "",
    support_group: "ops",
    last_discovered: "2020-01-01 10:00:00",
    sys_updated_on: "2026-09-18 10:00:00",
  },
  {
    sys_id: "tenant-host",
    sys_domain: "tenant-1",
    name: "billing-01",
    sys_class_name: "cmdb_ci_server",
    assigned_to: "owner-2",
    owned_by: "",
    managed_by: "",
    support_group: "tenant-ops",
    last_discovered: "2026-09-18 10:00:00",
    sys_updated_on: "2026-09-18 10:00:00",
  },
];
const rel = [
  {
    sys_id: "rel-1",
    parent: "app-1",
    child: "host-1",
    type: "depends-on",
    sys_updated_on: "2026-09-18 10:00:00",
  },
  {
    sys_id: "rel-2",
    parent: "app-1",
    child: "host-1",
    type: "depends-on",
    sys_updated_on: "2026-09-18 10:00:00",
  },
];
const workTables = {
  incident: [
    {
      sys_id: "inc-1",
      sys_domain: "global",
      number: "INC001",
      active: "true",
      priority: "1",
      assigned_to: "",
      sys_updated_on: "2026-09-18 10:00:00",
    },
  ],
  sn_hr_core_case: [
    {
      sys_id: "hr-1",
      sys_domain: "global",
      number: "HRC001",
      active: "true",
      priority: "1",
      assigned_to: "",
      sys_updated_on: "2026-09-18 10:00:00",
    },
  ],
  sn_customerservice_case: [
    {
      sys_id: "csm-1",
      sys_domain: "global",
      number: "CSM001",
      active: "true",
      priority: "1",
      assigned_to: "",
      sys_updated_on: "2026-09-18 10:00:00",
    },
  ],
  sn_si_incident: [
    {
      sys_id: "sec-1",
      sys_domain: "global",
      number: "SIR001",
      active: "true",
      priority: "1",
      assigned_to: "",
      sys_updated_on: "2026-09-18 10:00:00",
    },
  ],
  task_sla: [
    {
      sys_id: "sla-1",
      sys_domain: "global",
      task: "inc-1",
      sla: "sla-def-1",
      has_breached: "true",
      sys_updated_on: "2026-09-18 10:00:00",
    },
  ],
};
const dictionary = [
  "sys_id",
  "sys_domain",
  "sys_updated_on",
  "name",
  "sys_class_name",
  "assigned_to",
  "owned_by",
  "managed_by",
  "support_group",
  "last_discovered",
  "serial_number",
  "asset_tag",
  "fqdn",
  "parent",
  "child",
  "type",
].flatMap((element) => [
  { name: "cmdb_ci", element },
  { name: "cmdb_rel_ci", element },
]);
let incomplete = false;
let nonGetCalls = 0;
let allowedWriteCalls = 0;
const mock = createHttpsServer(
  { cert: await readFile(cert), key: await readFile(key) },
  (request, response) => {
    if (
      request.headers.authorization !==
      `Basic ${Buffer.from("qa-reader:qa-secret").toString("base64")}`
    ) {
      response.writeHead(401).end();
      return;
    }
    const url = new URL(request.url, "https://127.0.0.1");
    if (request.method === "DELETE" && url.pathname.includes("/cmdb_rel_ci/")) {
      const id = url.pathname.split("/").pop();
      const index = rel.findIndex((row) => row.sys_id === id);
      if (index < 0) {
        response.writeHead(404).end();
        return;
      }
      rel.splice(index, 1);
      allowedWriteCalls++;
      response.writeHead(204).end();
      return;
    }
    if (request.method === "POST" && url.pathname.endsWith("/cmdb_rel_ci")) {
      let body = "";
      request.on("data", (chunk) => (body += chunk));
      request.on("end", () => {
        const payload = JSON.parse(body);
        rel.push({ ...payload, sys_id: payload.sys_id ?? "restored-rel" });
        allowedWriteCalls++;
        response.writeHead(201, { "content-type": "application/json" });
        response.end(JSON.stringify({ result: rel.at(-1) }));
      });
      return;
    }
    if (request.method !== "GET") {
      nonGetCalls++;
      response.writeHead(405).end();
      return;
    }
    const rows = url.pathname.endsWith("/cmdb_ci")
      ? ci
      : url.pathname.endsWith("/cmdb_rel_ci") ||
          url.pathname.includes("/cmdb_rel_ci/")
        ? url.pathname.includes("/cmdb_rel_ci/")
          ? rel.filter((row) => row.sys_id === url.pathname.split("/").pop())
          : rel
        : Object.keys(workTables).some((table) =>
              url.pathname.endsWith(`/${table}`),
            )
          ? workTables[url.pathname.split("/").pop()]
          : url.pathname.endsWith("/sys_db_object")
            ? ["cmdb_ci", "cmdb_rel_ci", ...Object.keys(workTables)].map(
                (name) => ({ name }),
              )
            : url.pathname.endsWith("/sys_dictionary")
              ? dictionary
              : null;
    if (!rows) {
      response.writeHead(404).end();
      return;
    }
    if (url.pathname.includes("/cmdb_rel_ci/")) {
      if (rows.length === 0) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ result: rows[0] }));
      return;
    }
    const offset = Number(url.searchParams.get("sysparm_offset") ?? 0);
    const limit = Number(url.searchParams.get("sysparm_limit") ?? 500);
    response.writeHead(200, {
      "content-type": "application/json",
      "x-total-count": String(
        rows.length + (incomplete && rows === ci ? 1 : 0),
      ),
    });
    response.end(
      JSON.stringify({ result: rows.slice(offset, offset + limit) }),
    );
  },
);
await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
const mockPort = mock.address().port;

async function freePort() {
  const server = createTcpServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
const appPort = await freePort();
const base = `http://127.0.0.1:${appPort}`;
const app = spawn(
  join(root, "node_modules/.bin/next"),
  ["start", "-H", "127.0.0.1", "-p", String(appPort)],
  {
    cwd: root,
    env: {
      ...process.env,
      SAOS_DATA_DIR: join(scratch, "postgres"),
      SERVICENOW_INSTANCE_URL: `https://127.0.0.1:${mockPort}`,
      SERVICENOW_USERNAME: "qa-reader",
      SERVICENOW_PASSWORD: "qa-secret",
      SERVICENOW_DOMAIN_MODE: "separated",
      SAOS_SCAN_TABLES: `cmdb_ci,cmdb_rel_ci,${Object.keys(workTables).join(",")}`,
      NODE_EXTRA_CA_CERTS: cert,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "pipe",
  },
);
let output = "";
app.stdout.on("data", (chunk) => {
  output += chunk;
});
app.stderr.on("data", (chunk) => {
  output += chunk;
});

async function request(path, options = {}) {
  const response = await fetch(base + path, options);
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}
async function post(path, data, headers = {}) {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: data ? JSON.stringify(data) : undefined,
  });
}
async function waitJob(id) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const job = await request(`/api/scan/jobs/${id}`);
    if (job.json.status === "completed" || job.json.status === "failed")
      return job;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Job did not finish: ${id}`);
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (app.exitCode !== null) throw new Error(`App exited early: ${output}`);
    try {
      const state = await request("/api/state");
      if (state.status === 200) {
        ready = true;
        break;
      }
    } catch {
      /* server not ready */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, `App did not start: ${output}`);
  const empty = await request("/api/state");
  assert.equal(empty.json.objectCount, 0);
  assert.equal(empty.json.plans.length, 0);
  const agents = await request("/api/agents");
  assert.equal(agents.status, 200);
  assert.equal(agents.json.totals.all, agents.json.agents.length);
  assert(agents.json.totals.ready >= 1);
  const runtime = await request("/api/agents/status");
  assert.equal(runtime.status, 200);
  assert.equal(runtime.json.twinHasData, false);
  assert.equal(runtime.json.coverageComplete, false);
  const connected = await post("/api/connection");
  assert.equal(connected.status, 200, JSON.stringify(connected.json));
  const synced = await post("/api/sync");
  assert.equal(synced.status, 202, JSON.stringify(synced.json));
  const completedSync = await waitJob(synced.json.jobId);
  assert.equal(
    completedSync.json.status,
    "completed",
    JSON.stringify(completedSync.json),
  );
  assert.equal(completedSync.json.result.sync.count, 10);
  assert.equal(completedSync.json.result.scan.findingCount, 8);
  assert.equal(completedSync.json.result.scan.agentRunCount, 44);
  const state = await request("/api/state");
  assert.equal(state.json.objectCount, 10);
  assert.equal(state.json.plans.length, 8);
  assert.equal(state.json.sourceHost, "127.0.0.1");
  assert.equal(state.json.auditIntegrity.valid, true);
  assert.equal(state.json.coverageComplete, false);
  const supportedRuntime = await request("/api/agents/status");
  assert.equal(supportedRuntime.json.twinHasData, true);
  assert.equal(supportedRuntime.json.coverageComplete, false);
  assert.equal(
    supportedRuntime.json.agents.find((agent) => agent.id === "extraction")
      .runtimeState,
    "ready",
  );
  const agentRuns = await request("/api/agents/runs");
  assert.equal(agentRuns.status, 200);
  assert.equal(agentRuns.json.runs.length, 44);
  assert.equal(
    agentRuns.json.runs.find((run) => run.agentId === "cmdb-completeness")
      .status,
    "completed",
  );
  for (const agentId of [
    "itsm-conformance",
    "hrsd",
    "csm",
    "secops",
    "sla-process-debt",
  ])
    assert.equal(
      agentRuns.json.runs.find((run) => run.agentId === agentId).status,
      "completed",
    );
  const report = await request("/api/report");
  assert.equal(report.status, 200);
  assert.equal(report.json.verification.productionWriteback, true);
  assert.deepEqual(report.json.verification.writebackScope, [
    "cmdb_rel_ci.delete_relationship",
  ]);
  assert.equal(
    report.json.findings.riskPosture,
    "not-scored-impact-data-missing",
  );
  assert.equal(
    agentRuns.json.runs.find((run) => run.agentId === "change-detection")
      .status,
    "skipped",
  );
  const repeated = state.json.plans.find(
    (plan) => plan.ruleId === "cmdb.relationship.duplicate",
  );
  assert(repeated);
  assert.equal(repeated.riskAssessment.overall, "Not scored");
  assert.equal(repeated.riskAssessment.evidenceCompleteness.score, 100);
  assert(repeated.riskAssessment.cautions.length >= 1);
  const preview = await post(`/api/plans/${repeated.id}/preview`);
  assert.equal(preview.status, 200, JSON.stringify(preview.json));
  assert.equal(preview.json.after.affectedEdges, 1);
  const approved = await post(`/api/plans/${repeated.id}/decision`, {
    decision: "approve",
    actor: "QA reviewer",
  });
  assert.equal(approved.status, 200);
  const applied = await post(`/api/plans/${repeated.id}/apply`, {
    actor: "QA reviewer",
    confirm: "APPLY",
  });
  assert.equal(applied.status, 200, JSON.stringify(applied.json));
  assert.equal(applied.json.targetWrite, true);
  const rolledBack = await post(`/api/plans/${repeated.id}/rollback`, {
    actor: "QA reviewer",
    confirm: "ROLLBACK",
  });
  assert.equal(rolledBack.status, 200, JSON.stringify(rolledBack.json));
  assert.equal(rolledBack.json.targetWrite, true);
  assert.equal(approved.json.targetWrite, false);
  assert.equal(
    (
      await post(`/api/plans/${repeated.id}/decision`, {
        decision: "approve",
        actor: "QA reviewer",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post("/api/scan", undefined, {
        origin: "https://untrusted.example",
      })
    ).status,
    400,
  );
  const loopbackAlias = await post("/api/scan", undefined, {
    origin: `http://localhost:${appPort}`,
  });
  assert.equal(loopbackAlias.status, 202);
  assert.equal(
    (await waitJob(loopbackAlias.json.jobId)).json.status,
    "completed",
  );
  incomplete = true;
  const badSync = await post("/api/sync");
  assert.equal(badSync.status, 202);
  const failedSync = await waitJob(badSync.json.jobId);
  assert.equal(failedSync.json.status, "failed");
  assert.match(failedSync.json.error, /not readable/);
  const preserved = await request("/api/state");
  assert.equal(preserved.json.twinVersion, 1);
  assert.equal(preserved.json.objectCount, 10);
  const changed = await post("/api/config", {
    instanceUrl: "https://127.0.0.1:65534",
    username: "other-reader",
    password: "new-secret",
    domainMode: "separated",
  });
  assert.equal(changed.status, 200, JSON.stringify(changed.json));
  assert(!JSON.stringify(changed.json).includes("new-secret"));
  const hidden = await request("/api/state");
  assert.equal(hidden.json.sourceMismatch, true);
  assert.equal(hidden.json.objectCount, 0);
  assert.equal(hidden.json.storedObjectCount, 10);
  assert.equal(hidden.json.plans.length, 0);
  const changedScan = await post("/api/scan");
  assert.equal(changedScan.status, 202);
  assert.equal((await waitJob(changedScan.json.jobId)).json.status, "failed");
  assert.equal((await post(`/api/plans/${repeated.id}/preview`)).status, 400);
  const audit = await request("/api/audit");
  assert.equal(audit.json.integrity.valid, true);
  assert.equal(
    nonGetCalls,
    0,
    "Connector made an unsupported ServiceNow request",
  );
  assert.equal(
    allowedWriteCalls,
    2,
    "Apply and rollback should be the only ServiceNow writes",
  );
  const modelList = await request("/api/ai/models");
  assert.equal(modelList.status, 200);
  console.log(
    `PASS: empty state, agent coverage, async read-only sync (10 records), 8 exact-rule findings across CMDB/ITSM/HRSD/CSM/SecOps/SLA, domain isolation, preview, approval, audit, incomplete-sync rollback, source switch, CSRF, local model status`,
  );
} finally {
  app.kill("SIGTERM");
  await new Promise((resolve) => mock.close(resolve));
}
