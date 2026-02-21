import { jobService } from "./modules/jobs/job.service";

const POLL_INTERVAL_MS = 1000;

async function startWorker() {
  console.log("Starting background worker...");

  setInterval(async () => {
    try {
      await jobService.processCompletedBuildings();
    } catch (error) {
      console.error("Worker error:", error);
    }
  }, POLL_INTERVAL_MS);
}

startWorker();
