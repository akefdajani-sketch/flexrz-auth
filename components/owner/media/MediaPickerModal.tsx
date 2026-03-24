'use client';

import React, { useEffect, useState } from 'react';
import { listMediaAssets, uploadMediaAsset, type MediaAsset } from '@/lib/owner/mediaApi';
import styles from './mediaLibrary.module.css';

type Props = {
  open: boolean;
  tenantId: number | string;
  title?: string;
  allowedKinds?: Array<'image' | 'video' | 'logo'>;
  usageType?: string;
  onClose: () => void;
  onPick: (asset: MediaAsset) => void;
};

export default function MediaPickerModal({
  open,
  tenantId,
  title = 'Choose media',
  allowedKinds = ['image', 'logo'],
  usageType,
  onClose,
  onPick,
}: Props) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await listMediaAssets({ tenantId, usageType, q: q || undefined, limit: 48 });
      setItems(res.items.filter((x) => allowedKinds.includes(x.kind)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void load();
  }, [open, q, usageType]);

  async function handleUpload(file: File) {
    const asset = await uploadMediaAsset({
      tenantId,
      file,
      usageType,
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      title: file.name,
    });
    await load();
    onPick(asset);
  }

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <div className={styles.toolbar}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search media" />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>
        {loading ? <div>Loading...</div> : null}
        <div className={styles.grid}>
          {items.map((item) => (
            <button key={item.id} type="button" className={styles.tile} onClick={() => onPick(item)}>
              <img src={item.public_url} alt={item.alt_text || item.title || ''} className={styles.thumb} />
              <div className={styles.tileTitle}>{item.title || 'Untitled'}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
