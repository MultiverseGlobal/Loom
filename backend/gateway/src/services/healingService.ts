import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { enqueueIngestJob, enqueuePatchJob } from "./queue.js";
import { requestStructureAnalysis } from "./analyzerClient.js";

export interface JobFailure {
  jobId: string;
  jobType: string;
  projectId?: string;
  errorMessage: string;
  errorStack?: string;
  payload: Record<string, unknown>;
}

export async function recordFailure(failure: JobFailure) {
  const id = randomUUID();
  await db`
    INSERT INTO job_failures (id, job_id, job_type, project_id, error_message, error_stack, payload)
    VALUES (${id}, ${failure.jobId}, ${failure.jobType}, ${failure.projectId ?? null}, ${failure.errorMessage}, ${failure.errorStack ?? null}, ${db.json(failure.payload as any)})
  `;
  return id;
}

export async function attemptAutoHeal(failureId: string) {
  const [failure] = await db`
    SELECT * FROM job_failures WHERE id = ${failureId} AND auto_healed = false
  `;

  if (!failure) {
    return { healed: false, reason: "Already healed or not found" };
  }

  const projectId = failure.project_id as string | null;
  if (!projectId) {
    return { healed: false, reason: "No project ID associated" };
  }

  try {
    if (failure.job_type === "ingest") {
      const payload = failure.payload as any;
      const newJobId = await enqueueIngestJob({
        ...payload,
        projectId,
        metadata: {
          ...payload.metadata,
          retryFromFailure: failureId,
          autoHealed: true,
        },
      });

      await db`
        UPDATE job_failures
        SET auto_healed = true, healed_at = now()
        WHERE id = ${failureId}
      `;

      return { healed: true, newJobId, action: "Re-queued ingest job" };
    }

    if (failure.job_type === "reconstruct" || failure.job_type === "export") {
      const analysis = await requestStructureAnalysis({
        files: [],
      });

      if (analysis && analysis.nodes) {
        await db`
          UPDATE job_failures
          SET auto_healed = true, healed_at = now()
          WHERE id = ${failureId}
        `;

        return {
          healed: true,
          action: "Re-analyzed structure, ready for retry",
          analysis,
        };
      }
    }

    return { healed: false, reason: "Healing strategy not available for this job type" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { healed: false, reason: `Healing attempt failed: ${errorMessage}` };
  }
}

export async function getRecentFailures(projectId?: string, limit = 10) {
  const query = projectId
    ? db`SELECT * FROM job_failures WHERE project_id = ${projectId} ORDER BY created_at DESC LIMIT ${limit}`
    : db`SELECT * FROM job_failures ORDER BY created_at DESC LIMIT ${limit}`;

  return query;
}

export async function markHealed(failureId: string) {
  await db`
    UPDATE job_failures
    SET auto_healed = true, healed_at = now()
    WHERE id = ${failureId}
  `;
}

