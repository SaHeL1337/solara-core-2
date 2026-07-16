import { jobService } from "./modules/jobs/job.service";

const POLL_INTERVAL_MS = 5000;

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

    try {
      await jobService.processCompletedResearch();
    } catch (error) {
      console.error("Worker error processing research:", error);
    }

    try {
      await jobService.processFleetMovements();
    } catch (error) {
      console.error("Worker error processing fleet movements:", error);
    }

    try {
      await jobService.processConquestTicks();
    } catch (error) {
      console.error("Worker error processing conquest ticks:", error);
    }
  }, POLL_INTERVAL_MS);
}

startWorker();
