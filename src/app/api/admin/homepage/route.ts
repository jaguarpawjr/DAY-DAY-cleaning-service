import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type ServiceInput = {
  id?: string;
  name: string;
  description?: string;
  base_price: number;
  pricing_type: 'fixed' | 'starting' | 'hourly' | 'quotation';
  image_url?: string | null;
  is_active: boolean;
  sort_order: number;
};

type AreaInput = {
  id?: string;
  name: string;
  region: string;
  travel_fee: number;
  available_service_ids?: string[];
  is_active: boolean;
  sort_order: number;
};

function positiveNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET() {
  try {
    await requireAdmin();
    const client = createAdminClient();

    const [draftRes, publishedRes] = await Promise.all([
      client.from('homepage_revisions').select('*').eq('status', 'draft').maybeSingle(),
      client.from('homepage_revisions').select('*').eq('status', 'published').maybeSingle(),
    ]);

    return NextResponse.json({
      hasDraft: Boolean(draftRes.data),
      draft: draftRes.data?.draft_snapshot || null,
      draftUpdatedAt: draftRes.data?.created_at || null,
      publishedAt: publishedRes.data?.published_at || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to fetch homepage revisions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { profile: admin } = await requireAdmin();
    const body = await request.json();
    const action = body.action === 'publish' ? 'publish' : body.action === 'discard_draft' ? 'discard_draft' : 'save';
    const settings = body.settings || {};
    const services = Array.isArray(body.services) ? (body.services as ServiceInput[]) : [];
    const areas = Array.isArray(body.areas) ? (body.areas as AreaInput[]) : [];
    const client = createAdminClient();

    if (action === 'discard_draft') {
      await client.from('homepage_revisions').delete().eq('status', 'draft');
      await client.from('audit_logs').insert({
        user_id: admin.id,
        action: 'DISCARD_HOMEPAGE_DRAFT',
        entity: 'homepage',
      });
      return NextResponse.json({ success: true, action: 'discard_draft' });
    }

    const settingsPayload = {
      company_name: String(settings.company_name || '').trim(),
      tagline: String(settings.tagline || '').trim(),
      phone: String(settings.phone || '').trim(),
      email: String(settings.email || '').trim(),
      address: String(settings.address || '').trim(),
      logo_url: settings.logo_url || null,
      homepage_heading: String(settings.homepage_heading || '').trim(),
      homepage_welcome: String(settings.homepage_welcome || '').trim(),
      homepage_footer: String(settings.homepage_footer || '').trim(),
      whatsapp: String(settings.whatsapp || '').trim() || null,
      facebook_url: String(settings.facebook_url || '').trim() || null,
      instagram_url: String(settings.instagram_url || '').trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (!settingsPayload.company_name || !settingsPayload.tagline || !settingsPayload.homepage_heading) {
      return NextResponse.json({ error: 'Company name, tagline, and homepage heading are required' }, { status: 400 });
    }

    const draftSnapshot = {
      settings: settingsPayload,
      services: services.map((s, index) => ({
        ...s,
        base_price: positiveNumber(s.base_price),
        sort_order: Number.isInteger(s.sort_order) ? s.sort_order : index,
      })),
      areas: areas.map((a, index) => ({
        ...a,
        travel_fee: positiveNumber(a.travel_fee),
        available_service_ids: Array.isArray(a.available_service_ids) ? a.available_service_ids : [],
        sort_order: Number.isInteger(a.sort_order) ? a.sort_order : index,
      })),
    };

    // Full Draft Isolation: Saving as draft only updates the homepage_revisions draft record
    if (action === 'save') {
      const { data: existingDraft } = await client
        .from('homepage_revisions')
        .select('id')
        .eq('status', 'draft')
        .maybeSingle();

      if (existingDraft) {
        const { error: draftUpdateErr } = await client
          .from('homepage_revisions')
          .update({
            company_settings: settingsPayload,
            draft_snapshot: draftSnapshot,
            edited_by: admin.id,
            created_at: new Date().toISOString(),
          })
          .eq('id', existingDraft.id);
        if (draftUpdateErr) throw draftUpdateErr;
      } else {
        const { count } = await client
          .from('homepage_revisions')
          .select('*', { count: 'exact', head: true });

        const { error: draftInsertErr } = await client.from('homepage_revisions').insert({
          revision_number: (count || 0) + 1,
          status: 'draft',
          company_settings: settingsPayload,
          draft_snapshot: draftSnapshot,
          edited_by: admin.id,
        });
        if (draftInsertErr) throw draftInsertErr;
      }

      await client.from('audit_logs').insert({
        user_id: admin.id,
        action: 'SAVE_HOMEPAGE_DRAFT',
        entity: 'homepage',
        new_data: { services: services.length, areas: areas.length },
      });

      return NextResponse.json({ success: true, action: 'save', draftSnapshot });
    }

    // Publication: Apply to live database tables and update revision records
    const { data: existingSettings, error: settingsLookupError } = await client
      .from('company_settings')
      .select('id')
      .maybeSingle();
    if (settingsLookupError) throw settingsLookupError;

    const settingsResult = existingSettings
      ? await client.from('company_settings').update(settingsPayload).eq('id', existingSettings.id)
      : await client.from('company_settings').insert(settingsPayload);
    if (settingsResult.error) throw settingsResult.error;

    // Apply Services
    for (const [index, service] of services.entries()) {
      if (!service.name?.trim()) continue;
      const payload = {
        name: service.name.trim(),
        description: service.description?.trim() || null,
        base_price: positiveNumber(service.base_price),
        pricing_type: service.pricing_type || 'fixed',
        image_url: service.image_url || null,
        is_active: service.is_active !== false,
        sort_order: Number.isInteger(service.sort_order) ? service.sort_order : index,
        updated_at: new Date().toISOString(),
      };
      const result = service.id
        ? await client.from('services').update(payload).eq('id', service.id)
        : await client.from('services').insert({
            ...payload,
            slug: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID().slice(0, 8)}`,
          });
      if (result.error) throw result.error;
    }

    // Apply Service Areas with available_service_ids
    for (const [index, area] of areas.entries()) {
      if (!area.name?.trim() || !area.region?.trim()) continue;
      const payload = {
        name: area.name.trim(),
        region: area.region.trim(),
        travel_fee: positiveNumber(area.travel_fee),
        available_service_ids: Array.isArray(area.available_service_ids) ? area.available_service_ids : [],
        is_active: area.is_active !== false,
        sort_order: Number.isInteger(area.sort_order) ? area.sort_order : index,
        updated_at: new Date().toISOString(),
      };
      const result = area.id
        ? await client.from('service_areas').update(payload).eq('id', area.id)
        : await client.from('service_areas').insert(payload);
      if (result.error) throw result.error;
    }

    // Archive previous published revision
    await client.from('homepage_revisions').update({ status: 'archived' }).eq('status', 'published');

    // Remove existing draft
    await client.from('homepage_revisions').delete().eq('status', 'draft');

    const { count, error: countError } = await client
      .from('homepage_revisions')
      .select('*', { count: 'exact', head: true });
    if (countError) throw countError;

    // Create new published revision
    const { error: revisionError } = await client.from('homepage_revisions').insert({
      revision_number: (count || 0) + 1,
      status: 'published',
      company_settings: settingsPayload,
      service_ids: services.map((s) => s.id).filter(Boolean),
      service_area_ids: areas.map((a) => a.id).filter(Boolean),
      draft_snapshot: null,
      edited_by: admin.id,
      published_by: admin.id,
      published_at: new Date().toISOString(),
    });
    if (revisionError) throw revisionError;

    await client.from('audit_logs').insert({
      user_id: admin.id,
      action: 'PUBLISH_HOMEPAGE',
      entity: 'homepage',
      new_data: { services: services.length, areas: areas.length },
    });

    return NextResponse.json({ success: true, action: 'publish' });
  } catch (error: any) {
    console.error('Homepage settings error:', error);
    return NextResponse.json({ error: error.message || 'Unable to save homepage settings' }, { status: 500 });
  }
}
