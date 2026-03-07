import { Queue, QueueEvents, Worker, type Job } from "bullmq";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { createDelta } from "./deltaService.js";
import { completePatch } from "./patchService.js";
import { createProject, getProject } from "./projectService.js";

const connection = {
  connection: {
    url: config.redisUrl,
  },
};

type IngestJobPayload = {
  userId: string;
  projectId?: string;
  projectName?: string;
  sourceType: "zip" | "repo" | "clipboard" | "folder";
  sourceUri?: string;
  metadata: Record<string, unknown>;
};

type DeltaScanPayload = {
  projectId: string;
  direction: "builder" | "local";
};

type PatchJobPayload = {
  deltaId: string;
};

// Lazy initialization to prevent Redis connection on startup
let ingestQueue: Queue<IngestJobPayload> | null = null;
let deltaQueue: Queue<DeltaScanPayload> | null = null;
let patchQueue: Queue<PatchJobPayload> | null = null;
let queueEvents: QueueEvents[] = [];
let queueMap: Map<string, Queue> | null = null;

function getIngestQueue() {
  if (!ingestQueue) {
    ingestQueue = new Queue<IngestJobPayload>("ingest", connection);
    queueEvents.push(new QueueEvents("ingest", connection));
  }
  return ingestQueue;
}

function getDeltaQueue() {
  if (!deltaQueue) {
    deltaQueue = new Queue<DeltaScanPayload>("delta-scan", connection);
    queueEvents.push(new QueueEvents("delta-scan", connection));
  }
  return deltaQueue;
}

function getPatchQueue() {
  if (!patchQueue) {
    patchQueue = new Queue<PatchJobPayload>("patch-generate", connection);
    queueEvents.push(new QueueEvents("patch-generate", connection));
  }
  return patchQueue;
}

function getQueueMap() {
  if (!queueMap) {
    queueMap = new Map<string, Queue>([
      ["ingest", getIngestQueue()],
      ["delta-scan", getDeltaQueue()],
      ["patch-generate", getPatchQueue()],
    ]);
  }
  return queueMap;
}

export async function enqueueIngestJob(payload: IngestJobPayload) {
  const job = await getIngestQueue().add("ingest", payload, baseJobOptions());
  return job.id;
}

export async function enqueueDeltaScanJob(payload: DeltaScanPayload) {
  const job = await getDeltaQueue().add("delta-scan", payload, baseJobOptions());
  return job.id;
}

export async function enqueuePatchJob(payload: PatchJobPayload) {
  const job = await getPatchQueue().add("patch-generate", payload, baseJobOptions());
  return job.id;
}

export async function getJobStatus(jobId: string) {
  const queues = [getIngestQueue(), getDeltaQueue(), getPatchQueue()];
  for (const q of queues) {
    const job = await q.getJob(jobId);
    if (job) {
      const state = await job.getState();
      const progress = typeof job.progress === "number" ? job.progress : undefined;
      return {
        jobId,
        status: state as "queued" | "active" | "completed" | "failed" | "unknown",
        progress,
        result: job.returnvalue,
      };
    }
  }
  return { jobId, status: "unknown" as const };
}

function baseJobOptions() {
  return {
    jobId: randomUUID(),
    removeOnComplete: 1000,
    removeOnFail: 1000,
  };
}

if (process.env.RUN_WORKER === "true") {
  new Worker<IngestJobPayload>(
    "ingest",
    async (job: Job<IngestJobPayload>) => {
      job.updateProgress(10);
      const projectId = await ensureProject(job.data);
      job.updateProgress(60);
      await new Promise((resolve) => setTimeout(resolve, 200));
      job.updateProgress(90);
      await new Promise((resolve) => setTimeout(resolve, 200));
      job.updateProgress(100);
      return { message: "Ingest pipeline placeholder complete", projectId };
    },
    connection,
  );

  new Worker<DeltaScanPayload>(
    "delta-scan",
    async (job: Job<DeltaScanPayload>) => {
      job.updateProgress(5);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await createDelta({
        projectId: job.data.projectId,
        source: job.data.direction,
        title: `Detected drift from ${job.data.direction}`,
        impact: "config mismatch",
        action: "Review changes",
        payload: { files: ["src/app/page.tsx"] },
      });
      job.updateProgress(100);
      return { message: "Delta recorded" };
    },
    connection,
  );

  new Worker<PatchJobPayload>(
    "patch-generate",
    async (job: Job<PatchJobPayload>) => {
      job.updateProgress(25);
      await new Promise((resolve) => setTimeout(resolve, 200));
      const fakeUrl = `https://storage.local/patches/${job.id}.diff`;
      await completePatch(job.id!, fakeUrl);
      job.updateProgress(100);
      return { artifactUrl: fakeUrl };
    },
    connection,
  );
}

queueEvents.forEach((events) =>
  events.on("failed", async ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
    console.error(`[${events.name}] job ${jobId} failed: ${failedReason}`);
    try {
      const { recordFailure } = await import("./healingService.js");
      const queue = getQueueMap()?.get(events.name);
      if (queue) {
        const job = await queue.getJob(jobId);
        if (job) {
          await recordFailure({
            jobId,
            jobType: events.name,
            projectId: (job.data as { projectId?: string }).projectId,
            errorMessage: failedReason ?? "Unknown error",
            payload: job.data as Record<string, unknown>,
          });
        }
      }
    } catch (err) {
      console.error("Failed to record job failure:", err);
    }
  }),
);

async function ensureProject(job: IngestJobPayload) {
  if (job.projectId) {
    const project = await getProject(job.projectId);
    if (project) {
      return project.id;
    }
  }
  const name = job.projectName ?? `Loom Project ${new Date().toISOString()}`;
  return createProject(job.userId, name, job.metadata.frameworkHint as string | undefined);
}

