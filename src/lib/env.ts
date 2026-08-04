import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PULSE_BASE_URL: z.string().url().default("http://localhost:3000"),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // `next build` collects pages without a real environment; don't hard-fail there.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return envSchema.parse({
        DATABASE_URL: "postgresql://build-placeholder",
        PULSE_BASE_URL: "http://localhost:3000",
      });
    }

    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
