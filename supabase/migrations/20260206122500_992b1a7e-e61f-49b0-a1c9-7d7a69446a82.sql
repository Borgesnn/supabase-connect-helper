-- Allow requesters to update their own orders (only status to 'concluido' when it's 'finalizado')
-- We'll add a policy that lets the solicitante update their own orders
CREATE POLICY "Users can finalize their own orders"
ON public.pedidos
FOR UPDATE
USING (auth.uid() = solicitante_id AND status = 'finalizado')
WITH CHECK (auth.uid() = solicitante_id AND status = 'concluido');
