import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Find orders with cutoff in ~24 hours
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Get confirmed orders
  const { data: orders, error: ordersError } = await supabase
    .from('planly_orders')
    .select(`
      *,
      customer:planly_customers(*)
    `)
    .eq('status', 'confirmed');

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    return new Response(JSON.stringify({ error: ordersError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // For each order, check if cutoff is tomorrow and send notification
  // This is a simplified version - full implementation would calculate cutoff dates
  // and create notifications for orders approaching cutoff

  return new Response(JSON.stringify({ 
    success: true,
    orders_checked: orders?.length || 0 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
