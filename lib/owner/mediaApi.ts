export type MediaKind = 'image' | 'video' | 'logo';

export type MediaAsset = {
  id: number;
  tenant_id: number;
  kind: MediaKind;
  usage_type: string;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  storage_key: string;
  public_url: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration_seconds?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MediaAssignment = {
  id: number;
  tenant_id: number;
  media_asset_id: number;
  entity_type: string;
  entity_id: number | null;
  slot: string;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  asset?: MediaAsset;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listMediaAssets(args: {
  tenantId: number | string;
  kind?: string;
  usageType?: string;
  q?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (args.kind) qs.set('kind', args.kind);
  if (args.usageType) qs.set('usageType', args.usageType);
  if (args.q) qs.set('q', args.q);
  if (args.isActive !== undefined) qs.set('isActive', String(args.isActive));
  if (args.limit !== undefined) qs.set('limit', String(args.limit));
  if (args.offset !== undefined) qs.set('offset', String(args.offset));
  const res = await fetch(`/api/media-library/${args.tenantId}/assets?${qs.toString()}`);
  return parseJson<{ ok: true; items: MediaAsset[] }>(res);
}

export async function uploadMediaAsset(args: {
  tenantId: number | string;
  file: File;
  kind?: string;
  usageType?: string;
  title?: string;
  altText?: string;
  caption?: string;
}) {
  const form = new FormData();
  form.append('file', args.file);
  if (args.kind) form.append('kind', args.kind);
  if (args.usageType) form.append('usageType', args.usageType);
  if (args.title) form.append('title', args.title);
  if (args.altText) form.append('altText', args.altText);
  if (args.caption) form.append('caption', args.caption);

  const res = await fetch(`/api/media-library/${args.tenantId}/assets`, { method: 'POST', body: form });
  const json = await parseJson<{ ok: true; asset: MediaAsset }>(res);
  return json.asset;
}

export async function updateMediaAsset(args: {
  tenantId: number | string;
  assetId: number | string;
  title?: string;
  altText?: string;
  caption?: string;
  usageType?: string;
  isActive?: boolean;
}) {
  const res = await fetch(`/api/media-library/${args.tenantId}/assets/${args.assetId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const json = await parseJson<{ ok: true; asset: MediaAsset }>(res);
  return json.asset;
}

export async function deleteMediaAsset(args: { tenantId: number | string; assetId: number | string }) {
  const res = await fetch(`/api/media-library/${args.tenantId}/assets/${args.assetId}`, { method: 'DELETE' });
  await parseJson(res);
}

export async function assignMediaAsset(args: {
  tenantId: number | string;
  mediaAssetId: number | string;
  entityType: string;
  entityId?: number | null;
  slot: string;
  metadata?: Record<string, unknown>;
}) {
  const res = await fetch(`/api/media-library/${args.tenantId}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const json = await parseJson<{ ok: true; assignment: MediaAssignment }>(res);
  return json.assignment;
}

export async function removeMediaAssignment(args: {
  tenantId: number | string;
  entityType: string;
  entityId?: number | null;
  slot: string;
}) {
  const res = await fetch(`/api/media-library/${args.tenantId}/assign`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  await parseJson(res);
}

export async function listMediaAssignments(args: {
  tenantId: number | string;
  entityType: string;
  entityId?: number | null;
  slot?: string;
}) {
  const qs = new URLSearchParams();
  qs.set('entityType', args.entityType);
  if (args.entityId !== undefined && args.entityId !== null) qs.set('entityId', String(args.entityId));
  if (args.slot) qs.set('slot', args.slot);
  const res = await fetch(`/api/media-library/${args.tenantId}/assignments?${qs.toString()}`);
  return parseJson<{ ok: true; items: MediaAssignment[] }>(res);
}
