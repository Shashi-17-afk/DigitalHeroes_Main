"use client";

/**
 * AdminCharityManager — Full CRUD for charity management
 *
 * PRD §11: Admin can add, edit, delete charities and manage content/media
 */
import React, { useCallback, useEffect, useState } from "react";

import type { Database } from "@/types/database.types";

type CharityRow = Database["public"]["Tables"]["charities"]["Row"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ─── Charity Form ─────────────────────────────────────────────────────────────

interface CharityFormProps {
  charity?: CharityRow;
  onSave: () => void;
  onCancel: () => void;
}

function CharityForm({
  charity,
  onSave,
  onCancel,
}: CharityFormProps): React.JSX.Element {
  const isEditing = !!charity;
  const [name, setName] = useState(charity?.name ?? "");
  const [slug, setSlug] = useState(charity?.slug ?? "");
  const [shortDesc, setShortDesc] = useState(charity?.short_description ?? "");
  const [description, setDescription] = useState(charity?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(charity?.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(charity?.banner_url ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(charity?.website_url ?? "");
  const [isFeatured, setIsFeatured] = useState(charity?.is_featured ?? false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string): void {
    setName(value);
    if (!isEditing) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const payload = {
      name,
      slug,
      short_description: shortDesc || undefined,
      description: description || undefined,
      logo_url: logoUrl || undefined,
      banner_url: bannerUrl || undefined,
      website_url: websiteUrl || undefined,
      is_featured: isFeatured,
    };

    try {
      const url = isEditing
        ? `/api/charities/${charity.id}`
        : "/api/charities";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      className="admin-charity-form"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <h3 className="admin-charity-form__title">
        {isEditing ? `Edit: ${charity.name}` : "Add New Charity"}
      </h3>

      <div className="admin-charity-form__grid">
        <div className="score-form__field">
          <label className="score-form__label">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="score-form__input"
            required
            disabled={isPending}
          />
        </div>

        <div className="score-form__field">
          <label className="score-form__label">Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="score-form__input"
            required
            disabled={isPending}
            placeholder="my-charity-name"
          />
        </div>

        <div className="score-form__field" style={{ gridColumn: "1 / -1" }}>
          <label className="score-form__label">Short Description</label>
          <input
            type="text"
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            className="score-form__input"
            maxLength={300}
            disabled={isPending}
            placeholder="Brief one-line summary"
          />
        </div>

        <div className="score-form__field" style={{ gridColumn: "1 / -1" }}>
          <label className="score-form__label">Full Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="score-form__input admin-charity-form__textarea"
            rows={4}
            disabled={isPending}
          />
        </div>

        <div className="score-form__field">
          <label className="score-form__label">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="score-form__input"
            disabled={isPending}
          />
        </div>

        <div className="score-form__field">
          <label className="score-form__label">Banner URL</label>
          <input
            type="url"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            className="score-form__input"
            disabled={isPending}
          />
        </div>

        <div className="score-form__field">
          <label className="score-form__label">Website URL</label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="score-form__input"
            disabled={isPending}
          />
        </div>

        <div className="score-form__field">
          <label className="admin-charity-form__checkbox">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              disabled={isPending}
            />
            <span>⭐ Featured on homepage</span>
          </label>
        </div>
      </div>

      <div className="admin-charity-form__actions">
        <button
          type="submit"
          className="score-form__submit"
          disabled={isPending}
        >
          {isPending ? "Saving…" : isEditing ? "Update Charity" : "Create Charity"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="score-item__btn score-item__btn--cancel"
          disabled={isPending}
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="score-form__error" role="alert">
          ❌ {error}
        </p>
      )}
    </form>
  );
}

// ─── Main Admin Component ─────────────────────────────────────────────────────

export function AdminCharityManager(): React.JSX.Element {
  const [charities, setCharities] = useState<CharityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCharity, setEditingCharity] = useState<CharityRow | undefined>(
    undefined
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      // Fetch all charities including inactive (for admin view)
      const res = await fetch("/api/charities");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as { charities: CharityRow[] };
      setCharities(data.charities);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  async function handleDeactivate(id: string): Promise<void> {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/charities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to deactivate");
      void fetchAll();
    } catch {
      // silent fail
    } finally {
      setDeletingId(null);
    }
  }

  function handleFormSave(): void {
    setShowForm(false);
    setEditingCharity(undefined);
    void fetchAll();
  }

  if (isLoading) {
    return (
      <div className="score-manager__loading">
        <div className="score-manager__spinner" />
        <p>Loading charities…</p>
      </div>
    );
  }

  return (
    <div className="admin-charity-manager">
      <div className="admin-charity-manager__header">
        <h2>Charity Management</h2>
        <button
          onClick={() => {
            setEditingCharity(undefined);
            setShowForm(true);
          }}
          className="score-form__submit"
        >
          + Add Charity
        </button>
      </div>

      {(showForm || editingCharity) && (
        <CharityForm
          charity={editingCharity}
          onSave={handleFormSave}
          onCancel={() => {
            setShowForm(false);
            setEditingCharity(undefined);
          }}
        />
      )}

      <div className="admin-charity-list">
        {charities.length === 0 ? (
          <div className="charities-empty" style={{ padding: "2rem" }}>
            <p>No charities yet. Click &ldquo;Add Charity&rdquo; to create one.</p>
          </div>
        ) : (
          charities.map((charity) => (
            <div key={charity.id} className="admin-charity-item">
              <div className="admin-charity-item__info">
                <div className="admin-charity-item__name">
                  {charity.is_featured && "⭐ "}
                  {charity.name}
                  {!charity.is_active && (
                    <span className="admin-charity-item__inactive">
                      (Inactive)
                    </span>
                  )}
                </div>
                <div className="admin-charity-item__slug">
                  /{charity.slug}
                </div>
                {charity.short_description && (
                  <div className="admin-charity-item__desc">
                    {charity.short_description}
                  </div>
                )}
              </div>
              <div className="admin-charity-item__actions">
                <button
                  onClick={() => {
                    setEditingCharity(charity);
                    setShowForm(false);
                  }}
                  className="score-item__btn score-item__btn--edit"
                >
                  ✏️ Edit
                </button>
                {charity.is_active && (
                  <button
                    onClick={() => void handleDeactivate(charity.id)}
                    disabled={deletingId === charity.id}
                    className="score-item__btn score-item__btn--delete"
                  >
                    {deletingId === charity.id ? "…" : "🗑️ Deactivate"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
