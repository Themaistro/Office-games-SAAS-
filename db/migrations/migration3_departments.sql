-- Migration 3: Add sort_order to departments table

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Set an initial sort order for existing departments based on alphabetical order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as rn
  FROM public.departments
)
UPDATE public.departments
SET sort_order = numbered.rn
FROM numbered
WHERE public.departments.id = numbered.id;
