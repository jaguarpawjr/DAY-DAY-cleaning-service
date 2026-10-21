import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();
    const { item_id, movement_type, quantity, unit_cost, reference_id, reason } = body;

    const numQty = parseFloat(quantity);
    if (!item_id || !movement_type || isNaN(numQty)) {
      return NextResponse.json({ error: 'Missing item_id, movement_type, or valid quantity' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Call stored procedure record_inventory_movement
    const { data, error } = await adminClient.rpc('record_inventory_movement', {
      p_item_id: item_id,
      p_movement_type: movement_type,
      p_quantity: numQty,
      p_unit_cost: parseFloat(unit_cost || '0'),
      p_reference_id: reference_id || null,
      p_reason: reason || 'Stock update',
      p_user_id: admin.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (err: any) {
    console.error('Inventory movement error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
