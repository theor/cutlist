import { readFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { parseCutlistCsv } from '@aklinker1/cutlist';

const SCRIPT = 'export-cutlist.sh';
const CSV = 'cutlist.csv';

/**
 * Resolve a bash to run the export script with. On Windows a bare `bash` on the
 * PATH often resolves to the WSL launcher (C:\Windows\System32\bash.exe), which
 * can't run the script against a Windows path/OpenSCAD — so prefer Git Bash
 * explicitly. Override with the BASH_BIN env var.
 */
function findBash(): string {
  if (process.env.BASH_BIN) return process.env.BASH_BIN;
  if (process.platform !== 'win32') return 'bash';
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  ];
  return candidates.find((p) => existsSync(p)) ?? 'bash';
}

/**
 * Load parts from a local OpenSCAD project. The project directory is expected
 * to contain `export-cutlist.sh` (which runs OpenSCAD headless and writes
 * `cutlist.csv`). The script is re-run when `refresh=true` or when the CSV
 * doesn't exist yet; otherwise the existing CSV is parsed directly.
 *
 * This only works when the server has access to the local filesystem (i.e. the
 * app is running locally), which is the intended OpenSCAD workflow.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const path = String(query.path ?? '');
  const refresh = query.refresh === 'true';

  if (!path) {
    setResponseStatus(event, 400);
    return { message: 'Missing path parameter' };
  }

  const csvPath = join(path, CSV);
  const csvExists = await access(csvPath).then(
    () => true,
    () => false,
  );

  if (refresh || !csvExists) {
    try {
      await runExport(path);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      // Surface in the dev server terminal too, not just the HTTP response.
      console.error(`[scad-parts] ${SCRIPT} failed in ${path}:\n${detail}`);
      setResponseStatus(event, 500);
      return { message: `Failed to run ${SCRIPT}`, detail };
    }
  }

  let csv: string;
  try {
    csv = await readFile(csvPath, 'utf-8');
  } catch {
    setResponseStatus(event, 404);
    return { message: `No ${CSV} found in ${path}` };
  }

  try {
    return parseCutlistCsv(csv);
  } catch (err) {
    setResponseStatus(event, 422);
    return {
      message: `Could not parse ${CSV}`,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
});

function runExport(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const bash = findBash();
    const child = spawn(bash, [SCRIPT], { cwd });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', (err) =>
      reject(
        new Error(
          `Could not run "${bash}": ${err.message}. Install Git Bash or set BASH_BIN.`,
        ),
      ),
    );
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${SCRIPT} exited with ${code}`));
    });
  });
}
