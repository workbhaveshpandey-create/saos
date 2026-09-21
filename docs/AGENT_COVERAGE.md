# Agent coverage contract

SAOS exposes every planned agent through `/api/agents` and the Guide screen. The catalog is a product contract, not synthetic output.

- **Ready** means the agent has implemented logic, required source fields, evidence, and an integration test.
- **Partial** means only the named checks are implemented. It must not be presented as full domain coverage.
- **Planned** means the rule pack is not implemented. It produces no findings even if its source table was copied.
- **Blocked** means required source records were not verified as readable; it is not an agent execution success.

Current catalog: **44 agents — 1 ready, 10 partial, 33 planned**. Runtime status can be lower when a source table is missing or a baseline does not exist.

The only fully ready sensing agent is Extraction for a complete local `cmdb_ci` and `cmdb_rel_ci` snapshot. If optional tables are unavailable, Extraction is reported as partial at runtime. Current partial agents are Change Detection, CMDB Completeness, CMDB Correctness, Relationship Integrity, SLA and Process Debt, ITSM Process Conformance, HRSD, CSM, SecOps and Remediation Planner. Those last five run one narrow, evidence-backed rule each—not full module analysis. Data Quality has no implemented cross-table rule and remains planned. The remaining catalog entries are visible so the missing rule packs and source requirements are explicit.

No LLM may create a finding, severity, confidence, permission decision or production action. Every future agent must add deterministic fixtures, source-field validation, domain/ACL handling, evidence output, and an integration test before its status can change to Ready.
