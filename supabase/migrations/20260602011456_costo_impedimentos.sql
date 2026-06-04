ALTER TABLE public.impedimento_backlog_item
  ADD COLUMN resuelto boolean NOT NULL DEFAULT false,
  ADD COLUMN costo numeric;
