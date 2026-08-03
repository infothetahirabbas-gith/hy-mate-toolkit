GRANT SELECT ON public.ai_employees TO anon, authenticated;
GRANT ALL ON public.ai_employees TO service_role;
GRANT SELECT ON public.ai_employee_categories TO anon, authenticated;
GRANT ALL ON public.ai_employee_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_employee_categories TO authenticated;