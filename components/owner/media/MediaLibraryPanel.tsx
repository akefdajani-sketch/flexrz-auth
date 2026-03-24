'use client';

import React, { useEffect, useState } from 'react';
import { listMediaAssets, updateMediaAsset, deleteMediaAsset, type MediaAsset } from '@/lib/owner/mediaApi';
import styles from './mediaLibrary.module.css';

type Props = { tenantId: number | string };

export default function MediaLibraryPanel({ tenantId }: Props) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [q, setQ] = useState('');
  const [usageType, setUsageType] = useState('');

  async function load() {
    const res = await listMediaAssets({ tenantId, q: q || undefined, usageType: usageType || undefined, limit: 100 });
    setItems(res.items);
  }

  useEffect(() => {
    void load();
  }, [tenantId, q, usageType]);

  async function handleRename(assetId: number, title: string) {
    await updateMediaAsset({ tenantId, assetId, title });
    await load();
  }

  async function handleSoftDelete(assetId: number) {
    await deleteMediaAsset({ tenantId, assetId });
    await load();
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <h3>Media Library</h3>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search media" />
        <select value={usageType} onChange={(e) => setUsageType(e.target.value)}>
          <option value="">All</option>
          <option value="banner">Banners</option>
          <option value="home_landing">Home landing</option>
          <option value="service">Services</option>
          <option value="staff">Staff</option>
          <option value="resource">Resources</option>
          <option value="membership">Memberships</option>
          <option value="package">Packages</option>
        </select>
      </div>
      <div className={styles.grid}>
        {items.map((item) => (
          <div key={item.id} className={styles.tileCard}>
            <img src={item.public_url} alt={item.alt_text || item.title || ''} className={styles.thumb} />
            <input
              defaultValue={item.title || ''}
              onBlur={(e) => {
                if (e.target.value !== (item.title || '')) void handleRename(item.id, e.target.value);
              }}
            />
            <button type="button" onClick={() => void handleSoftDelete(item.id)}>Deactivate</button>
          </div>
        ))}
      </div>
    </div>
  );
}
