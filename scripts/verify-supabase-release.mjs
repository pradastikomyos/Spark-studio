/* eslint-disable */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

function parseMigrationRows(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{8,}\s*\|/.test(line))
    .map((line) => {
      const [local = '', remote = ''] = line.split('|').map((part) => part.trim())
      return { local, remote }
    })
}

async function main() {
  const { stdout } = await execFileAsync('supabase', ['migration', 'list'], {
    maxBuffer: 10 * 1024 * 1024,
  })

  const mismatches = parseMigrationRows(stdout).filter(({ local, remote }) => local !== remote)

  if (mismatches.length > 0) {
    console.error('Migration history mismatch detected:')
    for (const row of mismatches) {
      console.error(`local=${row.local || '-'} remote=${row.remote || '-'}`)
    }
    process.exitCode = 1
    return
  }

  await execFileAsync(process.execPath, ['scripts/check-supabase-types.mjs'], {
    maxBuffer: 10 * 1024 * 1024,
  })

  console.log('Migration history is aligned locally and remotely.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
