import { getUserState } from "./modules/users/users.service";

async function run() {
  try {
    console.log("Calling getUserState...");
    const state = await getUserState("user_3FRlFiMM5RDJ3rUe5h0EuD6ojEN");
    console.log("SUCCESS:", JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("ERROR FETCHING USER STATE:", err);
  }
}

run();
