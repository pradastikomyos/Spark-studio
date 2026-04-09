#!/usr/bin/env node
/* eslint-disable */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const DEFAULT_ENV_FILE = path.join(cwd, '.env.imagekit-migration');
const DEFAULT_OUTPUT_PATH = path.join(cwd, 'backups', 'product-images-migration-status.json');
const SUPABASE_PAGE_SIZE = 1000;

function parseArgs(argv) {
  const args = {
    envFile: DEFAULT_ENV_FILE,
    outputPath: DEFAULT_OUTPUT_PATH,
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

    if (arg === '--env-file') {
      args.envFile = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--env-file=')) {
      args.envFile = path.resolve(cwd, arg.slice('--env-file='.length));
      continue;
    }
    if (arg === '--output') {
      args.outputPath = path.resolve(cwd, nextValue());
      continue;
    }
    if (arg.startsWith('--output=')) {
      args.outputPath = path.resolve(cwd, arg.slice('--output='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
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

async function fetchAllProductImages(supabase) {
  const rows = [];
  let startIndex = 0;

  while (true) {
    const { data, error } = await supabase
      .from('product_images')
      .select('id, product_id, image_url, image_provider, provider_file_id, provider_file_path, provider_original_url, migrated_at')
      .order('id', { ascending: true })
      .range(startIndex, startIndex + SUPABASE_PAGE_SIZE - 1);

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

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(args.envFile);

  const supabaseCredentials = resolveSupabaseCredentials();
  const supabase = createClient(supabaseCredentials.url, supabaseCredentials.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = await fetchAllProductImages(supabase);
  const summary = {
    generated_at: new Date().toISOString(),
    total_rows: rows.length,
    provider_counts: {
      supabase: 0,
      imagekit: 0,
      unknown: 0,
    },
    anomalies: {
      imagekit_missing_file_id: 0,
      imagekit_missing_file_path: 0,
      imagekit_missing_migrated_at: 0,
      imagekit_missing_original_url: 0,
      supabase_with_imagekit_metadata: 0,
    },
    samples: {
      remaining_supabase_rows: [],
      broken_imagekit_rows: [],
    },
  };

  for (const row of rows) {
    if (row.image_provider === 'supabase') {
      summary.provider_counts.supabase += 1;
      if (row.provider_file_id || row.provider_file_path || row.migrated_at) {
        summary.anomalies.supabase_with_imagekit_metadata += 1;
      }
      if (summary.samples.remaining_supabase_rows.length < 10) {
        summary.samples.remaining_supabase_rows.push({
          id: row.id,
          product_id: row.product_id,
          image_url: row.image_url,
        });
      }
      continue;
    }

    if (row.image_provider === 'imagekit') {
      summary.provider_counts.imagekit += 1;
      const broken =
        !row.provider_file_id ||
        !row.provider_file_path ||
        !row.migrated_at ||
        !row.provider_original_url;

      if (!row.provider_file_id) summary.anomalies.imagekit_missing_file_id += 1;
      if (!row.provider_file_path) summary.anomalies.imagekit_missing_file_path += 1;
      if (!row.migrated_at) summary.anomalies.imagekit_missing_migrated_at += 1;
      if (!row.provider_original_url) summary.anomalies.imagekit_missing_original_url += 1;

      if (broken && summary.samples.broken_imagekit_rows.length < 10) {
        summary.samples.broken_imagekit_rows.push({
          id: row.id,
          product_id: row.product_id,
          image_url: row.image_url,
          provider_file_id: row.provider_file_id,
          provider_file_path: row.provider_file_path,
          provider_original_url: row.provider_original_url,
          migrated_at: row.migrated_at,
        });
      }
      continue;
    }

    summary.provider_counts.unknown += 1;
  }

  ensureParentDirectory(args.outputPath);
  fs.writeFileSync(args.outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log('ImageKit migration status');
  console.log(`- supabase_project_ref: ${supabaseCredentials.projectRef}`);
  console.log(`- supabase_credentials_source: ${supabaseCredentials.source}`);
  console.log(`- total_rows: ${summary.total_rows}`);
  console.log(`- imagekit_rows: ${summary.provider_counts.imagekit}`);
  console.log(`- supabase_rows_remaining: ${summary.provider_counts.supabase}`);
  console.log(`- unknown_provider_rows: ${summary.provider_counts.unknown}`);
  console.log(`- anomalies.imagekit_missing_file_id: ${summary.anomalies.imagekit_missing_file_id}`);
  console.log(`- anomalies.imagekit_missing_file_path: ${summary.anomalies.imagekit_missing_file_path}`);
  console.log(`- anomalies.imagekit_missing_migrated_at: ${summary.anomalies.imagekit_missing_migrated_at}`);
  console.log(`- anomalies.imagekit_missing_original_url: ${summary.anomalies.imagekit_missing_original_url}`);
  console.log(`- output: ${args.outputPath}`);
}

main().catch((error) => {
  console.error(`Status check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
