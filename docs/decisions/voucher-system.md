# Voucher System

This document describes the stable behavior of product-order vouchers.

## Purpose

The voucher system supports one voucher per product order with atomic quota handling.

## Data Model

- `vouchers`
  - `code`
  - `is_active`
  - `valid_from`
  - `valid_until`
  - `quota`
  - `used_count`
  - `discount_type`
  - `discount_value`
  - `max_discount`
  - `min_purchase`
  - `applicable_categories`
- `voucher_usage`
  - per-order usage log for audit

## Decision Summary

- Validation preview is read-only on the frontend.
- Reservation happens server-side during order creation.
- Quota release happens on failed, expired, or cancelled payment outcomes.
- Parent-category vouchers also apply to child categories.
- Admin access uses `public.is_admin()` and `public.user_role_assignments`.

## RPC Contracts

- `validate_voucher(p_code, p_subtotal, p_category_ids)`
  - frontend preview only
  - does not change quota
- `validate_and_reserve_voucher(p_code, p_user_id, p_subtotal, p_category_ids)`
  - server-side atomic reserve
  - protects against race conditions
- `release_voucher_quota(p_voucher_id)`
  - rollback path for non-finalized orders

## Checkout Flow

1. Frontend validates and previews the discount.
2. Edge Function reserves voucher quota during order creation.
3. Paid orders keep the reservation and create usage records.
4. Failed or expired orders release quota again.

## Current State

- Voucher manager exists in admin pages.
- Product checkout supports voucher apply and discount display.
- Voucher data is stored on product orders.
- Webhook and sync paths participate in quota release for failed final states.
