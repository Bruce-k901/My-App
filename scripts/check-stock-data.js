const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role key if available, otherwise anon key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Using service role key:', !!serviceKey);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey || anonKey
);

async function checkData() {
  const deliveryId = '25456f35-1a3b-45c9-adee-7f4319432d58';

  // Check stock movements
  console.log('\n=== STOCK MOVEMENTS ===');
  const { data: movements, error: movErr } = await supabase
    .from('stock_movements')
    .select('id, movement_type, quantity, unit_cost, total_cost, notes, recorded_at')
    .like('notes', '%' + deliveryId + '%')
    .order('recorded_at', { ascending: false })
    .limit(10);

  if (movErr) console.log('Movement error:', movErr.message);
  else if (movements && movements.length > 0) {
    console.log(`Found ${movements.length} stock movements:`);
    movements.forEach(m => {
      console.log(`  - Type: ${m.movement_type}, Qty: ${m.quantity}, Cost: £${m.unit_cost}`);
    });
  } else {
    console.log('No movements found for this delivery');
  }

  // Check price history
  console.log('\n=== PRICE HISTORY ===');
  const { data: priceHistory, error: phErr } = await supabase
    .from('price_history')
    .select('id, product_variant_id, old_price, new_price, change_percent, source, recorded_at')
    .eq('source_ref', deliveryId)
    .order('recorded_at', { ascending: false })
    .limit(10);

  if (phErr) console.log('Price history error:', phErr.message);
  else if (priceHistory && priceHistory.length > 0) {
    console.log(`Found ${priceHistory.length} price history records:`);
    priceHistory.forEach(ph => {
      console.log(`  - Old: £${ph.old_price} -> New: £${ph.new_price} (${ph.change_percent?.toFixed(2) || 'N/A'}%)`);
    });
  } else {
    console.log('No price history found for this delivery');
  }

  // Check stock levels for recent updates
  console.log('\n=== RECENT STOCK LEVELS (last 24h) ===');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: stockLevels, error: slErr } = await supabase
    .from('stock_levels')
    .select('*')
    .gte('last_movement_at', yesterday)
    .order('last_movement_at', { ascending: false })
    .limit(10);

  if (slErr) console.log('Stock levels error:', slErr.message);
  else if (stockLevels && stockLevels.length > 0) {
    console.log(`Found ${stockLevels.length} recently updated stock levels:`);
    console.log('First record columns:', Object.keys(stockLevels[0]));
    stockLevels.forEach(sl => {
      console.log(`  - Item: ${sl.stock_item_id?.slice(0,8) || 'N/A'}..., Qty: ${sl.quantity}`);
    });
  } else {
    console.log('No recent stock level updates found');
  }

  // Also try checking delivery_lines to confirm delivery was confirmed
  console.log('\n=== DELIVERY STATUS ===');
  const { data: delivery, error: delErr } = await supabase
    .from('deliveries')
    .select('id, status, confirmed_at, confirmed_by, total')
    .eq('id', deliveryId)
    .single();

  if (delErr) console.log('Delivery error:', delErr.message);
  else {
    console.log(`Delivery ${deliveryId.slice(0,8)}...:`);
    console.log(`  - Status: ${delivery.status}`);
    console.log(`  - Confirmed at: ${delivery.confirmed_at || 'N/A'}`);
    console.log(`  - Total: £${delivery.total || 'N/A'}`);
  }
}

checkData().catch(console.error);
