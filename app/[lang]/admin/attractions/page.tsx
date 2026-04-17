'use client';

import { use, useEffect, useState } from 'react';
import { Button } from '@/app/components/Button';
import { Input } from '@/app/components/Input';
import {
  createAttraction,
  deleteAttraction,
  getAttractions,
  updateAttraction,
  listAttractionImages,
  addAttractionImage,
  deleteAttractionImage,
  setPrimaryAttractionImage,
  type AttractionRow,
  type AttractionImageRow,
} from '@/app/actions/attractions';

const EMPTY_FORM = {
  slug: '',
  nameEn: '',
  nameTr: '',
  nameZh: '',
  descriptionEn: '',
  descriptionTr: '',
  descriptionZh: '',
  imageUrl: '',
  sortOrder: '0',
};

async function uploadImageToCloudinary(file: File): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) {
    throw new Error('Cloudinary env eksik: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
  }
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw new Error('Görsel upload başarısız');
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error('Upload URL alınamadı');
  return json.secure_url;
}

export default function AdminAttractionsPage(props: { params: Promise<{ lang: string }> }) {
  use(props.params);
  const [rows, setRows] = useState<AttractionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUploading, setImageUploading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<AttractionImageRow[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const refreshGallery = async (attractionId: string) => {
    const list = await listAttractionImages(attractionId);
    setGalleryImages(list);
  };

  const handleGalleryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Sadece JPG, PNG veya WEBP yükleyebilirsiniz.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'ı aşamaz.');
      e.target.value = '';
      return;
    }
    setGalleryUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      const res = await addAttractionImage(editId, { url });
      if (!res.ok) throw new Error(res.error ?? 'Galeriye eklenemedi');
      await refreshGallery(editId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Yükleme başarısız');
    } finally {
      setGalleryUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    if (!editId) return;
    if (!confirm('Görsel silinsin mi?')) return;
    const res = await deleteAttractionImage(imageId);
    if (!res.ok) {
      alert(res.error ?? 'Silinemedi');
      return;
    }
    await refreshGallery(editId);
  };

  const handleSetPrimaryGalleryImage = async (imageId: string) => {
    if (!editId) return;
    const res = await setPrimaryAttractionImage(imageId);
    if (!res.ok) {
      alert(res.error ?? 'Kaydedilemedi');
      return;
    }
    await refreshGallery(editId);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Sadece JPG, PNG veya WEBP yükleyebilirsiniz.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'ı aşamaz.');
      e.target.value = '';
      return;
    }
    setImageUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setForm((p) => ({ ...p, imageUrl: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Yükleme başarısız');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  const refresh = async () => {
    setLoading(true);
    const list = await getAttractions();
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug.trim() || !form.nameEn.trim()) {
      alert('Slug ve Name EN zorunludur.');
      return;
    }
    setSaving(true);
    const payload = {
      slug: form.slug.trim(),
      nameEn: form.nameEn.trim(),
      nameTr: form.nameTr.trim() || form.nameEn.trim(),
      nameZh: form.nameZh.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      descriptionTr: form.descriptionTr.trim() || null,
      descriptionZh: form.descriptionZh.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
    };
    const result = editId ? await updateAttraction(editId, payload) : await createAttraction(payload);
    setSaving(false);
    if (!result.ok) {
      alert(result.error ?? 'Kayit basarisiz');
      return;
    }
    setEditId(null);
    setForm(EMPTY_FORM);
    await refresh();
  };

  const startEdit = (row: AttractionRow) => {
    setEditId(row.id);
    setForm({
      slug: row.slug,
      nameEn: row.nameEn,
      nameTr: row.nameTr,
      nameZh: row.nameZh ?? '',
      descriptionEn: row.descriptionEn ?? '',
      descriptionTr: row.descriptionTr ?? '',
      descriptionZh: row.descriptionZh ?? '',
      imageUrl: row.imageUrl ?? '',
      sortOrder: String(row.sortOrder),
    });
    void refreshGallery(row.id);
  };

  const remove = async (id: string) => {
    if (!confirm('Bu gezi noktasini silmek istediginize emin misiniz?')) return;
    const result = await deleteAttraction(id);
    if (!result.ok) {
      alert(result.error ?? 'Silinemedi');
      return;
    }
    await refresh();
  };

  return (
    <div>
      <h1>Gezi Noktalari</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
        Destinasyon kartlarini yonetin ve urunlerle iliskilendirin.
      </p>

      <form className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)', maxWidth: 760 }} onSubmit={onSubmit}>
        <h2 style={{ marginBottom: 'var(--space-md)' }}>{editId ? 'Gezi Noktasi Duzenle' : 'Yeni Gezi Noktasi'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <Input label="Slug" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} required />
          <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))} />
          <Input label="Name EN" value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} required />
          <Input label="Name TR" value={form.nameTr} onChange={(e) => setForm((p) => ({ ...p, nameTr: e.target.value }))} />
          <Input label="Name ZH" value={form.nameZh} onChange={(e) => setForm((p) => ({ ...p, nameZh: e.target.value }))} />
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>Görsel</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageFileUpload}
              disabled={imageUploading}
              style={{ width: '100%' }}
            />
            {imageUploading ? (
              <small style={{ color: 'var(--color-text-muted)' }}>Yükleniyor…</small>
            ) : null}
            {form.imageUrl ? (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={form.imageUrl} alt="" style={{ maxWidth: 120, maxHeight: 80, borderRadius: 4, objectFit: 'cover' }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}>
                  Kaldır
                </button>
              </div>
            ) : null}
            <small style={{ display: 'block', marginTop: 4, color: 'var(--color-text-muted)' }}>
              Veya URL yapıştırın:
            </small>
            <Input
              label=""
              value={form.imageUrl}
              onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <ResizableDescriptionField label="Description EN" value={form.descriptionEn} onChange={(value) => setForm((p) => ({ ...p, descriptionEn: value }))} />
            <ResizableDescriptionField label="Description TR" value={form.descriptionTr} onChange={(value) => setForm((p) => ({ ...p, descriptionTr: value }))} />
            <ResizableDescriptionField label="Description ZH" value={form.descriptionZh} onChange={(value) => setForm((p) => ({ ...p, descriptionZh: value }))} />
          </div>
        </div>
        <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
          <Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : editId ? 'Guncelle' : 'Olustur'}</Button>
          {editId ? (
            <Button type="button" variant="secondary" onClick={() => { setEditId(null); setForm(EMPTY_FORM); setGalleryImages([]); }}>Iptal</Button>
          ) : null}
        </div>
      </form>

      {editId ? (
        <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)', maxWidth: 760 }}>
          <h2 style={{ marginBottom: 'var(--space-sm)' }}>Galeri</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)', fontSize: '0.85rem' }}>
            Gezi noktası detay sayfasında üstte grid olarak gösterilir. İlk (primary) görsel kartta da kullanılabilir.
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleGalleryFileUpload}
            disabled={galleryUploading}
          />
          {galleryUploading ? <small style={{ display: 'block', marginTop: 6, color: 'var(--color-text-muted)' }}>Yükleniyor…</small> : null}
          {galleryImages.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              {galleryImages.map((img) => (
                <div key={img.id} style={{ border: img.isPrimary ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', borderRadius: 6, padding: 4 }}>
                  <img src={img.url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {!img.isPrimary ? (
                      <Button type="button" variant="secondary" style={{ flex: 1, padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => handleSetPrimaryGalleryImage(img.id)}>
                        Kapak
                      </Button>
                    ) : (
                      <span style={{ flex: 1, textAlign: 'center', padding: '2px 6px', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>Kapak</span>
                    )}
                    <Button type="button" variant="secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => handleDeleteGalleryImage(img.id)}>
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 'var(--space-md)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Henüz görsel eklenmemiş.</p>
          )}
        </div>
      ) : null}

      <div className="card" style={{ padding: 'var(--space-lg)' }}>
        <h2 style={{ marginBottom: 'var(--space-md)' }}>Liste</h2>
        {loading ? <p>Yukleniyor...</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: 8 }}>Slug</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Tours</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 8 }}>{row.slug}</td>
                    <td style={{ padding: 8 }}>{row.nameEn}</td>
                    <td style={{ padding: 8 }}>{row.tourCount}</td>
                    <td style={{ padding: 8 }}>
                      <Button type="button" variant="secondary" style={{ marginRight: 8 }} onClick={() => startEdit(row)}>Duzenle</Button>
                      <Button type="button" variant="secondary" onClick={() => remove(row.id)}>Sil</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ResizableDescriptionField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { label, value, onChange } = props;
  return (
    <label style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>
      <span style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        style={{
          width: '100%',
          minHeight: 120,
          padding: '0.75rem',
          borderRadius: 6,
          border: '1px solid var(--color-border)',
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
    </label>
  );
}
