"use client";

import React from "react";
import { BIRDIE_LANDING_DEFAULTS } from "@/lib/booking/birdieLandingDefaults";

type Props = {
  homeLanding: any;
  setHomeLanding: any;
  saveHomeLanding: () => void;
  homeLandingSaving: boolean;
  homeLandingLoading: boolean;
  homeLandingError?: string;
  homeLandingMessage?: string;
};

export function HomeLandingEditorSection({
  homeLanding,
  setHomeLanding,
  saveHomeLanding,
  homeLandingSaving,
  homeLandingLoading,
  homeLandingError = "",
  homeLandingMessage = "",
}: Props) {
  return (
    <>
  <div
    style={{
      padding: 14,
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      background: "#ffffff",
      marginTop: 14,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Booking Home landing page</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          This content powers the customer booking Home tab. Save draft here, then publish the booking page to make changes live.
        </div>
      </div>

      <button
        type="button"
        onClick={saveHomeLanding}
        disabled={homeLandingSaving || homeLandingLoading}
        style={{
          border: "none",
          borderRadius: 999,
          padding: "8px 12px",
          fontWeight: 900,
          fontSize: 12,
          background: homeLandingSaving ? "#94a3b8" : "#0f172a",
          color: "#fff",
          cursor: homeLandingSaving ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {homeLandingSaving ? "Saving…" : "Save draft"}
      </button>
    </div>

    {homeLandingLoading ? (
      <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>Loading landing content…</div>
    ) : (
      <>
        {homeLandingError && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {homeLandingError}
          </div>
        )}

        {homeLandingMessage && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {homeLandingMessage}
          </div>
        )}

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div className="bf-grid-2">
            <div className="bf-form-stack">
              <div className="bf-field-label">Home template</div>
              <select
                className="bf-input"
                value={homeLanding.templateKey || "default"}
                onChange={(e) =>
                  setHomeLanding((p: any) => ({
                    ...(p || {}),
                    templateKey: e.target.value,
                    version: 1,
                  }))
                }
              >
                <option value="default">Default</option>
                <option value="wellness_editorial">Wellness editorial</option>
                <option value="birdie_destination">Birdie destination</option>
              </select>
            </div>

            <div className="bf-form-stack">
              <div className="bf-field-label">Template version</div>
              <input className="bf-input" value={String(homeLanding.version || 1)} disabled />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="bf-secondary-btn"
              onClick={() =>
                setHomeLanding((p: any) => ({
                  ...(p || {}),
                  templateKey: "wellness_editorial",
                  version: 1,
                  headline: "Welcome to Al-Razi, a space to grow, heal, and connect",
                  description:
                    "A new holistic wellness space in Amman, offering a space to heal, connect and grow. Home to therapists, specialists, healing practises and more.",
                  ctas: {
                    ...(p?.ctas || {}),
                    primary: { label: "Book Now", action: "book", href: "" },
                    secondary: { label: "My Bookings", action: "history", href: "" },
                  },
                  editorial: {
                    topNavLinks: [
                      { label: "About Us" },
                      { label: "Specialists" },
                      { label: "Group Sessions" },
                      { label: "Join the Team" },
                    ],
                    sectionTitle: "MENTAL WELLBEING MATTERS",
                    sectionBody:
                      "At Al-Razi, wellness isn’t rushed, intimidating, or out of reach. We create a calm, grounded place where healing feels natural",
                    introCards: [
                      {
                        title: "Support Group Sessions",
                        bodyLines: [
                          "Join any one of the many support group sessions",
                          "listen, share and grow with others",
                        ],
                      },
                      {
                        title: "A Holistic Approach to Health",
                        bodyLines: [
                          "At Al Razi there is a wide variety of specialists to choose from",
                          "create a well-rounded program to help you heal",
                        ],
                      },
                      {
                        title: "Movement for Therapy and Alignment",
                        accentLine: "Healthy Body, Sound Mind",
                        bodyLines: [
                          "Choose from a wide range of movement classes to enhance your mental wellbeing journey",
                        ],
                      },
                    ],
                    journey: {
                      eyebrow: "Tailored to you",
                      title: "Sessions Include",
                      body: "At Al Razi there is a wide range of sessions all catered to your specific needs. Tailored programs mean a fully rounded experience",
                      ctaLabel: "Discover More",
                      items: [
                        {
                          index: "01",
                          title: "Life Coaching & Therapy",
                          body: "Choose from a wide range of specialists to suit your need",
                        },
                        {
                          index: "02",
                          title: "Nutrition",
                          body: "Sit with specialised nutritionists to help improve your physical health",
                        },
                        {
                          index: "03",
                          title: "Movement",
                          body: "Choose from the right movement, meditation or breathing program to help rebuild inner peace",
                        },
                      ],
                    },
                    contactBlock: {
                      locationTitle: "Our Location",
                      addressLines: ["5 Saeed Abu Jaber Street", "Um Uthaina", "Amman", "Jordan"],
                      contactTitle: "Contact Us",
                      phones: ["+962 7 9 5233 133", "+962 7 9 555 0001"],
                      mapImageUrl: "",
                    },
                  },
                }))
              }
              style={{
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Load wellness preset
            </button>

            <button
              type="button"
              className="bf-secondary-btn"
              onClick={() => setHomeLanding(() => JSON.parse(JSON.stringify(BIRDIE_LANDING_DEFAULTS)))}
              style={{
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Load Birdie landing preset
            </button>

          </div>
          <div className="bf-grid-2">
            <div className="bf-form-stack">
              <div className="bf-field-label">Headline</div>
              <input
                className="bf-input"
                value={homeLanding.headline || ""}
                onChange={(e) => setHomeLanding((p: any) => ({ ...p, headline: e.target.value }))}
                placeholder="e.g. Birdie Golf"
              />
            </div>

            <div className="bf-form-stack">
              <div className="bf-field-label">Hero image URL (optional)</div>
              <input
                className="bf-input"
                value={homeLanding.heroImageUrl || ""}
                onChange={(e) => setHomeLanding((p: any) => ({ ...p, heroImageUrl: e.target.value }))}
                placeholder="https://..."
              />
              {(homeLanding.templateKey || "default") === "birdie_destination" && (
                <div style={{ display: "grid", gap: 12, marginTop: 8, padding: 12, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Birdie landing sections</div>
                  <div className="bf-grid-2">
                    <div className="bf-form-stack">
                      <div className="bf-field-label">Birdie hero headline</div>
                      <input className="bf-input" value={homeLanding.birdie?.hero?.headline || ""} onChange={(e) => setHomeLanding((p: any) => ({ ...(p || {}), birdie: { ...(p?.birdie || {}), hero: { ...(p?.birdie?.hero || {}), headline: e.target.value } } }))} />
                    </div>
                    <div className="bf-form-stack">
                      <div className="bf-field-label">Birdie hero image URL</div>
                      <input className="bf-input" value={homeLanding.birdie?.hero?.heroImageUrl || ""} onChange={(e) => setHomeLanding((p: any) => ({ ...(p || {}), birdie: { ...(p?.birdie || {}), hero: { ...(p?.birdie?.hero || {}), heroImageUrl: e.target.value } } }))} />
                    </div>
                  </div>
                  <div className="bf-form-stack">
                    <div className="bf-field-label">Birdie hero body</div>
                    <textarea className="bf-input" rows={3} value={homeLanding.birdie?.hero?.body || ""} onChange={(e) => setHomeLanding((p: any) => ({ ...(p || {}), birdie: { ...(p?.birdie || {}), hero: { ...(p?.birdie?.hero || {}), body: e.target.value } } }))} />
                  </div>
                  <div className="bf-grid-2">
                    <div className="bf-form-stack">
                      <div className="bf-field-label">Memberships promo heading</div>
                      <input className="bf-input" value={homeLanding.birdie?.membershipPromo?.heading || ""} onChange={(e) => setHomeLanding((p: any) => ({ ...(p || {}), birdie: { ...(p?.birdie || {}), membershipPromo: { ...(p?.birdie?.membershipPromo || {}), heading: e.target.value } } }))} />
                    </div>
                    <div className="bf-form-stack">
                      <div className="bf-field-label">Visit section heading</div>
                      <input className="bf-input" value={homeLanding.birdie?.visit?.heading || ""} onChange={(e) => setHomeLanding((p: any) => ({ ...(p || {}), birdie: { ...(p?.birdie || {}), visit: { ...(p?.birdie?.visit || {}), heading: e.target.value } } }))} />
                    </div>
                  </div>
                </div>
              )}

              {(homeLanding.templateKey || "default") === "wellness_editorial" && (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>
                Wellness editorial content
              </div>

              <div className="bf-form-stack">
                <div className="bf-field-label">Top nav links (one per line)</div>
                <textarea
                  className="bf-input"
                  rows={4}
                  value={Array.isArray(homeLanding.editorial?.topNavLinks)
                    ? homeLanding.editorial.topNavLinks.map((x: any) => String(x?.label || "")).join("\n")
                    : ""}
                  onChange={(e) =>
                    setHomeLanding((p: any) => ({
                      ...(p || {}),
                      editorial: {
                        ...(p?.editorial || {}),
                        topNavLinks: e.target.value
                          .split("\n")
                          .map((x: string) => x.trim())
                          .filter(Boolean)
                          .map((label: string) => ({ label })),
                      },
                    }))
                  }
                  placeholder={"About Us\nSpecialists\nGroup Sessions\nJoin the Team"}
                />
              </div>

              <div className="bf-grid-2">
                <div className="bf-form-stack">
                  <div className="bf-field-label">Section title</div>
                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.sectionTitle || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => ({
                        ...(p || {}),
                        editorial: { ...(p?.editorial || {}), sectionTitle: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="bf-form-stack">
                  <div className="bf-field-label">Section body</div>
                  <textarea
                    className="bf-input"
                    rows={3}
                    value={homeLanding.editorial?.sectionBody || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => ({
                        ...(p || {}),
                        editorial: { ...(p?.editorial || {}), sectionBody: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              {[0, 1, 2].map((idx) => (
                <div
                  key={`intro-card-${idx}`}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                    Intro card {idx + 1}
                  </div>

                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.introCards?.[idx]?.title || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => {
                        const cards = Array.isArray(p?.editorial?.introCards) ? [...p.editorial.introCards] : [];
                        cards[idx] = {
                          ...(cards[idx] || {}),
                          title: e.target.value,
                          bodyLines: Array.isArray(cards[idx]?.bodyLines) ? cards[idx].bodyLines : [],
                        };
                        return { ...(p || {}), editorial: { ...(p?.editorial || {}), introCards: cards } };
                      })
                    }
                    placeholder="Card title"
                  />

                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.introCards?.[idx]?.accentLine || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => {
                        const cards = Array.isArray(p?.editorial?.introCards) ? [...p.editorial.introCards] : [];
                        cards[idx] = {
                          ...(cards[idx] || {}),
                          accentLine: e.target.value,
                          bodyLines: Array.isArray(cards[idx]?.bodyLines) ? cards[idx].bodyLines : [],
                        };
                        return { ...(p || {}), editorial: { ...(p?.editorial || {}), introCards: cards } };
                      })
                    }
                    placeholder="Accent line (optional)"
                  />

                  <textarea
                    className="bf-input"
                    rows={3}
                    value={Array.isArray(homeLanding.editorial?.introCards?.[idx]?.bodyLines)
                      ? homeLanding.editorial.introCards[idx].bodyLines.join("\n")
                      : ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => {
                        const cards = Array.isArray(p?.editorial?.introCards) ? [...p.editorial.introCards] : [];
                        cards[idx] = {
                          ...(cards[idx] || {}),
                          title: cards[idx]?.title || "",
                          accentLine: cards[idx]?.accentLine || "",
                          bodyLines: e.target.value.split("\n").map((x: string) => x.trim()).filter(Boolean),
                        };
                        return { ...(p || {}), editorial: { ...(p?.editorial || {}), introCards: cards } };
                      })
                    }
                    placeholder={"Line 1\nLine 2"}
                  />
                </div>
              ))}

              <div className="bf-grid-2">
                <div className="bf-form-stack">
                  <div className="bf-field-label">Journey eyebrow</div>
                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.journey?.eyebrow || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => ({
                        ...(p || {}),
                        editorial: {
                          ...(p?.editorial || {}),
                          journey: { ...(p?.editorial?.journey || {}), eyebrow: e.target.value },
                        },
                      }))
                    }
                  />
                </div>

                <div className="bf-form-stack">
                  <div className="bf-field-label">Journey title</div>
                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.journey?.title || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => ({
                        ...(p || {}),
                        editorial: {
                          ...(p?.editorial || {}),
                          journey: { ...(p?.editorial?.journey || {}), title: e.target.value },
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="bf-form-stack">
                <div className="bf-field-label">Journey body</div>
                <textarea
                  className="bf-input"
                  rows={3}
                  value={homeLanding.editorial?.journey?.body || ""}
                  onChange={(e) =>
                    setHomeLanding((p: any) => ({
                      ...(p || {}),
                      editorial: {
                        ...(p?.editorial || {}),
                        journey: { ...(p?.editorial?.journey || {}), body: e.target.value },
                      },
                    }))
                  }
                />
              </div>

              {[0, 1, 2].map((idx) => (
                <div key={`journey-item-${idx}`} className="bf-grid-3">
                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.journey?.items?.[idx]?.index || String(idx + 1).padStart(2, "0")}
                    onChange={(e) =>
                      setHomeLanding((p: any) => {
                        const items = Array.isArray(p?.editorial?.journey?.items) ? [...p.editorial.journey.items] : [];
                        items[idx] = { ...(items[idx] || {}), index: e.target.value, title: items[idx]?.title || "", body: items[idx]?.body || "" };
                        return { ...(p || {}), editorial: { ...(p?.editorial || {}), journey: { ...(p?.editorial?.journey || {}), items } } };
                      })
                    }
                    placeholder="01"
                  />

                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.journey?.items?.[idx]?.title || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => {
                        const items = Array.isArray(p?.editorial?.journey?.items) ? [...p.editorial.journey.items] : [];
                        items[idx] = { ...(items[idx] || {}), index: items[idx]?.index || "", title: e.target.value, body: items[idx]?.body || "" };
                        return { ...(p || {}), editorial: { ...(p?.editorial || {}), journey: { ...(p?.editorial?.journey || {}), items } } };
                      })
                    }
                    placeholder="Title"
                  />

                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.journey?.items?.[idx]?.body || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => {
                        const items = Array.isArray(p?.editorial?.journey?.items) ? [...p.editorial.journey.items] : [];
                        items[idx] = { ...(items[idx] || {}), index: items[idx]?.index || "", title: items[idx]?.title || "", body: e.target.value };
                        return { ...(p || {}), editorial: { ...(p?.editorial || {}), journey: { ...(p?.editorial?.journey || {}), items } } };
                      })
                    }
                    placeholder="Body"
                  />
                </div>
              ))}

              <div className="bf-grid-2">
                <div className="bf-form-stack">
                  <div className="bf-field-label">Location title</div>
                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.contactBlock?.locationTitle || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => ({
                        ...(p || {}),
                        editorial: {
                          ...(p?.editorial || {}),
                          contactBlock: { ...(p?.editorial?.contactBlock || {}), locationTitle: e.target.value },
                        },
                      }))
                    }
                  />
                </div>

                <div className="bf-form-stack">
                  <div className="bf-field-label">Contact title</div>
                  <input
                    className="bf-input"
                    value={homeLanding.editorial?.contactBlock?.contactTitle || ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => ({
                        ...(p || {}),
                        editorial: {
                          ...(p?.editorial || {}),
                          contactBlock: { ...(p?.editorial?.contactBlock || {}), contactTitle: e.target.value },
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="bf-grid-2">
                <div className="bf-form-stack">
                  <div className="bf-field-label">Address lines (one per line)</div>
                  <textarea
                    className="bf-input"
                    rows={4}
                    value={Array.isArray(homeLanding.editorial?.contactBlock?.addressLines)
                      ? homeLanding.editorial.contactBlock.addressLines.join("\n")
                      : ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => ({
                        ...(p || {}),
                        editorial: {
                          ...(p?.editorial || {}),
                          contactBlock: {
                            ...(p?.editorial?.contactBlock || {}),
                            addressLines: e.target.value.split("\n").map((x: string) => x.trim()).filter(Boolean),
                          },
                        },
                      }))
                    }
                  />
                </div>

                <div className="bf-form-stack">
                  <div className="bf-field-label">Phones (one per line)</div>
                  <textarea
                    className="bf-input"
                    rows={4}
                    value={Array.isArray(homeLanding.editorial?.contactBlock?.phones)
                      ? homeLanding.editorial.contactBlock.phones.join("\n")
                      : ""}
                    onChange={(e) =>
                      setHomeLanding((p: any) => ({
                        ...(p || {}),
                        editorial: {
                          ...(p?.editorial || {}),
                          contactBlock: {
                            ...(p?.editorial?.contactBlock || {}),
                            phones: e.target.value.split("\n").map((x: string) => x.trim()).filter(Boolean),
                          },
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="bf-form-stack">
                <div className="bf-field-label">Map image URL</div>
                <input
                  className="bf-input"
                  value={homeLanding.editorial?.contactBlock?.mapImageUrl || ""}
                  onChange={(e) =>
                    setHomeLanding((p: any) => ({
                      ...(p || {}),
                      editorial: {
                        ...(p?.editorial || {}),
                        contactBlock: { ...(p?.editorial?.contactBlock || {}), mapImageUrl: e.target.value },
                      },
                    }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: "#64748b" }}>
                If blank, the booking UI can fall back to your Home banner (Images tab).
              </div>
            </div>
          </div>

          <div className="bf-form-stack">
            <div className="bf-field-label">Short description</div>
            <textarea
              className="bf-input"
              rows={3}
              value={homeLanding.description || ""}
              onChange={(e) => setHomeLanding((p: any) => ({ ...p, description: e.target.value }))}
              placeholder="A short, friendly description shown on the Home tab."
            />
          </div>

          
          <div className="bf-form-stack">
            <div className="bf-field-label">
              Subtitle line (optional){" "}
              <span style={{ fontSize: 11, color: "#64748b" }}>
                ({(homeLanding.shortDescription || "").length}/240)
              </span>
            </div>
            <textarea
              className="bf-input"
              rows={2}
              value={homeLanding.shortDescription || ""}
              onChange={(e) =>
                setHomeLanding((p: any) => ({
                  ...p,
                  shortDescription: e.target.value,
                }))
              }
              placeholder="One short line shown under the title."
            />
          </div>

          <div className="bf-form-stack">
            <div className="bf-field-label">About highlights (optional)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[0, 1, 2].map((idx: number) => (
                <input
                  key={idx}
                  className="bf-input"
                  value={(homeLanding.highlights?.[idx] || "") as any}
                  onChange={(e) =>
                    setHomeLanding((p: any) => {
                      const arr = Array.isArray(p.highlights) ? [...p.highlights] : [];
                      arr[idx] = e.target.value;
                      return { ...p, highlights: arr };
                    })
                  }
                  placeholder={`Highlight ${idx + 1}`}
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
              Up to 3 short chips (e.g. “Beginner friendly”, “Parking available”).
            </div>
          </div>

          <div className="bf-grid-3">
            <label className="bf-check">
              <input
                type="checkbox"
                checked={homeLanding.visibility?.showServicesPreview !== false}
                onChange={(e) =>
                  setHomeLanding((p: any) => ({
                    ...p,
                    visibility: {
                      ...(p.visibility || {}),
                      showServicesPreview: e.target.checked,
                    },
                  }))
                }
              />
              <span>Show services preview</span>
            </label>

            <label className="bf-check">
              <input
                type="checkbox"
                checked={homeLanding.visibility?.showMembershipsPreview !== false}
                onChange={(e) =>
                  setHomeLanding((p: any) => ({
                    ...p,
                    visibility: {
                      ...(p.visibility || {}),
                      showMembershipsPreview: e.target.checked,
                    },
                  }))
                }
              />
              <span>Show memberships preview</span>
            </label>

            <label className="bf-check">
              <input
                type="checkbox"
                checked={homeLanding.visibility?.showAbout !== false}
                onChange={(e) =>
                  setHomeLanding((p: any) => ({
                    ...p,
                    visibility: {
                      ...(p.visibility || {}),
                      showAbout: e.target.checked,
                    },
                  }))
                }
              />
              <span>Show About section</span>
            </label>
          </div>

<div className="bf-grid-2">
            <div className="bf-form-stack">
              <div className="bf-field-label">Offers title (optional)</div>
              <input
                className="bf-input"
                value={homeLanding.offersTitle || ""}
                onChange={(e) => setHomeLanding((p: any) => ({ ...p, offersTitle: e.target.value }))}
                placeholder="e.g. This week"
              />
            </div>

            <div className="bf-form-stack">
              <div className="bf-field-label">Note (optional)</div>
              <input
                className="bf-input"
                value={homeLanding.note || ""}
                onChange={(e) => setHomeLanding((p: any) => ({ ...p, note: e.target.value }))}
                placeholder="e.g. Walk-ins welcome if available."
              />
            </div>
          </div>

          <div className="bf-form-stack">
            <div className="bf-field-label">Offers (one per line)</div>
            <textarea
              className="bf-input"
              rows={4}
              value={(homeLanding.offers || []).join("\n")}
              onChange={(e) =>
                setHomeLanding((p: any) => ({
                  ...p,
                  offers: e.target.value
                    .split("\n")
                    .map((x: string) => x.trim())
                    .filter(Boolean),
                }))
              }
              placeholder={"Happy Hour: 20% off\nFree coffee with morning bookings"}
            />
          </div>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginBottom: 10 }}>
              Contact block (optional)
            </div>

            <div className="bf-grid-2">
              <div className="bf-form-stack">
                <div className="bf-field-label">Phone</div>
                <input
                  className="bf-input"
                  value={homeLanding.contact?.phone || ""}
                  onChange={(e) =>
                    setHomeLanding((p: any) => ({
                      ...p,
                      contact: { ...(p.contact || {}), phone: e.target.value },
                    }))
                  }
                  placeholder="+962..."
                />
              </div>

              <div className="bf-form-stack">
                <div className="bf-field-label">WhatsApp</div>
                <input
                  className="bf-input"
                  value={homeLanding.contact?.whatsapp || ""}
                  onChange={(e) =>
                    setHomeLanding((p: any) => ({
                      ...p,
                      contact: { ...(p.contact || {}), whatsapp: e.target.value },
                    }))
                  }
                  placeholder="+962..."
                />
              </div>
            </div>

            <div className="bf-grid-2" style={{ marginTop: 10 }}>
              <div className="bf-form-stack">
                <div className="bf-field-label">Address</div>
                <input
                  className="bf-input"
                  value={homeLanding.contact?.address || ""}
                  onChange={(e) =>
                    setHomeLanding((p: any) => ({
                      ...p,
                      contact: { ...(p.contact || {}), address: e.target.value },
                    }))
                  }
                  placeholder="Amman, Jordan"
                />
              </div>

              <div className="bf-form-stack">
                <div className="bf-field-label">Map URL</div>
                <input
                  className="bf-input"
                  value={homeLanding.contact?.mapUrl || ""}
                  onChange={(e) =>
                    setHomeLanding((p: any) => ({
                      ...p,
                      contact: { ...(p.contact || {}), mapUrl: e.target.value },
                    }))
                  }
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", marginBottom: 10 }}>
              CTA labels (optional)
            </div>

            <div className="bf-grid-2">
              <div className="bf-form-stack">
                <div className="bf-field-label">Primary CTA</div>
                <input
                  className="bf-input"
                  value={homeLanding.ctas?.primary?.label || ""}
                  onChange={(e) =>
                    setHomeLanding((p: any) => ({
                      ...p,
                      ctas: {
                        ...(p.ctas || {}),
                        primary: { ...((p.ctas || {}).primary || {}), label: e.target.value },
                      },
                    }))
                  }
                  placeholder="e.g. Book a bay"
                />
              </div>

              <div className="bf-form-stack">
                <div className="bf-field-label">Secondary CTA</div>
                <input
                  className="bf-input"
                  value={homeLanding.ctas?.secondary?.label || ""}
                  onChange={(e) =>
                    setHomeLanding((p: any) => ({
                      ...p,
                      ctas: {
                        ...(p.ctas || {}),
                        secondary: { ...((p.ctas || {}).secondary || {}), label: e.target.value },
                      },
                    }))
                  }
                  placeholder="e.g. My bookings"
                />
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#64748b" }}>
            Tip: The Home tab is the tenant landing page. Keep it short and action-focused.
          </div>
        </div>
      </>
    )}
  </div>
    </>
  );
}
