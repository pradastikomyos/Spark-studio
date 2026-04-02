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
- `Stock`: may be zero
- `Size`: optional
- `Color`: optional

## Image Rules

- Minimum 1 image
- Maximum 3 images
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
- image missing in detail page:
  - verify upload success and try a hard refresh after deployment
- stock zero but product should stay visible:
  - keep it active; the storefront will show it as sold out
