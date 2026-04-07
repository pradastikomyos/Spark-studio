/* eslint-disable */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function main() {
  await execFileAsync('supabase', ['gen', 'types', '--linked', '--schema', 'public'], {
    maxBuffer: 10 * 1024 * 1024,
  })

  await execFileAsync(process.execPath, ['scripts/check-supabase-types.mjs'], {
    maxBuffer: 10 * 1024 * 1024,
  })

  console.log('Supabase linked type generation and contract checks passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
