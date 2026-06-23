"use client";

/**
 * CharitySelector — User selects charity and sets contribution percentage
 *
 * PRD §08:
 *   - Users select a charity
 *   - Minimum contribution: 10%
 *   - Users may voluntarily increase
 */
import React, { useCallback, useEffect, useState } from "react";

import { CHARITY_PERCENTAGE_MIN, CHARITY_PERCENTAGE_MAX } from "@/lib/validations/charity.schema";
import type { Database } from "@/types/database.types";

type CharityRow = Database["public"]["Tables"]["charities"]["Row"];

interface CharitySelectorProps {
  currentCharityId: string | null;
  currentPercentage: number;
}

export function CharitySelector({
  currentCharityId,
  currentPercentage,
}: CharitySelectorProps): React.JSX.Element {
  const [charities, setCharities] = useState<CharityRow[]>([]);
  const [selectedId, setSelectedId] = useState(currentCharityId ?? "");
  const [percentage, setPercentage] = useState(currentPercentage);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchCharities = useCallback(async () => {
    try {
      const res = await fetch("/api/charities");
      if (!res.ok) throw new Error("Failed to load charities");
      const data = (await res.json()) as { charities: CharityRow[] };
      setCharities(data.charities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load charities");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCharities();
  }, [fetchCharities]);

  async function handleSave(): Promise<void> {
    if (!selectedId) {
      setError("Please select a charity");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/charities/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charity_id: selectedId,
          charity_percentage: percentage,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update");
      }

      const data = (await res.json()) as {
        selected_charity: string;
        charity_percentage: number;
      };
      setSuccess(
        `Now supporting ${data.selected_charity} at ${data.charity_percentage}%`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  const selectedCharity = charities.find((c) => c.id === selectedId);

  if (isLoading) {
    return (
      <div className="charity-selector__loading">
        <div className="score-manager__spinner" />
        <p>Loading charities…</p>
      </div>
    );
  }

  return (
    <div className="charity-selector">
      {/* Current selection summary */}
      {selectedCharity && (
        <div className="charity-selector__current">
          <div className="charity-selector__current-logo">
            {selectedCharity.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedCharity.logo_url}
                alt={selectedCharity.name}
                className="charity-selector__current-img"
              />
            ) : (
              <div className="charity-card__logo-placeholder">
                {selectedCharity.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="charity-selector__current-name">
              {selectedCharity.name}
            </h3>
            <p className="charity-selector__current-pct">
              Contributing {percentage}% of your subscription
            </p>
          </div>
        </div>
      )}

      {/* Charity grid */}
      <div className="charity-selector__grid">
        {charities.map((charity) => (
          <button
            key={charity.id}
            type="button"
            className={`charity-selector__option ${
              selectedId === charity.id ? "charity-selector__option--selected" : ""
            }`}
            onClick={() => setSelectedId(charity.id)}
          >
            {charity.is_featured && (
              <span className="charity-selector__option-badge">⭐</span>
            )}
            <div className="charity-selector__option-logo">
              {charity.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={charity.logo_url} alt={charity.name} />
              ) : (
                <span>{charity.name.charAt(0)}</span>
              )}
            </div>
            <span className="charity-selector__option-name">
              {charity.name}
            </span>
            {selectedId === charity.id && (
              <span className="charity-selector__option-check">✓</span>
            )}
          </button>
        ))}
      </div>

      {charities.length === 0 && (
        <div className="charities-empty" style={{ padding: "2rem" }}>
          <p>No charities available yet. Check back soon!</p>
        </div>
      )}

      {/* Percentage slider */}
      <div className="charity-selector__slider-section">
        <label
          htmlFor="charity-percentage"
          className="charity-selector__slider-label"
        >
          Contribution Percentage:{" "}
          <strong className="charity-selector__slider-value">
            {percentage}%
          </strong>
        </label>
        <input
          id="charity-percentage"
          type="range"
          min={CHARITY_PERCENTAGE_MIN}
          max={CHARITY_PERCENTAGE_MAX}
          step={1}
          value={percentage}
          onChange={(e) => setPercentage(parseInt(e.target.value, 10))}
          className="charity-selector__slider"
        />
        <div className="charity-selector__slider-labels">
          <span>Min {CHARITY_PERCENTAGE_MIN}%</span>
          <span>{CHARITY_PERCENTAGE_MAX}%</span>
        </div>
      </div>

      {/* Save */}
      <div className="charity-selector__actions">
        <button
          onClick={() => void handleSave()}
          disabled={isSaving || !selectedId}
          className="score-form__submit"
        >
          {isSaving ? "Saving…" : "Save Charity Selection"}
        </button>
      </div>

      {error && (
        <p className="score-form__error" role="alert">
          ❌ {error}
        </p>
      )}
      {success && (
        <p className="score-form__success" role="status">
          ✅ {success}
        </p>
      )}
    </div>
  );
}
