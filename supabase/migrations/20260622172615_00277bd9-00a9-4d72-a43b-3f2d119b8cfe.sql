DELETE FROM public.produto_areas WHERE produto_id IN (SELECT id FROM public.produtos WHERE codigo LIKE 'E2E-%');
DELETE FROM public.produtos WHERE codigo LIKE 'E2E-%';