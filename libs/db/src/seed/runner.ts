import { parseArgs } from "node:util";
import { getTableName, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import type { Seeder } from "./types";

export interface SeedRuntimeConfig {
  databaseUrl: string;
  /** When true, refuse to run without `--force`; require `--yes` for `--reset`. */
  isProduction: boolean;
}

export interface RunSeedOptions {
  /**
   * Called lazily — only when a command actually needs to connect (so
   * `--help` and `--list` work in a fresh checkout with no `.env`).
   */
  loadConfig: () => SeedRuntimeConfig;
  seeders: readonly Seeder[];
  /** Defaults to `process.argv.slice(2)`. */
  argv?: string[];
}

interface ParsedFlags {
  only: string[];
  reset: boolean;
  force: boolean;
  yes: boolean;
  list: boolean;
  help: boolean;
}

const HELP = `Usage: seed [options]

Options:
  --only <name>     Run only the named seeder (repeatable)
  --reset           Truncate each seeder's tables before running it
  --force           Allow running when NODE_ENV=production
  --yes             Confirm destructive flags (required with --reset)
  --list            List available seeders and exit
  -h, --help        Show this help and exit

Examples:
  pnpm db:seed
  pnpm db:seed -- --only items
  pnpm db:seed -- --reset --yes
  pnpm db:seed -- --force --reset --yes      # production (be careful)
`;

function parseFlags(argv: string[]): ParsedFlags {
  const { values } = parseArgs({
    args: argv,
    options: {
      only: { type: "string", multiple: true },
      reset: { type: "boolean" },
      force: { type: "boolean" },
      yes: { type: "boolean" },
      list: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
    allowPositionals: false,
  });
  return {
    only: (values.only as string[] | undefined) ?? [],
    reset: values.reset === true,
    force: values.force === true,
    yes: values.yes === true,
    list: values.list === true,
    help: values.help === true,
  };
}

function selectSeeders(
  all: readonly Seeder[],
  only: string[],
): readonly Seeder[] {
  if (only.length === 0) return all;
  const known = new Set(all.map((s) => s.name));
  const unknown = only.filter((n) => !known.has(n));
  if (unknown.length > 0) {
    const available = all.map((s) => s.name).join(", ");
    throw new Error(
      `Unknown seeder(s): ${unknown.join(", ")}. Available: ${available}`,
    );
  }
  // Preserve registry order (matters for FK dependencies).
  const wanted = new Set(only);
  return all.filter((s) => wanted.has(s.name));
}

function formatList(seeders: readonly Seeder[]): string {
  if (seeders.length === 0) return "(no seeders registered)";
  const width = Math.max(...seeders.map((s) => s.name.length));
  return seeders
    .map((s) => {
      const tables = s.tables?.map((t) => getTableName(t)).join(", ") ?? "—";
      const desc = s.description ?? "";
      return `  ${s.name.padEnd(width)}  tables: ${tables}${desc ? `  · ${desc}` : ""}`;
    })
    .join("\n");
}

/**
 * CLI entrypoint for seeding. Parses flags from `argv`, applies safety guards,
 * then runs the selected seeders one at a time, each inside its own transaction.
 *
 * Safety:
 *   - Refuses to run when `isProduction` is true unless `--force` is passed.
 *   - Refuses `--reset` unless `--yes` is also passed.
 *
 * Exits the process via `throw` on error — callers should let it bubble so
 * the non-zero exit code reaches the shell.
 */
export async function runSeedCli(opts: RunSeedOptions): Promise<void> {
  const argv = opts.argv ?? process.argv.slice(2);
  let flags: ParsedFlags;
  try {
    flags = parseFlags(argv);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`seed: ${msg}\n\n${HELP}`);
    throw err;
  }

  if (flags.help) {
    process.stdout.write(HELP);
    return;
  }

  if (flags.list) {
    process.stdout.write(`Registered seeders:\n${formatList(opts.seeders)}\n`);
    return;
  }

  if (flags.reset && !flags.yes) {
    throw new Error("seed: --reset truncates tables. Pass --yes to confirm.");
  }

  const selected = selectSeeders(opts.seeders, flags.only);
  if (selected.length === 0) {
    process.stdout.write("seed: nothing to run\n");
    return;
  }

  const config = opts.loadConfig();

  if (config.isProduction && !flags.force) {
    throw new Error(
      "seed: refusing to run with NODE_ENV=production. Pass --force to override.",
    );
  }

  const client = postgres(config.databaseUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema });

  const startedAll = Date.now();
  process.stdout.write(
    `seed: running ${selected.length} seeder(s)${flags.reset ? " (with --reset)" : ""}\n`,
  );

  try {
    for (const seeder of selected) {
      const started = Date.now();
      process.stdout.write(`  → ${seeder.name}\n`);

      await db.transaction(async (tx) => {
        if (flags.reset && seeder.tables && seeder.tables.length > 0) {
          const names = seeder.tables.map((t) => getTableName(t)).join(", ");
          process.stdout.write(`    reset: truncating ${names}\n`);
          const targets = sql.join(
            seeder.tables.map((t) => sql`${t}`),
            sql.raw(", "),
          );
          await tx.execute(
            sql`TRUNCATE TABLE ${targets} RESTART IDENTITY CASCADE`,
          );
        }
        await seeder.run({
          db: tx,
          log: (m) => process.stdout.write(`    ${m}\n`),
        });
      });

      process.stdout.write(`    ok (${Date.now() - started}ms)\n`);
    }
    process.stdout.write(`seed: done in ${Date.now() - startedAll}ms\n`);
  } finally {
    await client.end();
  }
}
