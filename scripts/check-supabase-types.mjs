/* eslint-disable */
import { readFile } from 'node:fs/promises'
const FRONTEND_TYPES = new URL('../frontend/src/types/database.types.ts', import.meta.url)
const SHARED_TYPES = new URL('../supabase/functions/_shared/database.types.ts', import.meta.url)

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message)
  }
}

async function main() {
  const frontendTypes = await readFile(FRONTEND_TYPES, 'utf8')
  const sharedTypes = await readFile(SHARED_TYPES, 'utf8')

  assertContains(
    frontendTypes,
    /product_variants:\s*\{\s*[\s\S]*?attributes:\s*Json/,
    'frontend/src/types/database.types.ts is missing the product_variants.attributes Json contract'
  )
  assertContains(
    frontendTypes,
    /Insert:\s*\{\s*[\s\S]*?attributes\?:\s*Json/,
    'frontend/src/types/database.types.ts is missing optional product_variants.Insert.attributes'
  )
  assertContains(
    frontendTypes,
    /Update:\s*\{\s*[\s\S]*?attributes\?:\s*Json/,
    'frontend/src/types/database.types.ts is missing optional product_variants.Update.attributes'
  )
  assertContains(
    sharedTypes,
    /type ProductVariantsRow = \{[\s\S]*?attributes\?: Json/,
    'supabase/functions/_shared/database.types.ts is missing ProductVariantsRow.attributes?: Json'
  )
  assertContains(
    sharedTypes,
    /save_inventory_product:\s*\{\s*Args:\s*\{[\s\S]*?p_variants\?: Json\[\]/,
    'supabase/functions/_shared/database.types.ts is missing save_inventory_product.p_variants?: Json[]'
  )
  assertContains(
    sharedTypes,
    /save_inventory_product:\s*\{\s*Args:\s*\{[\s\S]*?p_sync_variants\?: boolean/,
    'supabase/functions/_shared/database.types.ts is missing save_inventory_product.p_sync_variants?: boolean'
  )

  console.log('Supabase type contract checks passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
