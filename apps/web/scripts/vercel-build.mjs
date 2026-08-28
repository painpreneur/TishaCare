// Vercel runs this in preference to `build` (see package.json "vercel-build").
//
// On a PRODUCTION deploy it applies pending Prisma migrations to that
// contour's database first — the Neon path that works, unlike `migrate
// deploy` from a dev machine (P1017). If a migration fails the build fails
// and the previous deployment stays live.
//
// Preview / development deploys only build: staging migrations are a
// deliberate step (manual `prisma migrate deploy` with staging creds), not
// something every open PR does to the shared branch.
import { execSync } from "node:child_process";

const SCHEMA = "../../packages/db/prisma/schema.prisma";
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DIRECT_URL) {
    console.error(
      "vercel-build: VERCEL_ENV=production but DIRECT_URL is unset. Set it to " +
        "the non-pooled Neon endpoint in the Production environment — Prisma " +
        "Migrate needs a session lock the -pooler endpoint drops."
    );
    process.exit(1);
  }
  console.log("vercel-build: production — prisma migrate deploy");
  run(`prisma migrate deploy --schema=${SCHEMA}`);
} else {
  console.log(
    `vercel-build: VERCEL_ENV=${process.env.VERCEL_ENV ?? "(unset)"} — skipping migrate deploy`
  );
}

run("npm run build");
