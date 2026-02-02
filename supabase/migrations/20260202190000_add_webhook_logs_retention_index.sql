create index if not exists idx_webhook_logs_processed_at
  on public.webhook_logs (processed_at);
