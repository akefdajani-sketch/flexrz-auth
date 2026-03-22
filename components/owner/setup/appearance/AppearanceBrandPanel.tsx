"use client";

import React from "react";
import SettingsCard from "./SettingsCard";
import SettingsGrid from "./SettingsGrid";
import PreviewPane from "./PreviewPane";
import ThemeStudioPanel from "@/components/owner/ThemeStudioPanel";
import { HomeLandingEditorSection } from "@/app/book/[slug]/setup/sections/HomeLandingEditorSection";

type TabKey =
  | "basics"
  | "colors"
  | "typography"
  | "components"
  | "behavior"
  | "assets"
  | "terminology"
  | "themeStudio"
  | "home"
  ;

type Props = {
  // We keep props intentionally “pass-through” to avoid touching booking logic.
  // This panel is UI-only. OwnerSetupTab remains the source of truth for handlers & state.
  model: any;
};

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bf-ab-tab"
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid #e2e8f0",
        background: active ? "#0f172a" : "#ffffff",
        color: active ? "#ffffff" : "#0f172a",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{children}</div>;
}

function TokenRow({
  label,
  token,
  value,
  placeholder,
  onChange,
  onClear,
  fullWidth,
}: {
  label: string;
  token: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onClear: () => void;
  fullWidth?: boolean;
}) {
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <FieldLabel>{label}</FieldLabel>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>{token}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
        <input className="bf-ab-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "default"} />
        <button className="bf-btn bf-btn-ghost" type="button" onClick={onClear} style={{ whiteSpace: "nowrap" }}>
          Clear
        </button>
      </div>
    </div>
  );
}

function safeHexForPicker(v: string, fallback: string) {
  const s = String(v || "").trim();
  // Accept #RRGGBB only for the native color input
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return fallback;
}

function ColorTokenRow({
  label,
  token,
  value,
  placeholder,
  onChange,
  onClear,
  fullWidth,
}: {
  label: string;
  token: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onClear: () => void;
  fullWidth?: boolean;
}) {
  const pickerValue = safeHexForPicker(value, "#ffffff");
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <FieldLabel>{label}</FieldLabel>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>{token}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 44, height: 40, border: "1px solid #e2e8f0", borderRadius: 12, padding: 0, background: "#fff" }}
          aria-label={`${label} color`}
        />
        <input
          className="bf-ab-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "#000000"}
        />
        <button className="bf-btn bf-btn-ghost" type="button" onClick={onClear} style={{ whiteSpace: "nowrap" }}>
          Clear
        </button>
      </div>
    </div>
  );
}

export default function AppearanceBrandPanel({ model }: Props) {
  const [tab, setTab] = React.useState<TabKey>("basics");
  const [mobilePreviewOpen, setMobilePreviewOpen] = React.useState(false);

  const m = model || {};

  // Derived flags
  const isUnauthorized = Boolean(m?.brandError && String(m.brandError).toLowerCase().includes("unauthor"));
  const canSaveBrand = typeof m?.saveBranding === "function";

  const TabBar = (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 6,
        WebkitOverflowScrolling: "touch",
      }}
    >
      <TabButton active={tab === "basics"} onClick={() => setTab("basics")}>
        Basics
      </TabButton>
      <TabButton active={tab === "colors"} onClick={() => setTab("colors")}>
        Colors
      </TabButton>
      <TabButton active={tab === "typography"} onClick={() => setTab("typography")}>
        Typography
      </TabButton>
      <TabButton active={tab === "components"} onClick={() => setTab("components")}>
        Components
      </TabButton>
      <TabButton active={tab === "behavior"} onClick={() => setTab("behavior")}>
        Booking UI
      </TabButton>
      <TabButton active={tab === "assets"} onClick={() => setTab("assets")}>
        Assets
      </TabButton>
      <TabButton active={tab === "terminology"} onClick={() => setTab("terminology")}>
        Terminology
      </TabButton>
      <TabButton active={tab === "themeStudio"} onClick={() => setTab("themeStudio")}>
        Theme Studio
      </TabButton>
      <TabButton active={tab === "home"} onClick={() => setTab("home")}>
        Home tab
      </TabButton>    </div>
  );

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        background: "#f9fafb",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {/* Local CSS for responsive grid + sticky preview */}
      <style>{`
        .bf-ab-shell { display: grid; grid-template-columns: 1fr; gap: 14px; }
        .bf-ab-right { position: static; }
        .bf-ab-grid.bf-ab-grid-cols-3 { grid-template-columns: 1fr; }
        .bf-ab-grid.bf-ab-grid-cols-2 { grid-template-columns: 1fr; }
        @media (min-width: 740px) {
          .bf-ab-grid.bf-ab-grid-cols-2 { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1024px) {
          .bf-ab-shell { grid-template-columns: minmax(0, 1fr) 360px; align-items: start; }
          .bf-ab-right { position: sticky; top: 88px; }
          .bf-ab-grid.bf-ab-grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
        }
        .bf-ab-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .bf-ab-actions .bf-btn { border-radius: 12px; padding: 10px 12px; font-weight: 800; font-size: 12px; }
        .bf-btn { border: 1px solid #e2e8f0; background: #fff; cursor: pointer; }
        .bf-btn:hover { background: #f8fafc; }
        .bf-btn-primary { border-color: #0f172a; background: #0f172a; color: #fff; }
        .bf-btn-primary:hover { background: #111827; }
        .bf-btn-ghost { background: #fff; }
        .bf-ab-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; font-size: 13px; }
        .bf-ab-select { width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; font-size: 13px; background: #fff; }
        .bf-ab-row { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 740px) { .bf-ab-row { grid-template-columns: 1.2fr 1fr; align-items: end; } }

        /* Global actions (duplicated with per-tab actions) */
        .bf-ab-bottombar { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
        @media (max-width: 1023px) {
          .bf-ab-bottombar {
            position: sticky;
            bottom: 0;
            margin-left: 0;
            margin-right: 0;
            padding: 12px 14px;
            background: rgba(249, 250, 251, 0.96);
            backdrop-filter: blur(6px);
            border-top: 1px solid #e2e8f0;
            border-bottom-left-radius: 14px;
            border-bottom-right-radius: 14px;
          }
        }
      `}</style>

      <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 6 }}>Appearance & Brand</h3>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        A professional control panel for your booking page: theme layout + brand tokens + UI behavior. Your changes
        are tenant-scoped and safe.{" "}
      </div>

      {/* Sub-tabs */}
      <div style={{ marginBottom: 12 }}>{TabBar}</div>

      <div className="bf-ab-shell">
        {/* LEFT: active section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tab === "basics" ? (
            <SettingsCard
              title="Brand Basics"
              description="Presets update colors/buttons/typography/booking UI toggles (uploaded images remain)."
            >
              <div className="bf-ab-row">
                <div>
                  <FieldLabel>Preset</FieldLabel>
                  <select
                    className="bf-ab-select"
                    value={String(m.brandPreset || "default")}
                    onChange={(e) => m.applyBrandPreset?.(e.target.value)}
                  >
                    {Object.keys(m.BRAND_PRESETS || { default: true }).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>Theme (layout)</FieldLabel>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      className="bf-ab-select"
                      style={{ flex: "1 1 220px" }}
                      value={String(m.themeKeyDraft || "default_v1")}
                      onChange={(e) => m.setThemeKeyDraft?.(e.target.value)}
                      disabled={Boolean(m.themeSaving)}
                    >
                      {(m.publishedThemes && Array.isArray(m.publishedThemes) && m.publishedThemes.length
                        ? m.publishedThemes
                        : [
                            { key: "default_v1", name: "Default v1 (classic)" },
                            { key: "premium_v1", name: "Premium v1" },
                            { key: "modern_v1", name: "Modern v1" },
                            { key: "minimal_v1", name: "Minimal v1" },
                          ]
                      ).map((t: any) => (
                        <option key={t.key} value={t.key}>
                          {t.name || t.key}
                        </option>
                      ))}
                    </select>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        fontSize: 12,
                        color: "#0f172a",
                        fontWeight: 800,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: "#22c55e",
                          display: "inline-block",
                        }}
                      />
                      Live Theme: {m?.liveThemeMeta?.name || "—"}
                    </span>

                    <button className="bf-btn bf-btn-ghost" type="button" onClick={() => m.openBookingLive?.()}>
                      Open booking page
                    </button>
                    <button className="bf-btn bf-btn-primary" type="button" onClick={() => m.previewBookingSelectedTheme?.()}>
                      Preview booking page
                    </button>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                    This controls which booking page layout loads by default.
                  </div>

                  <div style={{ marginTop: 10 }} className="bf-ab-actions">
                    <button
                      className="bf-btn bf-btn-primary"
                      type="button"
                      onClick={() => m.saveThemeKey?.(String(m.themeKeyDraft || "").trim())}
                      disabled={Boolean(m.themeSaving)}
                    >
                      {m.themeSaving ? "Saving…" : "Save theme"}
                    </button>

                    {m.themeMessage ? (
                      <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 800 }}>{String(m.themeMessage)}</span>
                    ) : null}
                    {m.themeError ? (
                      <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 800 }}>{String(m.themeError)}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </SettingsCard>
          ) : null}

          {tab === "colors" ? (
            <SettingsCard
              title="Core Colors"
              description="Brand colors. For Classic / Modern / Minimal all fields apply directly. For Premium themes, Background and Card surface override the glass defaults."
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Primary + Accent — all themes */}
                <ColorTokenRow
                  label="Primary (brand color, buttons, accents)"
                  token="--bf-brand-primary"
                  value={String(m.brandDraft?.colors?.primary || "")}
                  onChange={(v) => m.setBrandColor?.("primary", v)}
                  onClear={() => m.setBrandColor?.("primary", "")}
                  fullWidth
                />
                <ColorTokenRow
                  label="Accent (derived glows & highlights)"
                  token="colors.accent"
                  value={String(m.brandDraft?.colors?.accent || "")}
                  onChange={(v) => m.setBrandColor?.("accent", v)}
                  onClear={() => m.setBrandColor?.("accent", "")}
                  fullWidth
                />

                {/* Page + Card surface — 2 column */}
                <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Page &amp; card surfaces
                </div>
                <SettingsGrid cols={2}>
                  <ColorTokenRow
                    label="Page background"
                    token="--bf-page-bg"
                    value={String(m.brandDraft?.colors?.background || "")}
                    onChange={(v) => m.setBrandColor?.("background", v)}
                    onClear={() => m.setBrandColor?.("background", "")}
                    fullWidth
                  />
                  <ColorTokenRow
                    label="Card surface (--bf-card-bg)"
                    token="--bf-surface / --bf-card-bg"
                    value={String(m.brandDraft?.colors?.surface || "")}
                    onChange={(v) => m.setBrandColor?.("surface", v)}
                    onClear={() => m.setBrandColor?.("surface", "")}
                    fullWidth
                  />
                </SettingsGrid>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                  On <strong>Premium</strong> themes the card surface sets the glass base colour (e.g. <code>rgba(2,6,23,0.38)</code> for dark glass).
                  Leave blank to use the theme default.
                </div>

                {/* Text + Muted + Border */}
                <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Text &amp; borders
                </div>
                <SettingsGrid cols={3}>
                  <ColorTokenRow
                    label="Text"
                    token="--bf-text-main"
                    value={String(m.brandDraft?.colors?.text || "")}
                    onChange={(v) => m.setBrandColor?.("text", v)}
                    onClear={() => m.setBrandColor?.("text", "")}
                    fullWidth
                  />
                  <ColorTokenRow
                    label="Muted text"
                    token="--bf-text-muted"
                    value={String(m.brandDraft?.colors?.mutedText || "")}
                    onChange={(v) => m.setBrandColor?.("mutedText", v)}
                    onClear={() => m.setBrandColor?.("mutedText", "")}
                    fullWidth
                  />
                  <ColorTokenRow
                    label="Border"
                    token="--bf-border"
                    value={String(m.brandDraft?.colors?.border || "")}
                    onChange={(v) => m.setBrandColor?.("border", v)}
                    onClear={() => m.setBrandColor?.("border", "")}
                    fullWidth
                  />
                </SettingsGrid>

                <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                  Tip: CSS values like <code>rgba(2,6,23,0.38)</code> work — the colour picker falls back to white but the booking page uses your value correctly.
                </div>
              </div>

              <div style={{ marginTop: 12 }} className="bf-ab-actions">
                <button className="bf-btn bf-btn-primary" type="button" onClick={() => m.saveBranding?.()} disabled={!canSaveBrand || Boolean(m.brandSaving)}>
                  {m.brandSaving ? "Saving…" : "Save brand settings"}
                </button>
                <button className="bf-btn bf-btn-ghost" type="button" onClick={() => m.resetBrandDraft?.()}>
                  Reset changes
                </button>

                {m.brandMessage ? (
                  <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 800 }}>{String(m.brandMessage)}</span>
                ) : null}
                {m.brandError ? (
                  <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 800 }}>{String(m.brandError)}</span>
                ) : null}
              </div>
            </SettingsCard>
          ) : null}
          {tab === "typography" ? (
            <SettingsCard title="Typography" description="Set your font family and weight scale.">
              <SettingsGrid cols={2}>
                <div>
                  <FieldLabel>Font family</FieldLabel>
                  <select
                    className="bf-ab-select"
                    value={String(m.brandDraft?.typography?.fontFamily || "system")}
                    onChange={(e) => m.setBrandTypography?.("fontFamily", e.target.value)}
                  >
                    <option value="system">System</option>
                    <option value="inter">Inter</option>
                    <option value="serif">Serif</option>
                  </select>
                </div>

                <div>
                  <FieldLabel>Heading weight ({Number(m.brandDraft?.typography?.headingWeight || 700)})</FieldLabel>
                  <input
                    type="range"
                    min={300}
                    max={900}
                    step={50}
                    value={Number(m.brandDraft?.typography?.headingWeight || 700)}
                    onChange={(e) => m.setBrandTypography?.("headingWeight", Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <FieldLabel>Body weight ({Number(m.brandDraft?.typography?.bodyWeight || 400)})</FieldLabel>
                  <input
                    type="range"
                    min={300}
                    max={900}
                    step={50}
                    value={Number(m.brandDraft?.typography?.bodyWeight || 400)}
                    onChange={(e) => m.setBrandTypography?.("bodyWeight", Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
              </SettingsGrid>

              {/* Live text sample (helps the tab feel complete) */}
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  background: "#f8fafc",
                }}
              >
                {(() => {
                  const ff = String(m.brandDraft?.typography?.fontFamily || "system");
                  const family = ff === "inter" ? "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial" : ff === "serif" ? "ui-serif, Georgia, Times New Roman, Times" : "system-ui, -apple-system, Segoe UI, Roboto, Arial";
                  const hw = Number(m.brandDraft?.typography?.headingWeight || 700);
                  const bw = Number(m.brandDraft?.typography?.bodyWeight || 400);
                  return (
                    <>
                      <div style={{ fontFamily: family, fontWeight: hw, fontSize: 18, color: "#0f172a", marginBottom: 6 }}>
                        Example heading
                      </div>
                      <div style={{ fontFamily: family, fontWeight: bw, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                        This is sample body text to preview your typography choices. Adjust the weights above to see how headings and paragraphs feel.
                      </div>
                    </>
                  );
                })()}
              </div>

              <div style={{ marginTop: 12 }} className="bf-ab-actions">
                <button className="bf-btn bf-btn-primary" type="button" onClick={() => m.saveBranding?.()} disabled={!canSaveBrand || Boolean(m.brandSaving)}>
                  {m.brandSaving ? "Saving…" : "Save brand settings"}
                </button>
                <button className="bf-btn bf-btn-ghost" type="button" onClick={() => m.resetBrandDraft?.()}>
                  Reset changes
                </button>
              </div>
            </SettingsCard>
          ) : null}

          {tab === "components" ? (
            <SettingsCard title="Components (Advanced)" description="Fine-tune selection highlight, pills, and button tokens. Safe & reversible.">
              {/* Organized into 2 clear panels (desktop) / stacked (mobile) */}
              <SettingsGrid cols={2}>
                <SettingsCard title="Pills" description="Controls the service/day tabs on the booking page.">
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Default state</div>
                      <SettingsGrid cols={2}>
                        <TokenRow
                          label="Border"
                          token="--bf-pill-border"
                          value={m.advGet?.("--bf-pill-border", "")}
                          onChange={(v) => m.setAdv?.("--bf-pill-border", v)}
                          onClear={() => m.clearAdv?.("--bf-pill-border")}
                        />
                        <TokenRow
                          label="Background"
                          token="--bf-pill-bg"
                          value={m.advGet?.("--bf-pill-bg", "")}
                          onChange={(v) => m.setAdv?.("--bf-pill-bg", v)}
                          onClear={() => m.clearAdv?.("--bf-pill-bg")}
                        />
                        <TokenRow
                          label="Text"
                          token="--bf-pill-text"
                          value={m.advGet?.("--bf-pill-text", "")}
                          onChange={(v) => m.setAdv?.("--bf-pill-text", v)}
                          onClear={() => m.clearAdv?.("--bf-pill-text")}
                        />
                      </SettingsGrid>
                    </div>

                    <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Selected state</div>
                      <SettingsGrid cols={2}>
                        <TokenRow
                          label="Border"
                          token="--bf-pill-selected-border"
                          value={m.advGet?.("--bf-pill-selected-border", "")}
                          onChange={(v) => m.setAdv?.("--bf-pill-selected-border", v)}
                          onClear={() => m.clearAdv?.("--bf-pill-selected-border")}
                        />
                        <TokenRow
                          label="Background"
                          token="--bf-pill-selected-bg"
                          value={m.advGet?.("--bf-pill-selected-bg", "")}
                          placeholder="optional"
                          onChange={(v) => m.setAdv?.("--bf-pill-selected-bg", v)}
                          onClear={() => m.clearAdv?.("--bf-pill-selected-bg")}
                        />
                        <TokenRow
                          label="Text"
                          token="--bf-pill-selected-text"
                          value={m.advGet?.("--bf-pill-selected-text", "")}
                          placeholder="optional"
                          onChange={(v) => m.setAdv?.("--bf-pill-selected-text", v)}
                          onClear={() => m.clearAdv?.("--bf-pill-selected-text")}
                        />
                      </SettingsGrid>
                    </div>

                    <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 12 }}>
                      <TokenRow
                        label="Glow shadow (CSS box-shadow)"
                        token="--bf-pill-glow"
                        fullWidth
                        value={m.advGet?.("--bf-pill-glow", "")}
                        placeholder="e.g. 0 0 0 3px rgba(34,197,94,0.25)"
                        onChange={(v) => m.setAdv?.("--bf-pill-glow", v)}
                        onClear={() => m.clearAdv?.("--bf-pill-glow")}
                      />
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard title="Selection highlight" description="Controls the selected slot highlight and focus state.">
                  <SettingsGrid cols={2}>
                    <TokenRow
                      label="Background"
                      token="--bf-highlight-bg"
                      value={m.advGet?.("--bf-highlight-bg", "")}
                      placeholder="e.g. rgba(34,197,94,0.12)"
                      onChange={(v) => m.setAdv?.("--bf-highlight-bg", v)}
                      onClear={() => m.clearAdv?.("--bf-highlight-bg")}
                    />
                    <TokenRow
                      label="Text"
                      token="--bf-highlight-text"
                      value={m.advGet?.("--bf-highlight-text", "")}
                      placeholder="#0f172a"
                      onChange={(v) => m.setAdv?.("--bf-highlight-text", v)}
                      onClear={() => m.clearAdv?.("--bf-highlight-text")}
                    />
                  </SettingsGrid>

                  <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
                    Tip: If you leave a token blank, the booking UI will fall back to the active preset/theme defaults.
                  </div>
                </SettingsCard>
              </SettingsGrid>

              <div style={{ marginTop: 12 }} className="bf-ab-actions">
                <button className="bf-btn bf-btn-primary" type="button" onClick={() => m.onSaveBrandOverrides?.()} disabled={!m.onSaveBrandOverrides}>
                  Save advanced styles
                </button>
                <button className="bf-btn bf-btn-ghost" type="button" onClick={() => m.resetAdvancedDraft?.()}>
                  Reset advanced styles
                </button>
              </div>
            </SettingsCard>
          ) : null}

          {tab === "behavior" ? (
            <SettingsCard title="Booking UI behavior" description="Control density, service metadata, and hero behavior.">
              <SettingsGrid cols={2}>
                <div>
                  <FieldLabel>Density</FieldLabel>
                  <select
                    className="bf-ab-select"
                    value={String(m.brandDraft?.bookingUi?.density || "comfortable")}
                    onChange={(e) => m.setBrandBookingUi?.("density", e.target.value)}
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>

                <div>
                  <FieldLabel>Hero mode</FieldLabel>
                  <select
                    className="bf-ab-select"
                    value={String(m.brandDraft?.bookingUi?.heroMode || "tab-banners")}
                    onChange={(e) => m.setBrandBookingUi?.("heroMode", e.target.value)}
                  >
                    <option value="tab-banners">Tab banners (per tab)</option>
                    <option value="single-hero">Single hero</option>
                  </select>
                </div>

                <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(m.brandDraft?.bookingUi?.showServiceMeta)}
                    onChange={(e) => m.setBrandBookingUi?.("showServiceMeta", e.target.checked)}
                  />
                  Show service details under the service dropdown
                </label>

                <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(m.brandDraft?.bookingUi?.useLogoAsFavicon)}
                    onChange={(e) => m.setBrandBookingUi?.("useLogoAsFavicon", e.target.checked)}
                  />
                  Use logo as favicon (if favicon not uploaded)
                </label>

                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Tab visibility
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(m.brandDraft?.bookingUi?.showMembershipsTab ?? true)}
                        onChange={(e) => m.setBrandBookingUi?.("showMembershipsTab", e.target.checked)}
                      />
                      Show Memberships tab on booking app
                    </label>
                    <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(m.brandDraft?.bookingUi?.showPackagesTab ?? true)}
                        onChange={(e) => m.setBrandBookingUi?.("showPackagesTab", e.target.checked)}
                      />
                      Show Packages tab on booking app
                    </label>
                  </div>
                </div>
              </SettingsGrid>

              <div style={{ marginTop: 12 }} className="bf-ab-actions">
                <button className="bf-btn bf-btn-primary" type="button" onClick={() => m.saveBranding?.()} disabled={!canSaveBrand || Boolean(m.brandSaving)}>
                  {m.brandSaving ? "Saving…" : "Save brand settings"}
                </button>
                <button className="bf-btn bf-btn-ghost" type="button" onClick={() => m.resetBrandDraft?.()}>
                  Reset changes
                </button>
              </div>
            </SettingsCard>
          ) : null}

          {tab === "assets" ? (
            <SettingsCard title="Assets" description="Upload favicon and hero image. Banners can be set in Images tab.">
              <SettingsGrid cols={2}>
                <SettingsCard title="Favicon" description="Shown in browser tabs + bookmarks.">
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && m.uploadBrandAsset?.("favicon", e.target.files[0])} />
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {m.brandDraft?.assets?.faviconUrl ? "set" : "not set"}
                    </span>
                  </div>
                </SettingsCard>

                <SettingsCard title="Hero image" description="Optional image used when Hero mode is single-hero.">
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && m.uploadBrandAsset?.("hero", e.target.files[0])} />
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {m.brandDraft?.assets?.heroUrl ? "set" : "not set"}
                    </span>
                  </div>
                </SettingsCard>
              </SettingsGrid>

              <div style={{ marginTop: 12 }} className="bf-ab-actions">
                <button className="bf-btn bf-btn-primary" type="button" onClick={() => m.saveBranding?.()} disabled={!canSaveBrand || Boolean(m.brandSaving)}>
                  {m.brandSaving ? "Saving…" : "Save brand settings"}
                </button>
                <button className="bf-btn bf-btn-ghost" type="button" onClick={() => m.resetBrandDraft?.()}>
                  Reset changes
                </button>
              </div>
            </SettingsCard>
          ) : null}

          {tab === "terminology" ? (
            <SettingsCard title="Terminology (Booking UI)" description='Rename “Staff” and “Resources” to match your business.'>
              <SettingsGrid cols={2}>
                <div>
                  <FieldLabel>Staff label (singular)</FieldLabel>
                  <input
                    className="bf-ab-input"
                    value={String(m.brandDraft?.terminology?.staffLabelSingular || "")}
                    onChange={(e) => m.setBrandTerminology?.("staffLabelSingular", e.target.value)}
                    placeholder="Staff"
                  />
                </div>
                <div>
                  <FieldLabel>Resource label (singular)</FieldLabel>
                  <input
                    className="bf-ab-input"
                    value={String(m.brandDraft?.terminology?.resourceLabelSingular || "")}
                    onChange={(e) => m.setBrandTerminology?.("resourceLabelSingular", e.target.value)}
                    placeholder="Resource"
                  />
                </div>
              </SettingsGrid>

              <div style={{ marginTop: 12 }} className="bf-ab-actions">
                <button className="bf-btn bf-btn-primary" type="button" onClick={() => m.saveBranding?.()} disabled={!canSaveBrand || Boolean(m.brandSaving)}>
                  {m.brandSaving ? "Saving…" : "Save brand settings"}
                </button>
                <button className="bf-btn bf-btn-ghost" type="button" onClick={() => m.resetBrandDraft?.()}>
                  Reset changes
                </button>
              </div>
            </SettingsCard>
          ) : null}

          {tab === "themeStudio" ? (
            <SettingsCard title="Theme Studio" description="Layout density and premium theme options. These settings do not change your brand colors.">
              <ThemeStudioPanel
                tenantId={Number(m?.tenant?.id || m?.tenantId || 0)}
                tenantSlug={String(m?.tenant?.slug || m?.tenantSlug || "")}
                liveThemeKey={String(m?.tenant?.theme_key || m?.liveThemeKey || m?.themeKeyDraft || "")}
                liveLayoutKey={String(m?.liveThemeMeta?.layout || m?.liveLayoutKey || "") || null}
              />
            </SettingsCard>
          ) : null}

          {tab === "home" ? (
            <SettingsCard title="Booking Home landing page" description="Content appears on the customer booking page Home tab. Choose a template, load a preset, then save and publish.">
              <HomeLandingEditorSection
                homeLanding={m.homeLanding}
                setHomeLanding={m.setHomeLanding}
                saveHomeLanding={() => m.saveHomeLanding?.()}
                homeLandingSaving={Boolean(m.homeLandingSaving)}
                homeLandingLoading={Boolean(m.homeLandingLoading)}
                homeLandingError={m.homeLandingError}
                homeLandingMessage={m.homeLandingMessage}
              />
            </SettingsCard>
          ) : null}
          {isUnauthorized ? (
            <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 800 }}>
              Unauthorized: You may need to sign in again or check owner permissions.
            </div>
          ) : null}
        </div>

        {/* RIGHT: preview (sticky on desktop) */}
        <div className="bf-ab-right">
          {/* Mobile: collapsible preview */}
          <div style={{ display: "block" }}>
            <div className="bf-ab-actions" style={{ marginBottom: 10 }}>
              <button className="bf-btn bf-btn-ghost" type="button" onClick={() => setMobilePreviewOpen((v) => !v)}>
                {mobilePreviewOpen ? "Hide preview" : "Show preview"}
              </button>
            </div>
            {mobilePreviewOpen ? (
              <PreviewPane onOpenBooking={m.openBookingLive} onPreviewBooking={m.previewBookingSelectedTheme} isMobile />
            ) : (
              <div className="bf-ab-preview-desktop">
                <PreviewPane onOpenBooking={m.openBookingLive} onPreviewBooking={m.previewBookingSelectedTheme} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global action bar (always visible; per-tab actions remain) */}
      <div className="bf-ab-bottombar">
        <div className="bf-ab-actions" style={{ alignItems: "center" }}>
          <button
            className="bf-btn bf-btn-primary"
            type="button"
            onClick={() => m.saveBranding?.()}
            disabled={!canSaveBrand || Boolean(m.brandSaving)}
          >
            {m.brandSaving ? "Saving…" : "Save brand settings"}
          </button>
          <button className="bf-btn bf-btn-ghost" type="button" onClick={() => m.resetBrandDraft?.()}>
            Reset changes
          </button>

          {m.brandMessage ? (
            <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 800 }}>{String(m.brandMessage)}</span>
          ) : null}
          {m.brandError ? (
            <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 800 }}>{String(m.brandError)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
