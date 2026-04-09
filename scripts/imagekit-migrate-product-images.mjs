#!/usr/bin/env node
/* eslint-disable */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const DEFAULT_MANIFEST_PATH = path.join(cwd, 'backups', 'product-images-manifest.csv');
const DEFAULT_RESULTS_PATH = path.join(cwd, 'backups', 'product-images-migration-results.jsonl');
const DEFAULT_SUMMARY_PATH = path.join(cwd, 'backups', 'product-images-migration-summary.json');
const DEFAULT_ENV_FILE = path.join(cwd, '.env.imagekit-migration');
const SUPABASE_PAGE_SIZE = 1000;

function parseArgs(argv) {
  const args = {
    dryRun: false,
    batchSize: 25,
    limit: null,
    startAfterId: null,
    onlyProductId: null,
    concurrency: 1,
    envFile: DEFAULT_ENV_FILE,
    manifestPath: DEFAULT_MANIFEST_PATH,
    resultsPath: DEFAULT_RESULTS_PATH,
    summaryPath: DEFAULT_SUMMARY_PATH,
    resume: true,
    failFast: false,
    preferLocal: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--fail-fast') {
      args.failFast = true;
      continue;
    }
    if (arg === '--no-resume') {
      args.resume = false;
      continue;
    }
    if (arg === '--prefer-url') {
      args.preferLocal = false;
      continue;
    }
    if (arg === '--batch-size') {
      args.batchSize = parsePositiveInteger(nextValue(), '--batch-size');
      continue;
    }
    if (arg.startsWith('--batch-size=')) {
      args.batchSize = parsePositiveInteger(arg.slice('--batch-size='.length), '--batch-size');
      continue;
    }
    if (arg === '--limit') {
      args.limit = parsePositiveInteger(nextValue(), '--limit');
      continue;
    }
    if (arg.startsWith('--limit=')) {
      args.limit = parsePositiveInteger(arg.slice('--limit='.length), '--limit');
      continue;
    }
    if (arg === '--start-after-id') {
      args.startAfterId = parsePositiveInteger(nextValue(), '--start-after-id');
      continue;
    }
    if (arg.startsWith('--start-after-id=')) {
      args.startAfterId = parsePositiveInteger(arg.slice('--start-after-id='.length), '--start-after-id');
      continue;
    }
    if (arg === '--only-product-id') {
      args.onlyProductId = parsePositiveInteger(nextValue(), '--only-product-id');
      continue;
    }
    if (arg.startsWith('--only-product-id=')) {
      args.onlyProductId = parsePositiveInteger(arg.slice('--only-product-id='.length), '--only-product-id');
      continue;
    }
    if (arg === '--concurrency') {
      args.concurrency = parsePositiveInteger(nextValue(), '--concurrency');
      continue;
    }
    if (arg.startsWith('--concurrency=')) {
      args.concurrency = parsePositiveInteger(arg.slice('--concurrency='.length), '--concurrency');
      continue;
    }
    if (arg === '--env-file') {
      args.envFile = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--env-file=')) {
      args.envFile = path.resolve(cwd, arg.slice('--env-file='.length));
      continue;
    }
    if (arg === '--manifest') {
      args.manifestPath = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--manifest=')) {
      args.manifestPath = path.resolve(cwd, arg.slice('--manifest='.length));
      continue;
    }
    if (arg === '--results') {
      args.resultsPath = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--results=')) {
      args.resultsPath = path.resolve(cwd, arg.slice('--results='.length));
      continue;
    }
    if (arg === '--summary') {
      args.summaryPath = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--summary=')) {
      args.summaryPath = path.resolve(cwd, arg.slice('--summary='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  args.batchSize = Math.max(1, args.batchSize);
  args.concurrency = Math.max(1, args.concurrency);
  return args;
}

function parsePositiveInteger(rawValue, flagName) {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer`);
  }
  return parsed;
}

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getProjectRefFromSupabaseConfig() {
  const configPath = path.join(cwd, 'supabase', 'config.toml');
  if (!fs.existsSync(configPath)) {
    throw new Error('supabase/config.toml was not found, and SUPABASE_URL was not provided');
  }
  const configText = fs.readFileSync(configPath, 'utf8');
  const match = configText.match(/project_id\s*=\s*"([^"]+)"/);
  if (!match?.[1]) {
    throw new Error('Could not read project_id from supabase/config.toml');
  }
  return match[1].trim();
}

function isRedactedApiKey(value) {
  return typeof value === 'string' && value.includes('····');
}

function getServiceRoleKeyFromCli(projectRef) {
  try {
    const rawJson = execFileSync(
      'supabase',
      ['projects', 'api-keys', '--project-ref', projectRef, '-o', 'json'],
      {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    const apiKeys = JSON.parse(rawJson);
    const legacyServiceRole = apiKeys.find((item) => item?.id === 'service_role' && !isRedactedApiKey(item?.api_key));
    if (!legacyServiceRole?.api_key) {
      throw new Error('Legacy service_role key was not returned by the CLI');
    }
    return legacyServiceRole.api_key;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve service_role key via Supabase CLI: ${message}`);
  }
}

function resolveSupabaseCredentials() {
  const projectRef = getProjectRefFromSupabaseConfig();
  const url = process.env.SUPABASE_URL?.trim() || `https://${projectRef}.supabase.co`;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || getServiceRoleKeyFromCli(projectRef);
  return {
    projectRef,
    url,
    serviceRoleKey,
    source: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? 'env' : 'supabase_cli',
  };
}

function normalizeBasePath(rawValue) {
  const normalized = `/${(rawValue || '/products').replace(/^\/+|\/+$/g, '')}`.replace(/\/{2,}/g, '/');
  return normalized === '/' ? '/products' : normalized;
}

function parseCsv(csvText) {
  const rows = [];
  let currentField = '';
  let currentRow = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }
    if (char === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentField = '';
      currentRow = [];
      continue;
    }
    if (char === '\r') {
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function loadManifestMap(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const csvText = fs.readFileSync(manifestPath, 'utf8');
  const rows = parseCsv(csvText);
  if (rows.length === 0) return new Map();
  const [rawHeaders, ...dataRows] = rows;
  const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, '').trim());
  const manifest = new Map();

  for (const row of dataRows) {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? '';
    });
    const productImageId = Number(record.product_image_id);
    if (!Number.isInteger(productImageId) || productImageId <= 0) continue;
    manifest.set(productImageId, record);
  }

  return manifest;
}

function loadResumeState(resultsPath) {
  const latestById = new Map();
  if (!fs.existsSync(resultsPath)) {
    return latestById;
  }

  const lines = fs.readFileSync(resultsPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      const id = Number(entry.product_image_id);
      if (Number.isInteger(id) && id > 0) {
        latestById.set(id, entry);
      }
    } catch {
      continue;
    }
  }
  return latestById;
}

function appendJsonl(filePath, payload) {
  ensureParentDirectory(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function extractObjectPathFromUrl(imageUrl) {
  try {
    const parsedUrl = new URL(imageUrl);
    const match = parsedUrl.pathname.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function resolveBackupFile(record, preferLocal) {
  const candidatePath = record.backup_local_path?.trim();
  if (!preferLocal || !candidatePath) return null;
  if (record.backup_exists?.trim().toLowerCase() !== 'true') return null;
  if (!fs.existsSync(candidatePath)) return null;
  return candidatePath;
}

function summarizeRows(rows) {
  return rows.reduce(
    (accumulator, row) => {
      accumulator.total += 1;
      if (row.image_provider === 'imagekit') accumulator.alreadyImageKit += 1;
      else accumulator.supabase += 1;
      return accumulator;
    },
    { total: 0, supabase: 0, alreadyImageKit: 0 }
  );
}

async function fetchCandidateRows(supabase, options) {
  const rows = [];
  let startIndex = 0;

  while (true) {
    let query = supabase
      .from('product_images')
      .select('id, product_id, image_url, image_provider, provider_file_id, provider_file_path, provider_original_url, display_order, is_primary')
      .order('id', { ascending: true })
      .range(startIndex, startIndex + SUPABASE_PAGE_SIZE - 1);

    query = query.eq('image_provider', 'supabase');

    if (options.startAfterId != null) {
      query = query.gt('id', options.startAfterId);
    }
    if (options.onlyProductId != null) {
      query = query.eq('product_id', options.onlyProductId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch product_images: ${error.message}`);
    }

    if (!data?.length) break;
    rows.push(...data);

    if (data.length < SUPABASE_PAGE_SIZE) break;
    startIndex += SUPABASE_PAGE_SIZE;
  }

  return rows;
}

async function uploadFileToImageKit({ privateKey, folder, fileName, sourceUrl, localFilePath }) {
  const formData = new FormData();
  if (localFilePath) {
    const buffer = await fs.promises.readFile(localFilePath);
    formData.append('file', new Blob([buffer]), fileName);
  } else if (sourceUrl) {
    formData.append('file', sourceUrl);
  } else {
    throw new Error('No valid upload source was provided');
  }

  formData.append('fileName', fileName);
  formData.append('folder', folder);
  formData.append('useUniqueFileName', 'false');
  formData.append('overwriteFile', 'true');

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${privateKey}:`, 'utf8').toString('base64')}`,
    },
    body: formData,
  });

  const responseText = await response.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        `ImageKit upload failed with status ${response.status}: ${responseText || response.statusText}`
    );
  }

  if (!payload?.url || !payload?.fileId || !payload?.filePath) {
    throw new Error('ImageKit upload response was incomplete');
  }

  return payload;
}

async function updateProductImageRow(supabase, rowId, payload, originalUrl) {
  const update = {
    image_url: payload.url,
    image_provider: 'imagekit',
    provider_file_id: payload.fileId,
    provider_file_path: payload.filePath,
    provider_original_url: originalUrl,
    migrated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('product_images')
    .update(update)
    .eq('id', rowId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update product_images.id=${rowId}: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error(`product_images.id=${rowId} was not updated`);
  }
}

function buildWorkQueue(rows, manifestById, resumeState, options) {
  const queue = [];

  for (const row of rows) {
    const manifest = manifestById.get(row.id);
    const latestResult = resumeState.get(row.id);
    if (options.resume && latestResult?.status === 'success') {
      continue;
    }

    queue.push({
      ...row,
      manifest,
    });
  }

  if (options.limit != null) {
    return queue.slice(0, options.limit);
  }
  return queue;
}

async function runBatch(items, worker, concurrency) {
  const results = [];
  let nextIndex = 0;

  const runWorker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) break;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

function writeSummary(summaryPath, summary) {
  ensureParentDirectory(summaryPath);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

function printPlan(options, summary, queueLength, supabaseCredentials) {
  console.log('ImageKit migration plan');
  console.log(`- dry_run: ${options.dryRun}`);
  console.log(`- batch_size: ${options.batchSize}`);
  console.log(`- concurrency: ${options.concurrency}`);
  console.log(`- resume: ${options.resume}`);
  console.log(`- prefer_local_backup: ${options.preferLocal}`);
  console.log(`- manifest: ${options.manifestPath}`);
  console.log(`- results: ${options.resultsPath}`);
  console.log(`- supabase_project_ref: ${supabaseCredentials.projectRef}`);
  console.log(`- supabase_credentials_source: ${supabaseCredentials.source}`);
  console.log(`- total_supabase_rows: ${summary.supabase}`);
  console.log(`- total_rows_fetched: ${summary.total}`);
  console.log(`- queue_after_resume_limit: ${queueLength}`);
  if (options.onlyProductId != null) {
    console.log(`- only_product_id: ${options.onlyProductId}`);
  }
  if (options.startAfterId != null) {
    console.log(`- start_after_id: ${options.startAfterId}`);
  }
  if (options.limit != null) {
    console.log(`- limit: ${options.limit}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadEnvFile(options.envFile);

  const supabaseCredentials = resolveSupabaseCredentials();
  const imagekitPrivateKey = options.dryRun ? process.env.IMAGEKIT_PRIVATE_KEY?.trim() ?? '' : requireEnv('IMAGEKIT_PRIVATE_KEY');
  const imagekitBasePath = normalizeBasePath(process.env.IMAGEKIT_PRODUCT_IMAGES_BASE_PATH ?? '/products');

  const supabase = createClient(supabaseCredentials.url, supabaseCredentials.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const manifestById = loadManifestMap(options.manifestPath);
  const resumeState = options.resume ? loadResumeState(options.resultsPath) : new Map();
  const sourceRows = await fetchCandidateRows(supabase, options);
  const sourceSummary = summarizeRows(sourceRows);
  const queue = buildWorkQueue(sourceRows, manifestById, resumeState, options);

  printPlan(options, sourceSummary, queue.length, supabaseCredentials);

  if (queue.length === 0) {
    const summary = {
      generated_at: new Date().toISOString(),
      dry_run: options.dryRun,
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skipped: sourceSummary.total,
      queue_after_resume_limit: 0,
      results_path: options.resultsPath,
    };
    writeSummary(options.summaryPath, summary);
    console.log('No rows matched the current migration filters.');
    return;
  }

  const startedAt = Date.now();
  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  const failures = [];

  for (let batchStart = 0; batchStart < queue.length; batchStart += options.batchSize) {
    const batch = queue.slice(batchStart, batchStart + options.batchSize);
    const batchNumber = Math.floor(batchStart / options.batchSize) + 1;
    console.log(`\nBatch ${batchNumber}: processing ${batch.length} row(s)`);

    const batchResults = await runBatch(
      batch,
      async (row) => {
        const manifest = row.manifest ?? {};
        const localBackupPath = resolveBackupFile(manifest, options.preferLocal);
        const sourceKind = localBackupPath ? 'local_backup' : 'public_url';
        const objectPath =
          manifest.old_object_path?.trim() ||
          extractObjectPathFromUrl(row.image_url) ||
          `${row.product_id}/${path.basename(new URL(row.image_url).pathname)}`;
        const fileName = path.posix.basename(objectPath);
        const folder = `${imagekitBasePath}/${row.product_id}`;
        const startedRowAt = Date.now();
        attempted += 1;

        const baseResult = {
          timestamp: new Date().toISOString(),
          dry_run: options.dryRun,
          product_image_id: row.id,
          product_id: row.product_id,
          display_order: row.display_order,
          is_primary: row.is_primary,
          old_image_url: row.image_url,
          old_object_path: objectPath,
          source_kind: sourceKind,
          local_backup_path: localBackupPath,
          file_name: fileName,
          folder,
        };

        if (options.dryRun) {
          return {
            ...baseResult,
            status: 'dry_run',
            duration_ms: Date.now() - startedRowAt,
          };
        }

        try {
          const uploadPayload = await uploadFileToImageKit({
            privateKey: imagekitPrivateKey,
            folder,
            fileName,
            sourceUrl: localBackupPath ? null : row.image_url,
            localFilePath: localBackupPath,
          });

          await updateProductImageRow(supabase, row.id, uploadPayload, row.image_url);

          const result = {
            ...baseResult,
            status: 'success',
            duration_ms: Date.now() - startedRowAt,
            new_image_url: uploadPayload.url,
            provider_file_id: uploadPayload.fileId,
            provider_file_path: uploadPayload.filePath,
          };
          appendJsonl(options.resultsPath, result);
          succeeded += 1;
          return result;
        } catch (error) {
          const result = {
            ...baseResult,
            status: 'failed',
            duration_ms: Date.now() - startedRowAt,
            error: error instanceof Error ? error.message : String(error),
          };
          appendJsonl(options.resultsPath, result);
          failed += 1;
          failures.push(result);
          if (options.failFast) {
            throw new Error(result.error);
          }
          return result;
        }
      },
      options.concurrency
    );

    for (const result of batchResults) {
      if (result.status === 'success') {
        console.log(`  [ok] product_images.id=${result.product_image_id} -> ${result.new_image_url}`);
      } else if (result.status === 'dry_run') {
        console.log(`  [plan] product_images.id=${result.product_image_id} from ${result.source_kind}`);
      } else {
        console.log(`  [fail] product_images.id=${result.product_image_id}: ${result.error}`);
      }
    }
  }

  const summary = {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    dry_run: options.dryRun,
    attempted,
    succeeded,
    failed,
    failures: failures.slice(0, 20),
    queue_after_resume_limit: queue.length,
    results_path: options.resultsPath,
  };

  writeSummary(options.summaryPath, summary);

  console.log('\nMigration summary');
  console.log(`- attempted: ${attempted}`);
  console.log(`- succeeded: ${succeeded}`);
  console.log(`- failed: ${failed}`);
  console.log(`- summary: ${options.summaryPath}`);

  if (failed > 0 && !options.dryRun) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Migration aborted: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
