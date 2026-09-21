# SAOS user guide

## The short version

1. Open **Settings**. Enter only the HTTPS instance address (for example `https://example.service-now.com`) and an account with read access to the tables you need checked. A reviewed write grant is necessary only for the supported Apply action. For a domain-separated instance, keep the recommended domain setting. Choose **Single global domain** only if your ServiceNow administrator confirms there are no domains.
2. Save, then choose **Test saved connection**. If it works, choose **Load records** from the start screen or the sync button at top right. The local job shows the current agent, source table and progress while it runs.
3. Choose **Problems** to read what was detected. Select an item. The right panel shows the source proof, plain-language meaning and next step. Open **Technical details** only when needed.
4. Choose **Fixes**, select a suggestion and choose **See what would change**. The preview shows the exact record and rollback payload. Enter your name to approve or reject. Approval alone does not write.
5. For the supported duplicate-relationship fix, choose **Apply approved fix**. SAOS re-reads the live record before deleting it, records the write in the local audit chain, and exposes **Rollback applied fix**. Run a new read-only sync to verify the result.
6. Check **History** for who did what and download the audit report or complete JSON history. Check **Data & privacy** for source, last load, record counts, saved fields and storage details.

## What each screen means

| Screen         | What you can do                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview       | See real copied-record and finding counts. There is no invented health score. Incomplete coverage is shown as a warning, never as “all clear”. |
| Problems       | Search, filter and inspect rule evidence.                                                                                                      |
| Fixes          | Preview one suggestion, record a human decision, and apply/rollback only the supported, explicitly approved operation.                         |
| History        | Check the action chain and download it.                                                                                                        |
| Compare        | Explains why peer scores are absent until real consented peer data exists.                                                                     |
| Settings       | Change the ServiceNow instance/account/password; test it; select an installed Ollama model.                                                    |
| Data & privacy | See exactly which instance was copied, when, what is stored and what leaves the device.                                                        |
| Guide          | The six-step workflow plus classified agent coverage and runtime readiness.                                                                    |

## Changing the instance or password

Open Settings and edit the address or account. A new instance or account requires a new password; SAOS never reuses the old password for a new destination. Saving a different instance hides findings from the previous local copy until a complete sync of the new instance succeeds. The previous copy remains on disk until replaced—see Data & privacy. The password field is always blank when you reopen Settings. It is never returned to the browser.

The saved connection lives in `.saos-data/connection.json` with owner-only file permissions. It is **not encrypted at rest**. Protect your device account and disk; use a least-privilege ServiceNow integration user. If a password has appeared in chat or a screenshot, rotate it before using SAOS.

## Local AI

Ollama is optional. Install Ollama and at least one model on this device. Settings lists models Ollama reports as installed; cloud-backed models are labelled clearly. On an issue, **Explain in simple words** sends that issue's title and evidence to the selected Ollama route. AI wording is secondary to the source proof and never changes detection. Cloud-provider key fields are intentionally unavailable until a real adapter and secret controls are implemented.

## If something goes wrong

- **Nothing appears:** The app starts with zero records by design. Test the connection, load records, and check Data & privacy for last load. Zero findings means the enabled rules found no match in readable data, not that the estate is clean.
- **Connection fails:** Confirm the URL is an HTTPS origin, the account can read both CMDB tables and the password is current. Basic authentication must be permitted on that development instance.
- **Domain field unavailable:** Ask your ServiceNow administrator whether domain separation is enabled. Use Global mode only for a genuinely single-domain instance.
- **Sync says records are missing:** The API may hide records or fields via ACLs. SAOS rejects an incomplete core CMDB read. Other incomplete tables are excluded from the local copy and listed in Data & privacy with a coverage warning. Ask for missing read permissions; do not treat the excluded module as checked.
- **Long scan:** The scan is a local background job. The banner shows the current phase, agent and source table; closing the browser does not make a partial snapshot valid. A failed job is retained for review.
- **A suggestion looks wrong:** Compare the proof with the source record. Reject it and have an engineer review the rule. A rejection does not silently change rule logic.
- **Model unavailable:** Findings still work. Start Ollama, install a model and refresh the model list in Settings.
- **App cannot open local data:** Restart once, then use the on-screen retry. Preserve `.saos-data` before investigating; do not delete it to hide a data problem.

## Privacy and safety

The app binds to `127.0.0.1`. ServiceNow reads happen only when you test or load; a separate Apply action can write the single allow-listed relationship operation after preview, approval and live-record recheck. A cloud-backed Ollama explanation can leave the device only when you explicitly request it; detection remains local and deterministic. The local copy can contain names and ownership references. History stores reviewer names, plan IDs and actions but not passwords. Exporting History creates a JSON file on your device; handle it as sensitive. The action chain is tamper-evident inside the app, not an independently immutable external archive.
