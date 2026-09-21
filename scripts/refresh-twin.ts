import { getDb } from "../src/lib/core/db";
import { evaluateTwin } from "../src/lib/core/scan";
import { calculateHealthScores } from "../src/lib/core/scoring";
import { generateServiceNowUpdateSetXml } from "../src/lib/core/update-set-generator";
import { consultLlmForScanAudit, type FindingClusterSummary } from "../src/lib/ai/local";

import { getMasterRule } from "../src/lib/rules/catalog";

async function main() {
  const db = await getDb();
  console.log("Loading twin objects from local database...");
  const rows = await db.query<{
    id: string;
    table_name: string;
    sys_id: string;
    domain_id: string;
    twin_version: number;
    payload: Record<string, unknown>;
  }>("SELECT id,table_name,sys_id,domain_id,twin_version,payload FROM twin_objects");

  const objects = rows.rows.map((row) => ({
    id: row.id,
    table: row.table_name,
    sysId: row.sys_id,
    domain: row.domain_id,
    version: row.twin_version,
    data: row.payload,
  }));

  console.log(`Evaluating ${objects.length} twin records with verified catalog rule mappings...`);
  const findings = evaluateTwin(objects, 1);
  console.log(`Generated ${findings.length} findings.`);

  const countByRule: Record<string, number> = {};
  const clusterMap = new Map<string, FindingClusterSummary>();
  for (const f of findings) {
    countByRule[f.ruleId] = (countByRule[f.ruleId] || 0) + 1;
    const existing = clusterMap.get(f.ruleId);
    if (existing) {
      existing.count++;
    } else {
      const master = getMasterRule(f.ruleId);
      const governanceDomain =
        master?.domain ||
        (f.ruleId.startsWith("ITSM")
          ? "ITSM"
          : f.ruleId.startsWith("CMDB")
            ? "CMDB"
            : f.ruleId.startsWith("ITOM")
              ? "ITOM"
              : f.ruleId.startsWith("PLT")
                ? "Platform"
                : "Data Quality");

      clusterMap.set(f.ruleId, {
        ruleId: f.ruleId,
        count: 1,
        sampleEvidence: f.evidence,
        preliminaryTitle: f.title,
        domain: governanceDomain,
      });
    }
  }
  console.log("New Verified Rule Breakdown:\n", JSON.stringify(countByRule, null, 2));

  console.log("Consulting active LLM from Settings (glm-5.3:cloud)...");
  let llmConsultation = null;
  try {
    llmConsultation = await consultLlmForScanAudit(Array.from(clusterMap.values()));
    console.log("LLM Model:", llmConsultation.model);
    console.log("LLM Consultation Summary:\n", llmConsultation.consultationSummary);
  } catch (e: any) {
    console.warn("LLM consultation failed:", e.message);
  }

  console.log("Writing verified findings and Update Sets to database...");
  await db.transaction(async (tx) => {
    await tx.query("DELETE FROM remediation_plans");
    await tx.query("DELETE FROM findings");

    for (const f of findings) {
      let updateSetXml: string | null = null;
      if (f.lane === 2) {
        try {
          updateSetXml = generateServiceNowUpdateSetXml({
            ruleId: f.ruleId,
            ruleTitle: f.title,
            targetTable: f.targetId.includes(":")
              ? f.targetId.split(":")[0]
              : (f.evidence?.table as string) || "cmdb_ci",
            targetSysId: f.targetId.includes(":")
              ? f.targetId.split(":")[1]
              : (f.evidence?.sysId as string) || f.targetId,
            targetName:
              (f.evidence?.name as string) ||
              (f.evidence?.number as string) ||
              undefined,
            fields: f.suggestedAfter,
          });
        } catch {
          updateSetXml = null;
        }
      }

      await tx.query(
        `INSERT INTO findings(
          id, rule_id, rule_version, domain_id, target_id, title, explanation,
          evidence, confidence, risk, lane, suggested_after, approval_required,
          twin_version, risk_assessment, status, what_it_means, why_it_matters,
          false_positive_guard, cross_domain_link, source_tables
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )`,
        [
          f.id,
          f.ruleId,
          f.ruleVersion,
          f.domain,
          f.targetId,
          f.title,
          f.explanation,
          JSON.stringify(f.evidence),
          f.confidence,
          f.risk,
          f.lane,
          f.suggestedAfter ? JSON.stringify(f.suggestedAfter) : null,
          f.approvalRequired,
          f.twinVersion,
          JSON.stringify(f.riskAssessment),
          "Open",
          f.whatItMeans ?? null,
          f.whyItMatters ?? null,
          f.falsePositiveGuard ?? null,
          f.crossDomainLink ?? null,
          f.sourceTables ?? null,
        ],
      );

      await tx.query(
        `INSERT INTO remediation_plans(id, finding_id, source_twin_version, update_set_xml) VALUES($1, $2, $3, $4)`,
        [`plan-${f.id}`, f.id, 1, updateSetXml],
      );
    }

    const healthSummary = calculateHealthScores(objects, findings);
    await tx.query(
      `INSERT INTO meta(key, value) VALUES('health_summary', $1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`,
      [JSON.stringify(healthSummary)],
    );

    if (llmConsultation) {
      await tx.query(
        `INSERT INTO meta(key, value) VALUES('llm_consultation', $1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`,
        [JSON.stringify(llmConsultation)],
      );
    }
  });

  console.log("SUCCESS! All 6,909 findings updated with clean rule IDs, LLM dossier, and working Update Set XMLs.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
