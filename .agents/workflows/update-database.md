---
description: How to update the database schema and push changes with Prisma
---

# Updating Prisma Database Schema

When making changes to `/root/solara-core/backend/prisma/schema.prisma`, you need to apply them correctly so that `docker-compose watch` doesn't overwrite your newly generated client.

// turbo-all
1. Regenerate the Prisma Client ON THE HOST
The client must be generated on the host so that docker-compose can seamlessly sync the new `generated` folder into the containers without overwriting it with older local state.
```bash
cd /root/solara-core/backend && npx prisma generate
```

2. Push the Database Schema Updates VIA CONTAINER
Pushing schema updates needs to connect to the Postgres database, which is on the private docker network. So this must be run inside the backend container.
```bash
cd /root/solara-core && docker-compose exec backend sh -c 'npx prisma db push'
```

3. Restart Node Services
You MUST manually restart the backend and worker containers to enforce hot-reloading the newly generated nested code out of NodeJS memory caching.
```bash
cd /root/solara-core && docker-compose restart backend worker
```
