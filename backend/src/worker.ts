import { jobService } from "./modules/jobs/job.service";

const POLL_INTERVAL_MS = 30000;

async function startWorker() {
  console.log("Starting background worker...");

  setInterval(async () => {
    try {
      await jobService.processCompletedBuildings();
    } catch (error) {
      console.error("Worker error processing buildings:", error);
    }

    try {
      await jobService.processCompletedShips();
    } catch (error) {
      console.error("Worker error processing ships:", error);
    }
  }, POLL_INTERVAL_MS);
}

startWorker();
