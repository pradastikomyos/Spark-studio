# Admin Product Entry

Use this guide for `Admin -> Store & Inventory -> Add Product`.

## Quick Checklist

- Fill in `Name`, `Slug`, `Product SKU`, and `Category`
- Add at least one image
- Add at least one variant
- Every variant must have `Name`, `SKU`, and `Price > 0`

## Product Rules

- `Name`: required
- `Slug`: required and unique among active products
- `Product SKU`: required and unique among active products
- `Category`: required
- `Description`: optional
- `Active`: optional

## Variant Rules

- `Variant Name`: required
- `Variant SKU`: required and unique among active variants
- `Price`: required and greater than zero
- `Price` may be entered as `30000` or `30.000`; backend normalizes both to the same numeric value
- `Stock`: may be zero
- `Size`: optional; leaving it empty or filling `-` is supported
- `Color`: optional; leaving it empty or filling `-` is supported
- Single-variant products may reuse the same SKU pattern as the product SKU if the variant SKU itself stays unique in active variants
- Variant names may include quotes and will be preserved as entered after trimming whitespace

## Image Rules

- Minimum 1 image
- Maximum 8 images
- Supported formats: JPG, PNG, WEBP
- Maximum size: 2 MB per image
- First image is the primary image

## Suggested SKU Pattern

- Product SKU:
  - `BRAND-CATEGORY-CODE`
- Variant SKU:
  - `PRODUCTSKU-VARIANT`

## Troubleshooting

- "SKU already exists":
  - check whether another active product or active variant is already using that SKU
- deleted product recreated with the same slug or product SKU:
  - this is supported; a completed delete should release the previous identifiers for reuse
- save fails with a backend validation code such as `INVENTORY_VARIANT_PRICE_INVALID`:
  - the server rejected the payload before touching the database; fix the field named in the message and retry
- image missing in detail page:
  - verify upload success and try a hard refresh after deployment
- stock zero but product should stay visible:
  - keep it active; the storefront will show it as sold out
