"use client";

import React from "react";
import { assertTenantApiBase, setTenantThemeKey } from "@/lib/api/tenantThemeKey";
import { adminColors, adminRadii, adminSpace } from "@/components/admin/AdminStyles";
import AppearanceBrandPanel from "@/components/owner/setup/appearance/AppearanceBrandPanel";
import OperationsSection from "./setup/sections/OperationsSection";
import MembershipsSection from "./setup/sections/MembershipsSection";
import ImagesSection from "./setup/sections/ImagesSection";
import GeneralSection from "./setup/sections/GeneralSection";
import PlansSection from "./setup/sections/PlansSection";
import ImagePreviewModal from "./setup/modals/ImagePreviewModal";
import LinkServicesModal from "./setup/modals/LinkServicesModal";
import { toast } from "@/lib/toast";
import { buildPublicBookingUrl } from "@/lib/urls/publicBooking";

type Tenant = {id: number;
  slug: string;
  name: string;
  kind: string;
  timezone?: string;

  // Theme selection (drives booking layout)
  theme_key?: string | null;
  layout_key?: string | null;
  currency_code?: string | null;

  // Branding / images
  logo_url?: string | null;
  cover_image_url?: string | null;

  // Booking page banners (hero images per tab)
  banner_book_url?: string | null;
  banner_reservations_url?: string | null;
  banner_account_url?: string | null;
  banner_home_url?: string | null;
  banner_memberships_url?: string | null;

  // (optional) storage keys (not required for UI rendering)
  banner_book_key?: string | null;
  banner_reservations_key?: string | null;
  banner_account_key?: string | null;
  banner_home_key?: string | null;
  banner_memberships_key?: string | null;

  working_hours?: any;
};


type Service = {
  id: number;
  name: string;
  duration_minutes: number | null;
  slot_interval_minutes?: number | null;
  max_consecutive_slots?: number | null;
  max_parallel_bookings?: number | null;
  price_jd?: number | null;
  requires_staff?: boolean;
  requires_resource?: boolean;
  requires_confirmation?: boolean;
  availability_basis?: "auto" | "resource" | "staff" | "both" | "none" | null;
  allow_membership?: boolean;
  image_url?: string | null;
};

type Staff = {
  id: number;
  name: string;
  role?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
};

type Resource = {
  id: number;
  name: string;
  type?: string | null;
  image_url?: string | null;
};

type TenantBlackout = {
  id: number;
  tenant_id: number;
  starts_at: string; // timestamptz
  ends_at: string; // timestamptz
  reason?: string | null;
  is_active: boolean;
  resource_id?: number | null;
  staff_id?: number | null;
  service_id?: number | null;
};

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type DayConfig = { open: string; close: string; closed: boolean };
type WorkingHours = Record<DayKey, DayConfig>;

type IsPendingFn = (key: string) => boolean;


// Phase 3 (A): link staff/resources to specific services (optional).
type LinkModalState = {
  kind: "staff" | "resource";
  id: number;
  name: string;
  selected: number[]; // service IDs
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://booking-backend-6jbc.onrender.com";

const DAY_LABELS: { key: DayKey; label: string }[] = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];
// ------------------------------
// Branding (Phase 2)
// Stored as JSONB: tenants.branding
// ------------------------------

type BrandColors = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
};

type BrandButtons = {
  radius: number;
  style: "solid" | "outline";
};

type BrandTypography = {
  fontFamily: "system" | "inter" | "serif";
  headingWeight: number;
  bodyWeight: number;
};

type BrandAssets = {
  // NOTE: we keep the naming camelCase in JSONB; backend can store as-is.
  logoUrl?: string | null;
  faviconUrl?: string | null;
  heroUrl?: string | null;
  banners?: Partial<Record<"book" | "reservations" | "account" | "home", string | null>>;
};

type BrandTerminology = {
  staffLabelSingular?: string;
  resourceLabelSingular?: string;
};

type BrandBookingUi = {
  density: "comfortable" | "compact";
  showServiceMeta: boolean;
  useLogoAsFavicon: boolean;
  heroMode: "tab-banners" | "single-hero";
};

type BrandSettings = {
  colors: BrandColors;
  buttons: BrandButtons;
  typography: BrandTypography;
  assets: BrandAssets;
  bookingUi: BrandBookingUi;
  terminology?: BrandTerminology;
};

const BRAND_PRESETS: Record<string, BrandSettings> = {
  default: {
    colors: {
      primary: "#0ea5e9",
      accent: "#22c55e",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      mutedText: "#64748b",
      border: "#e2e8f0",
    },
    buttons: { radius: 14, style: "solid" },
    typography: { fontFamily: "system", headingWeight: 700, bodyWeight: 400 },
    assets: { logoUrl: "", faviconUrl: "", heroUrl: "", banners: {} },
    bookingUi: {
      density: "comfortable",
      showServiceMeta: true,
      useLogoAsFavicon: true,
      heroMode: "tab-banners",
    },
    terminology: { staffLabelSingular: "Staff", resourceLabelSingular: "Resource" },
  },
  dark: {
    colors: {
      primary: "#22c55e",
      accent: "#0ea5e9",
      background: "#0b1220",
      surface: "#0f172a",
      text: "#f8fafc",
      mutedText: "#94a3b8",
      border: "#1f2937",
    },
    buttons: { radius: 14, style: "solid" },
    typography: { fontFamily: "system", headingWeight: 700, bodyWeight: 400 },
    assets: { logoUrl: "", faviconUrl: "", heroUrl: "", banners: {} },
    bookingUi: {
      density: "comfortable",
      showServiceMeta: true,
      useLogoAsFavicon: true,
      heroMode: "tab-banners",
    },
    terminology: { staffLabelSingular: "Staff", resourceLabelSingular: "Resource" },
  },
  birdie: {
    colors: {
      primary: "#16a34a",
      accent: "#f59e0b",
      background: "#0b1220",
      surface: "#0f172a",
      text: "#f8fafc",
      mutedText: "#94a3b8",
      border: "#1f2937",
    },
    buttons: { radius: 16, style: "solid" },
    typography: { fontFamily: "system", headingWeight: 800, bodyWeight: 500 },
    assets: { logoUrl: "", faviconUrl: "", heroUrl: "", banners: {} },
    bookingUi: {
      density: "comfortable",
      showServiceMeta: true,
      useLogoAsFavicon: true,
      heroMode: "tab-banners",
    },
    terminology: { staffLabelSingular: "Staff", resourceLabelSingular: "Resource" },
  },
};

const BRAND_DEFAULTS: BrandSettings = BRAND_PRESETS.default;

// ---------------------------------------------------------------------------
// Membership Checkout Policy (tenant settings)
// Stored in tenants.branding.membershipCheckout (JSONB)
// ---------------------------------------------------------------------------
type MembershipCheckoutPolicy = {
  mode: "smart_top_up" | "renew_upgrade" | "strict" | "off" | string;
  topUp: {
    enabled: boolean;
    allowSelfServe: boolean;
    // price per minute (so any interval works). 0 means "offline / not priced".
    pricePerMinute: number;
    currency: string | null;
    // rounding rules (minutes)
    roundToMinutes: number;
    minPurchaseMinutes: number;
  };
  renewUpgrade: { enabled: boolean };
  strict: { enabled: boolean };
};

type MembershipPlanRecord = {
  id: number;
  tenant_id?: number;
  name: string;
  description?: string | null;
  billing_type?: string | null;
  price: number | null;
  currency: string | null;
  included_minutes: number | null;
  included_uses: number | null;
  validity_days: number | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type PrepaidCatalogProduct = {
  id: string;
  name: string;
  type: "service_package" | "credit_bundle" | "time_pass";
  description?: string;
  isActive: boolean;
  price: number;
  currency: string | null;
  validityDays: number;
  creditAmount: number | null;
  sessionCount: number | null;
  minutesTotal: number | null;
  eligibleServiceIds: number[];
  allowMembershipBundle: boolean;
  stackable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type PrepaidCatalog = {
  products: PrepaidCatalogProduct[];
};

type PrepaidCustomerOption = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};

type PrepaidEntitlementRecord = {
  id: number;
  customerId: number;
  prepaidProductId: number;
  status: string;
  source: string;
  originalQuantity: number;
  remainingQuantity: number;
  startsAt?: string;
  expiresAt?: string;
  notes?: string;
  metadata?: any;
  customerName?: string;
  customerEmail?: string;
  prepaidProductName?: string;
  productType?: string;
  createdAt?: string;
  updatedAt?: string;
};

const MEMBERSHIP_CHECKOUT_DEFAULTS: MembershipCheckoutPolicy = {
  mode: "smart_top_up",
  topUp: {
    enabled: true,
    allowSelfServe: true,
    pricePerMinute: 0,
    currency: null,
    roundToMinutes: 30,
    minPurchaseMinutes: 30,
  },
  renewUpgrade: { enabled: true },
  strict: { enabled: false },
};

// ---------------------------------------------------------------------------
// Home Landing Content (booking Home tab)
// Stored in tenants.branding.homeLanding (JSONB)
// ---------------------------------------------------------------------------
type TenantHomeLanding = {
  heroImageUrl?: string;
  headline?: string;
  description?: string;
  offersTitle?: string;
  offers?: string[];
  note?: string;
  contact?: {
    phone?: string;
    whatsapp?: string;
    address?: string;
    mapUrl?: string;
  };
  ctas?: {
    primary?: { label?: string };
    secondary?: { label?: string };
  };
};

const HOME_LANDING_DEFAULTS: TenantHomeLanding = {
  heroImageUrl: "",
  headline: "",
  description: "",
  offersTitle: "",
  offers: [],
  note: "",
  contact: { phone: "", whatsapp: "", address: "", mapUrl: "" },
  ctas: { primary: { label: "" }, secondary: { label: "" } },
};


function mergeMembershipCheckoutPolicy(incoming: any, currencyFallback: string | null): MembershipCheckoutPolicy {
  const base = { ...MEMBERSHIP_CHECKOUT_DEFAULTS };
  const obj = incoming && typeof incoming === "object" ? incoming : {};
  const merged: any = { ...base, ...obj };
  merged.topUp = { ...base.topUp, ...(merged.topUp || {}) };
  merged.renewUpgrade = { ...base.renewUpgrade, ...(merged.renewUpgrade || {}) };
  merged.strict = { ...base.strict, ...(merged.strict || {}) };
  if (!merged.topUp.currency) merged.topUp.currency = currencyFallback ?? null;
  return merged as MembershipCheckoutPolicy;
}

function clampInt(n: any, fallback: number, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function clampNum(n: any, fallback: number, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}


type OwnerSetupTabProps = {
  /**
   * "full" = render the internal setup pill switcher (legacy / embedded mode)
   * "single" = render only one section (used by /owner/[slug]/setup/[section])
   */
  mode?: "full" | "single";

  /** When mode="single", force which section to render */
  singlePill?: string;

  /** API base for JSON proxy calls (owner: /api/owner/proxy, tenant: /api/proxy) */
  apiBase: string;
  /** API base for upload proxy calls (owner: /api/owner/proxy-upload, tenant: /api/proxy-upload) */
  uploadBase: string;
  /** True when running inside platform owner context (enables admin-only calls). */
  isPlatformOwner?: boolean;

  tenantName: string;
  tenant: Tenant | null;
  onTenantUpdated?: (tenant: Tenant) => void;


  // Theme Studio draft (CSS var overrides) so Appearance & Brand can edit advanced booking UI tokens
  themeStudioDraft?: Record<string, string>;
  setThemeStudioDraft?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSaveBrandOverrides?: () => void;

  /** Optional deep-link: which setup pill to open initially */
  // Back-compat: "brand" and "theme" map to the unified "appearance" section.
  initialPill?:
    | "hours"
    | "blackouts"
    | "services"
    | "memberships"
    | "staff"
    | "resources"
    | "images"
    | "appearance"
    | "plans"
    | "brand"
    | "theme";

  setupMessage: string | null;
  logoError: string | null;

  logoUploading: boolean;
  handleLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  workingHours: WorkingHours;
  handleWorkingHoursChange: (
    day: DayKey,
    field: keyof DayConfig,
    value: string | boolean
  ) => void;

  savingWorkingHours: boolean;
  handleSaveWorkingHours: () => void;

  // Services
  services: Service[];
  svcName: string;
  setSvcName: (v: string) => void;
  svcDuration: string;
  setSvcDuration: (v: string) => void;
  svcPrice: string;
  setSvcPrice: (v: string) => void;
  svcReqStaff: boolean;
  setSvcReqStaff: (v: boolean) => void;
  svcReqRes: boolean;
  setSvcReqRes: (v: boolean) => void;
  svcRequiresConfirmation: boolean;
  setSvcRequiresConfirmation: (v: boolean) => void;
  svcInterval: string;
  setSvcInterval: (v: string) => void;
  svcMinSlots: string;
  setSvcMinSlots: (v: string) => void;
  svcMaxSlots: string;
  setSvcMaxSlots: (v: string) => void;
  svcParallel: string;
  setSvcParallel: (v: string) => void;
  handleCreateService: (e: React.FormEvent) => void;
  handleDeleteService: (id: number) => void;
  handleUpdateServiceAvailabilityBasis: (
    id: number,
    availability_basis: "auto" | "resource" | "staff" | "both" | "none" | null
  ) => void;

  /** Generic patch for service fields (e.g. scheduling controls) */
  handlePatchService: (id: number, patch: Record<string, any>) => void;

  // Staff
  staff: Staff[];
  staffName: string;
  setStaffName: (v: string) => void;
  staffRole: string;
  setStaffRole: (v: string) => void;
  handleCreateStaff: (e: React.FormEvent) => void;
  handleDeleteStaff: (id: number) => void;
  /** Generic patch for staff fields (used for optimistic toggle/update flows) */
  handlePatchStaff?: (id: number, patch: Partial<Staff> | Record<string, any>) => void;

  // Step 7: staff ↔ services links
  staffServiceMap?: Record<number, number[]>;
  staffLinksMapError?: string | null;
  handleSaveStaffServices?: (staffId: number, serviceIds: number[]) => void;

  // Step 8: resource ↔ services links
  resourceServiceMap?: Record<number, number[]>;
  resourceLinksMapError?: string | null;
  handleSaveResourceServices?: (resourceId: number, serviceIds: number[]) => void;

  // Resources
  resources: Resource[];
  resName: string;
  setResName: (v: string) => void;
  resType: string;
  setResType: (v: string) => void;
  handleCreateResource: (e: React.FormEvent) => void;
  handleDeleteResource: (id: number) => void;
  /** Generic patch for resource fields (name/type/is_active) */
  handlePatchResource?: (id: number, patch: Partial<Resource> | Record<string, any>) => void;

  // Shared image upload for entities
  handleEntityImageChange: (
    kind: "service" | "staff" | "resource",
    id: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;

  handleEntityImageDelete: (kind: "service" | "staff" | "resource", id: number) => void;

  /** Step 12: per-action pending helper from setup catalog (optional). */
  isPending?: IsPendingFn;

  /** Step 13: unified refresh hook (optional). */
  handleRefetchAll?: () => void;
};

export default function OwnerSetupTab(props: OwnerSetupTabProps) {
  const apiBase: string = props.apiBase;
  assertTenantApiBase(apiBase);
  const uploadBase: string = props.uploadBase;
  const isPlatformOwner: boolean = props.isPlatformOwner ?? true;
  const {
    mode = "full",
    singlePill,
    tenantName,
    tenant,
    themeStudioDraft,
    setThemeStudioDraft,
    onSaveBrandOverrides,
    setupMessage,
    logoError,
    logoUploading,
    handleLogoFileChange,
    workingHours,
    handleWorkingHoursChange,
    savingWorkingHours,
    handleSaveWorkingHours,

    services,
    svcName,
    setSvcName,
    svcDuration,
    setSvcDuration,
    svcPrice,
    setSvcPrice,
    svcReqStaff,
    setSvcReqStaff,
    svcReqRes,
    setSvcReqRes,
    svcRequiresConfirmation,
    setSvcRequiresConfirmation,
    svcInterval,
    setSvcInterval,
    svcMinSlots,
    setSvcMinSlots,
    svcMaxSlots,
    setSvcMaxSlots,
    svcParallel,
    setSvcParallel,
    handleCreateService,
    handleDeleteService,
    handleUpdateServiceAvailabilityBasis,
    handlePatchService,

    staff,
    staffName,
    setStaffName,
    staffRole,
    setStaffRole,
    handleCreateStaff,
    handleDeleteStaff,
    handlePatchStaff,

    resources,
    resName,
    setResName,
    resType,
    setResType,
    handleCreateResource,
    handleDeleteResource,
    handlePatchResource,

    handleEntityImageChange,
    handleEntityImageDelete,
    isPending: isPendingProp,
	    handleRefetchAll,
    onTenantUpdated,
  } = props;

  const isPending: IsPendingFn = React.useCallback(
    (key: string) => {
      try {
        return typeof isPendingProp === "function" ? Boolean(isPendingProp(key)) : false;
      } catch {
        return false;
      }
    },
    [isPendingProp]
  );

  // Tenant assets may be stored as:
  // - Absolute URLs (e.g. https://pub-xxxx.r2.dev/tenants/3/logo/logo.png)
  // - Relative backend paths (e.g. /uploads/xyz.png)
  // This resolver prevents broken URLs like: `${BACKEND_URL}https://...`
  const resolveAssetUrl = (url?: string | null) => {
    if (!url) return "";
    const u = String(url);
    if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;
    const withSlash = u.startsWith("/") ? u : `/${u}`;
    return `${BACKEND_URL}${withSlash}`;
  };

  const [localTenant, setLocalTenant] = React.useState<Tenant | null>(tenant);
  const tenantSlug: string = String(localTenant?.slug ?? tenant?.slug ?? "").trim();


  React.useEffect(() => {
    setLocalTenant(tenant);
  }, [tenant]);

  // Phase 3: link maps (optional). If a staff/resource has no links, booking treats it as available for ALL services.
  const [linksMapLoading, setLinksMapLoading] = React.useState(false);
  const [linksMapError, setLinksMapError] = React.useState<string | null>(null);
  const [staffServiceMapLocal, setStaffServiceMapLocal] = React.useState<Record<number, number[]>>({});
  const [resourceServiceMapLocal, setResourceServiceMapLocal] = React.useState<Record<number, number[]>>({});

  // Step 7: prefer hook-owned staffServiceMap when provided (single source of truth)
  const staffServiceMap = props.staffServiceMap ?? staffServiceMapLocal;

  // Step 8: prefer hook-owned resourceServiceMap when provided (single source of truth)
  const resourceServiceMap = props.resourceServiceMap ?? resourceServiceMapLocal;

  const [linkModal, setLinkModal] = React.useState<LinkModalState | null>(null);
  const [linkSaving, setLinkSaving] = React.useState(false);
  const [linkError, setLinkError] = React.useState<string | null>(null);


  const loadTenantLinks = React.useCallback(async () => {
    if (!localTenant?.slug) return;
    setLinksMapLoading(true);
    setLinksMapError(null);
    try {
      const res = await fetch(`${apiBase}/links/tenant?tenantSlug=${encodeURIComponent(localTenant.slug)}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || `Failed to load links (HTTP ${res.status})`);

      const staffRows: Array<{ staff_id: number; service_id: number }> = Array.isArray((json as any)?.staff_services)
        ? (json as any).staff_services
        : [];
      const resourceRows: Array<{ resource_id: number; service_id: number }> = Array.isArray((json as any)?.resource_services)
        ? (json as any).resource_services
        : [];

      const sm: Record<number, number[]> = {};
      for (const r of staffRows) {
        const sid = Number((r as any).staff_id);
        const svc = Number((r as any).service_id);
        if (!Number.isFinite(sid) || !Number.isFinite(svc)) continue;
        sm[sid] = sm[sid] || [];
        sm[sid].push(svc);
      }

      const rm: Record<number, number[]> = {};
      for (const r of resourceRows) {
        const rid = Number((r as any).resource_id);
        const svc = Number((r as any).service_id);
        if (!Number.isFinite(rid) || !Number.isFinite(svc)) continue;
        rm[rid] = rm[rid] || [];
        rm[rid].push(svc);
      }

      if (props.staffServiceMap == null) {
        setStaffServiceMapLocal(sm);
      }
      if (props.resourceServiceMap == null) {
        setResourceServiceMapLocal(rm);
      }
    } catch (e: any) {
      setLinksMapError(e?.message || "Failed to load links");
    } finally {
      setLinksMapLoading(false);
    }
  }, [localTenant?.slug]);

  React.useEffect(() => {
    if (!localTenant?.slug) return;
    loadTenantLinks();
  }, [localTenant?.slug, loadTenantLinks]);

  const openLinkModal = React.useCallback(
    (kind: "staff" | "resource", id: number, name: string) => {
      const selected =
        kind === "staff" ? (staffServiceMap[id] || []) : (resourceServiceMap[id] || []);
      setLinkError(null);
      setLinkModal({ kind, id, name, selected: [...selected] });
    },
    [staffServiceMap, resourceServiceMap]
  );

  const closeLinkModal = React.useCallback(() => {
    setLinkModal(null);
    setLinkError(null);
  }, []);

  const toggleLinkSelection = React.useCallback((serviceId: number) => {
    setLinkModal((prev) => {
      if (!prev) return prev;
      const has = prev.selected.includes(serviceId);
      const next = has ? prev.selected.filter((x) => x !== serviceId) : [...prev.selected, serviceId];
      return { ...prev, selected: next };
    });
  }, []);

  const saveLinkModal = React.useCallback(async () => {
    if (!linkModal) return;

    // Step 12: prevent double-submits while the hook mutation is pending.
    const pendingKey =
      linkModal.kind === "staff" ? `staff:link:${linkModal.id}` : `resource:link:${linkModal.id}`;
    if (isPending(pendingKey)) return;

    setLinkSaving(true);
    setLinkError(null);
    try {
      // Step 7: staff links are hook-owned when handleSaveStaffServices is provided.
      if (linkModal.kind === "staff" && typeof props.handleSaveStaffServices === "function") {
        const ids = (linkModal.selected || [])
          .map((x) => Number(x))
          .filter((x) => Number.isFinite(x));
        await props.handleSaveStaffServices(linkModal.id, ids);
        setLinkModal(null);
        return;
      }

      // Step 8: resource links are hook-owned when handleSaveResourceServices is provided.
      if (linkModal.kind === "resource" && typeof props.handleSaveResourceServices === "function") {
        const ids = (linkModal.selected || [])
          .map((x) => Number(x))
          .filter((x) => Number.isFinite(x));
        await props.handleSaveResourceServices(linkModal.id, ids);
        setLinkModal(null);
        return;
      }

      const endpoint =
        linkModal.kind === "staff"
          ? `${apiBase}/links/staff/${linkModal.id}/services`
          : `${apiBase}/links/resource/${linkModal.id}/services`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_ids: (linkModal.selected || [])
            .map((x) => Number(x))
            .filter((x) => Number.isFinite(x)),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || `Failed to save links (HTTP ${res.status})`);

      if (linkModal.kind === "staff") {
        // Fallback mode: only update local map when hook map isn't provided.
        if (props.staffServiceMap == null) {
          setStaffServiceMapLocal((prev) => ({ ...prev, [linkModal.id]: [...(linkModal.selected || [])] }));
        }
      } else {
        if (props.resourceServiceMap == null) {
          setResourceServiceMapLocal((prev) => ({ ...prev, [linkModal.id]: [...(linkModal.selected || [])] }));
        }
      }

      setLinkModal(null);
    } catch (e: any) {
      setLinkError(e?.message || "Failed to save links");
      toast.error(e?.message || "Couldn’t save links — reverted.");
    } finally {
      setLinkSaving(false);
    }
  }, [linkModal, apiBase, isPending, props.handleSaveStaffServices, props.staffServiceMap, props.handleSaveResourceServices, props.resourceServiceMap]);


  const logoSrc = localTenant?.logo_url ? resolveAssetUrl(localTenant.logo_url) : "";

  // Phase 2: collapsible "Add" forms (keeps Phase 1 labels + layout)
  const [showServiceForm, setShowServiceForm] = React.useState(false);
  const [showStaffForm, setShowStaffForm] = React.useState(false);
  const [showResourceForm, setShowResourceForm] = React.useState(false);

  const prevServicesLenRef = React.useRef<number>(services.length);
  const prevStaffLenRef = React.useRef<number>(staff.length);
  const prevResourcesLenRef = React.useRef<number>(resources.length);

  const resetServiceForm = () => {
    setSvcName("");
    setSvcDuration("");
    setSvcInterval("");
    setSvcMinSlots("");
    setSvcMaxSlots("");
    setSvcParallel("");
    setSvcPrice("");
    setSvcReqStaff(false);
    setSvcReqRes(false);
    setSvcRequiresConfirmation(false);
  };

  const resetStaffForm = () => {
    setStaffName("");
    setStaffRole("");
  };

  const resetResourceForm = () => {
    setResName("");
    // Keep resType (select) as-is.
  };

  React.useEffect(() => {
    if (showServiceForm && services.length > prevServicesLenRef.current) {
      setShowServiceForm(false);
      resetServiceForm();
    }
    prevServicesLenRef.current = services.length;
  }, [services.length, showServiceForm]);

  React.useEffect(() => {
    if (showStaffForm && staff.length > prevStaffLenRef.current) {
      setShowStaffForm(false);
      resetStaffForm();
    }
    prevStaffLenRef.current = staff.length;
  }, [staff.length, showStaffForm]);

  React.useEffect(() => {
    if (showResourceForm && resources.length > prevResourcesLenRef.current) {
      setShowResourceForm(false);
      resetResourceForm();
    }
    prevResourcesLenRef.current = resources.length;
  }, [resources.length, showResourceForm]);


  // Banner URLs have existed in a few schema shapes across environments:
  // - tenants.banner_*_url (current)
  // - tenants.banner_*_url1 (legacy)
  // - tenants.branding.assets.banners (fallback)
  // Protocol: rendering must be backward compatible and never hide a stored asset.
  const getTenantBannerUrl = (
    t: any,
    slot: "home" | "book" | "reservations" | "memberships" | "account"
  ): string => {
    if (!t) return "";

    // 1) Current columns
    const direct = t[`banner_${slot}_url`];
    if (direct) return String(direct);

    // 2) Legacy columns (some environments used *_url1)
    const legacy = t[`banner_${slot}_url1`];
    if (legacy) return String(legacy);

    // 3) Branding JSON fallback
    const b = t.branding || {};
    const assets = b.assets || {};
    const banners = assets.banners || {};

    // Common banner key styles
    const fromBanners =
      banners[slot] ||
      banners[`${slot}_url`] ||
      banners[`${slot}Url`] ||
      banners[`${slot}_image`] ||
      banners[`${slot}Image`];
    if (fromBanners) return String(fromBanners);

    // Some older payloads stored banner URLs at top-level branding
    const fromBranding =
      b[`banner_${slot}_url`] ||
      b[`banner_${slot}_url1`] ||
      b[`${slot}_banner_url`] ||
      b[`${slot}BannerUrl`];
    if (fromBranding) return String(fromBranding);

    return "";
  };

  const getTenantBannerFieldLabel = (
    t: any,
    slot: "home" | "book" | "reservations" | "memberships" | "account"
  ): string => {
    if (!t) {
      return slot === "home"
        ? "banner_home_url"
        : slot === "book"
          ? "banner_book_url"
          : slot === "reservations"
            ? "banner_reservations_url"
            : slot === "memberships"
              ? "banner_memberships_url"
              : "banner_account_url";
    }
    const hasCurrent = Boolean(t[`banner_${slot}_url`]);
    const hasLegacy = Boolean(t[`banner_${slot}_url1`]);
    if (hasCurrent) return `banner_${slot}_url`;
    if (hasLegacy) return `banner_${slot}_url1`;
    return `branding.assets.banners.${slot}`;
  };

  const uploadTenantBanner = async (
    slot: "home" | "book" | "reservations" | "memberships" | "account",
    file: File
  ) => {
    if (!localTenant?.id) return;

    const fd = new FormData();
    fd.append("file", file);

    // Uses the existing Next.js proxy route which forwards to the backend with admin auth
    const res = await fetch(
      `${uploadBase}/tenants/${localTenant.id}/banner/${slot}`,
      { method: "POST", body: fd }
    );

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as any)?.error || "Banner upload failed");

    const updatedTenant = (((json as any).tenant ?? json) as Tenant);
    setLocalTenant(updatedTenant);
    onTenantUpdated?.(updatedTenant);
  };

  const deleteTenantLogo = async () => {
    if (!localTenant?.id) return;
    if (!confirm("Remove the logo?")) return;

    const res = await fetch(`${apiBase}/tenants/${localTenant.id}/logo`, {
      method: "DELETE",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as any)?.error || "Logo remove failed");

    const updatedTenant = (((json as any).tenant ?? json) as Tenant);
    setLocalTenant(updatedTenant);
    onTenantUpdated?.(updatedTenant);
  };

  const deleteTenantBanner = async (
    slot: "home" | "book" | "reservations" | "memberships" | "account"
  ) => {
    if (!localTenant?.id) return;
    if (!confirm("Remove this banner image?")) return;

    const res = await fetch(`${apiBase}/tenants/${localTenant.id}/banner/${slot}`, {
      method: "DELETE",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as any)?.error || "Banner remove failed");

    const updatedTenant = (((json as any).tenant ?? json) as Tenant);
    setLocalTenant(updatedTenant);
    onTenantUpdated?.(updatedTenant);
  };

  type SetupPill =
    | "general"
    | "hours"
    | "services"
    | "memberships"
    | "images"
    | "appearance";

  const normalizePill = (p?: string | null): SetupPill => {
    const raw = String(p || "").toLowerCase();
    // Back-compat: old deep links
    if (raw === "brand" || raw === "theme") return "appearance";
    // Plans & Billing moved under General
    if (raw === "plans" || raw === "billing") return "general";
    // Cut-off dates are now part of Working hours
    if (raw === "blackouts" || raw === "cut-off" || raw === "cutoff") return "hours";
    // Staff & Resources are now nested under Services
    if (raw === "staff" || raw === "resources") return "services";
    // Cut-off dates are now part of Working hours
    if (raw === "blackouts" || raw === "cut-off" || raw === "cutoff") return "hours";
    const allowed = new Set([
      "general",
      "hours",
      "services",
      "memberships",
      "images",
      "appearance",
    ]);
    return (allowed.has(raw) ? (raw as SetupPill) : "general");
  };

  const isSingle = mode === "single";

  const SetupPillIcon = ({ name }: { name: "settings" | "wallet" | "clock" | "calendar" | "grid" | "users" | "box" | "image" | "sparkles" | "credit" }) => {
    const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" } as const;
    const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    switch (name) {
      case "settings":
        return (
          <svg {...common}>
            <path 
			  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
			  style={{
			    transform: "translate(0.0px, 1.8px)",
			    transformBox: "fill-box",
			    transformOrigin: "center",
			  }}
			  {...stroke} 
			/>
            <path d="M19.4 15a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2-1.6a.6.6 0 0 0 .1-.8l-1.9-3.3a.6.6 0 0 0-.7-.3l-2.4 1a7.6 7.6 0 0 0-1.7-1l-.4-2.6a.6.6 0 0 0-.6-.5H10a.6.6 0 0 0-.6.5l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.4-1a.6.6 0 0 0-.7.3L2.3 10a.6.6 0 0 0 .1.8l2 1.6a7.8 7.8 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.6a.6.6 0 0 0-.1.8l1.9 3.3c.15.26.47.36.75.25l2.4-1c.52.4 1.1.74 1.7 1l.4 2.6c.05.3.3.5.6.5h3.8c.3 0 .55-.2.6-.5l.4-2.6c.6-.26 1.18-.6 1.7-1l2.4 1c.28.11.6.01.75-.25l1.9-3.3a.6.6 0 0 0-.1-.8L19.4 15Z" {...stroke} />
          </svg>
        );
      case "wallet":
        return (
          <svg {...common}>
            <path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7Z" {...stroke} />
            <path d="M18 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1" {...stroke} />
            <path d="M21 12h-5a2 2 0 0 0 0 4h5" {...stroke} />
          </svg>
        );

      case "clock":
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="9" {...stroke} />
            <path d="M12 7v6l4 2" {...stroke} />
          </svg>
        );
      case "calendar":
        return (
          <svg {...common}>
            <path d="M8 3v3M16 3v3" {...stroke} />
            <rect x="4" y="6" width="16" height="15" rx="2" {...stroke} />
            <path d="M4 10h16" {...stroke} />
          </svg>
        );
      case "grid":
        return (
          <svg {...common}>
            <rect x="4" y="4" width="7" height="7" rx="1.5" {...stroke} />
            <rect x="13" y="4" width="7" height="7" rx="1.5" {...stroke} />
            <rect x="4" y="13" width="7" height="7" rx="1.5" {...stroke} />
            <rect x="13" y="13" width="7" height="7" rx="1.5" {...stroke} />
          </svg>
        );
      case "users":
        return (
          <svg {...common}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...stroke} />
            <circle cx="9" cy="7" r="4" {...stroke} />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" {...stroke} />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" {...stroke} />
          </svg>
        );
      case "box":
        return (
          <svg {...common}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z" {...stroke} />
            <path d="M3.3 7.3 12 12l8.7-4.7" {...stroke} />
            <path d="M12 22V12" {...stroke} />
          </svg>
        );
      case "image":
        return (
          <svg {...common}>
            <rect x="3" y="5" width="18" height="14" rx="2" {...stroke} />
            <path d="m3 15 4-4a3 3 0 0 1 4 0l6 6" {...stroke} />
            <path d="m14 13 1-1a3 3 0 0 1 4 0l2 2" {...stroke} />
            <circle cx="8.5" cy="9" r="1" {...stroke} />
          </svg>
        );
      case "sparkles":
        return (
          <svg {...common}>
            <path d="M12 2l1.2 4.1L17 7.3l-3.8 1.2L12 12l-1.2-3.5L7 7.3l3.8-1.2L12 2Z" {...stroke} />
            <path d="M19 12l.6 2 2 0.6-2 .6-.6 2-.6-2-2-.6 2-.6.6-2Z" {...stroke} />
            <path d="M5 12l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6.6-2Z" {...stroke} />
          </svg>
        );
      case "credit":
      default:
        return (
          <svg {...common}>
            <rect x="3" y="6" width="18" height="12" rx="2" {...stroke} />
            <path d="M3 10h18" {...stroke} />
            <path d="M7 14h4" {...stroke} />
          </svg>
        );
    }
  };
  const [activeSetupPill, setActiveSetupPill] = React.useState<SetupPill>(normalizePill(props.initialPill));
  const currentPill: SetupPill = isSingle ? normalizePill(singlePill ?? props.initialPill) : activeSetupPill;
  const [opsSection, setOpsSection] = React.useState<"services" | "staff" | "resources" | "rates">("services");
  const [showSetupInfo, setShowSetupInfo] = React.useState(false);
  React.useEffect(() => {
    if (currentPill !== "services") return;
    // Keep current selection; but if it was not set, default to services
    setOpsSection((prev) => (prev ? prev : "services"));
  }, [currentPill]);
  // Image preview modal (for quick, larger viewing)
  const [imagePreview, setImagePreview] = React.useState<{ src: string; alt: string } | null>(null);
  const [imagePreviewZoom, setImagePreviewZoom] = React.useState<number>(1);


  const [membershipCheckoutPolicy, setMembershipCheckoutPolicy] = React.useState<MembershipCheckoutPolicy>(
    MEMBERSHIP_CHECKOUT_DEFAULTS
  );
  const [membershipCheckoutCurrency, setMembershipCheckoutCurrency] = React.useState<string | null>(null);
  const [membershipCheckoutLoading, setMembershipCheckoutLoading] = React.useState<boolean>(false);
  const [membershipCheckoutSaving, setMembershipCheckoutSaving] = React.useState<boolean>(false);
  const [membershipCheckoutMessage, setMembershipCheckoutMessage] = React.useState<string | null>(null);
  const [membershipCheckoutError, setMembershipCheckoutError] = React.useState<string | null>(null);
  const membershipCheckoutLoadedForSlug = React.useRef<string | null>(null);

  const [membershipPlans, setMembershipPlans] = React.useState<MembershipPlanRecord[]>([]);
  const [membershipPlansLoading, setMembershipPlansLoading] = React.useState<boolean>(false);
  const [membershipPlansSaving, setMembershipPlansSaving] = React.useState<boolean>(false);
  const [membershipPlansMessage, setMembershipPlansMessage] = React.useState<string | null>(null);
  const [membershipPlansError, setMembershipPlansError] = React.useState<string | null>(null);
  const membershipPlansLoadedForSlug = React.useRef<string | null>(null);

  const [prepaidProducts, setPrepaidProducts] = React.useState<PrepaidCatalogProduct[]>([]);
  const [prepaidLoading, setPrepaidLoading] = React.useState<boolean>(false);
  const [prepaidSaving, setPrepaidSaving] = React.useState<boolean>(false);
  const [prepaidMessage, setPrepaidMessage] = React.useState<string | null>(null);
  const [prepaidError, setPrepaidError] = React.useState<string | null>(null);
  const prepaidLoadedForSlug = React.useRef<string | null>(null);

  const [prepaidLedgerLoading, setPrepaidLedgerLoading] = React.useState<boolean>(false);
  const [prepaidLedgerError, setPrepaidLedgerError] = React.useState<string | null>(null);
  const [prepaidLedgerSummary, setPrepaidLedgerSummary] = React.useState<any>({});
  const [prepaidTransactions, setPrepaidTransactions] = React.useState<any[]>([]);
  const [prepaidRedemptions, setPrepaidRedemptions] = React.useState<any[]>([]);
  const prepaidLedgerLoadedForSlug = React.useRef<string | null>(null);

  const [prepaidCustomers, setPrepaidCustomers] = React.useState<PrepaidCustomerOption[]>([]);
  const [prepaidCustomersLoading, setPrepaidCustomersLoading] = React.useState<boolean>(false);
  const [prepaidEntitlements, setPrepaidEntitlements] = React.useState<PrepaidEntitlementRecord[]>([]);
  const [prepaidEntitlementsLoading, setPrepaidEntitlementsLoading] = React.useState<boolean>(false);
  const [prepaidEntitlementsSaving, setPrepaidEntitlementsSaving] = React.useState<boolean>(false);
  const [prepaidEntitlementsError, setPrepaidEntitlementsError] = React.useState<string | null>(null);
  const [prepaidEntitlementsMessage, setPrepaidEntitlementsMessage] = React.useState<string | null>(null);
  const prepaidEntitlementsLoadedForSlug = React.useRef<string | null>(null);

// Home landing content (booking Home tab)
const [homeLanding, setHomeLanding] = React.useState<TenantHomeLanding>(HOME_LANDING_DEFAULTS);
const [homeLandingLoading, setHomeLandingLoading] = React.useState(false);
const [homeLandingSaving, setHomeLandingSaving] = React.useState(false);
const [homeLandingMessage, setHomeLandingMessage] = React.useState<string | null>(null);
const [homeLandingError, setHomeLandingError] = React.useState<string | null>(null);
const homeLandingLoadedForSlug = React.useRef<string | null>(null);

// Build the correct endpoint depending on whether we're in owner-admin context or tenant context.
// Owner admin uses /api/tenants/home-landing?tenantSlug=...
// Tenant context uses /api/tenant/:slug/home-landing
function coerceTenantSlug(input: any): string {
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    if (typeof (input as any).slug === "string") return (input as any).slug;
    if (typeof (input as any).tenantSlug === "string") return (input as any).tenantSlug;
  }
  return String(input || "");
}

function homeLandingUrl(apiBase: string, tenantSlug: any): string {
  const base = String(apiBase || "").trim();
  const isTenantContext = base.includes("/api/proxy") && !base.includes("/api/owner/");
  return isTenantContext
    ? `${base}/tenant/${encodeURIComponent(tenantSlug)}/home-landing`
    : `${base}/tenants/home-landing?tenantSlug=${encodeURIComponent(tenantSlug)}`;
}

// Membership checkout policy endpoint:
// - Tenant context uses tenant-scoped API (Google auth): /api/tenant/:slug/membership-checkout
// - Platform admin context uses admin API: /api/tenants/membership-checkout?tenantSlug=...
function membershipCheckoutUrl(apiBase: string, tenantSlug: any): string {
  const base = String(apiBase || "").trim();
  const isTenantContext = base.includes("/api/proxy") && !base.includes("/api/owner/");
  return isTenantContext
    ? `${base}/tenant/${encodeURIComponent(tenantSlug)}/membership-checkout`
    : `${base}/tenants/membership-checkout?tenantSlug=${encodeURIComponent(tenantSlug)}`;
}

function isTenantScopedApiBase(apiBase: string): boolean {
  const base = String(apiBase || "").trim();
  return base.includes("/api/proxy") && !base.includes("/api/owner/");
}

function prepaidCatalogUrl(apiBase: string, tenantSlug: any): string {
  const base = String(apiBase || "").trim();
  return isTenantScopedApiBase(base)
    ? `${base}/tenant/${encodeURIComponent(tenantSlug)}/prepaid-catalog`
    : `${base}/tenants/prepaid-catalog?tenantSlug=${encodeURIComponent(tenantSlug)}`;
}

function membershipPlansUrl(apiBase: string, tenantSlug: any): string {
  return `${String(apiBase || "").trim()}/membership-plans?tenantSlug=${encodeURIComponent(String(tenantSlug || ""))}`;
}

function membershipPlanItemUrl(apiBase: string, tenantSlug: any, planId: string | number): string {
  return `${String(apiBase || "").trim()}/membership-plans/${encodeURIComponent(String(planId))}?tenantSlug=${encodeURIComponent(String(tenantSlug || ""))}`;
}

function prepaidProductsUrl(apiBase: string, tenantSlug: any): string {
  return `${String(apiBase || "").trim()}/tenant/${encodeURIComponent(tenantSlug)}/prepaid-products`;
}

function prepaidProductUrl(apiBase: string, tenantSlug: any, productId: string | number): string {
  return `${prepaidProductsUrl(apiBase, tenantSlug)}/${encodeURIComponent(String(productId))}`;
}

function prepaidTransactionsUrl(apiBase: string, tenantSlug: any): string {
  return `${String(apiBase || "").trim()}/tenant/${encodeURIComponent(tenantSlug)}/prepaid-transactions`;
}

function prepaidRedemptionsUrl(apiBase: string, tenantSlug: any): string {
  return `${String(apiBase || "").trim()}/tenant/${encodeURIComponent(tenantSlug)}/prepaid-redemptions`;
}

function prepaidAccountingSummaryUrl(apiBase: string, tenantSlug: any): string {
  return `${String(apiBase || "").trim()}/tenant/${encodeURIComponent(tenantSlug)}/prepaid-accounting-summary`;
}

function prepaidEntitlementsUrl(apiBase: string, tenantSlug: any): string {
  return `${String(apiBase || "").trim()}/tenant/${encodeURIComponent(tenantSlug)}/prepaid-entitlements`;
}

function prepaidEntitlementGrantUrl(apiBase: string, tenantSlug: any): string {
  return `${prepaidEntitlementsUrl(apiBase, tenantSlug)}/grant`;
}

function prepaidEntitlementAdjustUrl(apiBase: string, tenantSlug: any, entitlementId: string | number): string {
  return `${prepaidEntitlementsUrl(apiBase, tenantSlug)}/${encodeURIComponent(String(entitlementId))}/adjust`;
}

function customersUrl(apiBase: string, tenantSlug: any): string {
  return `${String(apiBase || "").trim()}/customers?tenantSlug=${encodeURIComponent(tenantSlug)}`;
}

function validityToDays(unit: any, value: any): number {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (unit === "weeks") return n * 7;
  if (unit === "months") return n * 30;
  return n;
}

function normalizeMembershipPlans(input: any): MembershipPlanRecord[] {
  const plans = Array.isArray(input?.plans) ? input.plans : Array.isArray(input) ? input : [];
  return plans
    .filter((item: any) => item && typeof item === "object")
    .map((item: any) => ({
      id: Number(item.id || 0),
      tenant_id: item.tenant_id == null ? undefined : Number(item.tenant_id),
      name: String(item.name || "").trim(),
      description: item.description == null ? null : String(item.description),
      billing_type: item.billing_type == null ? null : String(item.billing_type),
      price: item.price == null ? null : Number(item.price),
      currency: item.currency == null ? null : String(item.currency),
      included_minutes: item.included_minutes == null ? null : Number(item.included_minutes),
      included_uses: item.included_uses == null ? null : Number(item.included_uses),
      validity_days: item.validity_days == null ? null : Number(item.validity_days),
      is_active: item.is_active !== false,
      created_at: item.created_at == null ? null : String(item.created_at),
      updated_at: item.updated_at == null ? null : String(item.updated_at),
    }))
    .filter((plan) => plan.id > 0 && plan.name);
}

function normalizePrepaidCatalog(input: any): PrepaidCatalogProduct[] {
  const products = Array.isArray(input?.products) ? input.products : Array.isArray(input) ? input : [];
  return products
    .filter((item: any) => item && typeof item === "object")
    .map((item: any, index: number) => ({
      id: String(item.id || `pp_${index + 1}`),
      name: String(item.name || ""),
      type:
        item.type === "credit_bundle" || item.product_type === "credit_bundle"
          ? "credit_bundle"
          : item.type === "time_pass" || item.product_type === "time_pass"
            ? "time_pass"
            : "service_package",
      description: item.description ? String(item.description) : "",
      isActive: item.isActive !== false && item.is_active !== false,
      price: Number(item.price || 0),
      currency: item.currency ? String(item.currency) : null,
      validityDays: Number(
        item.validityDays ?? validityToDays(item.validity_unit, item.validity_value)
      ),
      creditAmount: item.creditAmount == null && item.credit_amount == null ? null : Number(item.creditAmount ?? item.credit_amount ?? 0),
      sessionCount: item.sessionCount == null && item.session_count == null ? null : Number(item.sessionCount ?? item.session_count ?? 0),
      minutesTotal: item.minutesTotal == null && item.minutes_total == null ? null : Number(item.minutesTotal ?? item.minutes_total ?? 0),
      eligibleServiceIds: Array.isArray(item.eligibleServiceIds)
        ? item.eligibleServiceIds.map((x: any) => Number(x)).filter(Boolean)
        : Array.isArray(item.eligible_service_ids)
          ? item.eligible_service_ids.map((x: any) => Number(x)).filter(Boolean)
          : [],
      allowMembershipBundle: !!(item.allowMembershipBundle ?? item.rules?.allowMembershipBundle),
      stackable: !!(item.stackable ?? item.rules?.stackable),
      createdAt: item.createdAt ? String(item.createdAt) : item.created_at ? String(item.created_at) : undefined,
      updatedAt: item.updatedAt ? String(item.updatedAt) : item.updated_at ? String(item.updated_at) : undefined,
    }));
}

function serializePrepaidProductForAccounting(product: PrepaidCatalogProduct, fallbackCurrency?: string | null) {
  return {
    name: String(product.name || "").trim(),
    productType: product.type,
    description: String(product.description || "").trim(),
    isActive: !!product.isActive,
    price: Number(product.price || 0),
    currency: product.currency || fallbackCurrency || null,
    validityUnit: "days",
    validityValue: Math.max(0, Number(product.validityDays || 0)),
    creditAmount: product.type === "credit_bundle" ? Math.max(0, Number(product.creditAmount || 0)) : null,
    sessionCount: product.type === "service_package" ? Math.max(0, Number(product.sessionCount || 0)) : null,
    minutesTotal: product.type === "time_pass" ? Math.max(0, Number(product.minutesTotal || 0)) : null,
    eligibleServiceIds: Array.isArray(product.eligibleServiceIds) ? product.eligibleServiceIds.map((x: any) => Number(x)).filter(Boolean) : [],
    rules: {
      allowMembershipBundle: !!product.allowMembershipBundle,
      stackable: !!product.stackable,
    },
  };
}

function normalizePrepaidAccountingSummary(input: any): Record<string, number> {
  const raw = input && typeof input === "object" ? input : {};
  return {
    active_products: Number(raw.active_products || 0),
    active_entitlements: Number(raw.active_entitlements || 0),
    transaction_count: Number(raw.transaction_count || 0),
    redemption_count: Number(raw.redemption_count || 0),
  };
}

function normalizePrepaidTransactions(input: any): any[] {
  const rows = Array.isArray(input?.transactions) ? input.transactions : Array.isArray(input) ? input : [];
  return rows.filter((item: any) => item && typeof item === "object").map((item: any) => ({
    ...item,
    id: Number(item.id || 0),
    quantity_delta: Number(item.quantity_delta || 0),
    money_amount: item.money_amount == null ? null : Number(item.money_amount || 0),
    created_at: item.created_at ? String(item.created_at) : "",
    prepaid_product_name: item.prepaid_product_name ? String(item.prepaid_product_name) : "",
    customer_name: item.customer_name ? String(item.customer_name) : "",
    customer_email: item.customer_email ? String(item.customer_email) : "",
    transaction_type: item.transaction_type ? String(item.transaction_type) : "",
    notes: item.notes ? String(item.notes) : "",
  }));
}

function normalizePrepaidRedemptions(input: any): any[] {
  const rows = Array.isArray(input?.redemptions) ? input.redemptions : Array.isArray(input) ? input : [];
  return rows.filter((item: any) => item && typeof item === "object").map((item: any) => ({
    ...item,
    id: Number(item.id || 0),
    redeemed_quantity: Number(item.redeemed_quantity || 0),
    created_at: item.created_at ? String(item.created_at) : "",
    prepaid_product_name: item.prepaid_product_name ? String(item.prepaid_product_name) : "",
    customer_name: item.customer_name ? String(item.customer_name) : "",
    customer_email: item.customer_email ? String(item.customer_email) : "",
    redemption_mode: item.redemption_mode ? String(item.redemption_mode) : "",
    notes: item.notes ? String(item.notes) : "",
  }));
}

function normalizePrepaidCustomers(input: any): PrepaidCustomerOption[] {
  const rows = Array.isArray(input?.customers) ? input.customers : Array.isArray(input) ? input : [];
  return rows
    .filter((item: any) => item && typeof item === "object")
    .map((item: any) => ({
      id: Number(item.id || 0),
      name: item.name ? String(item.name) : "",
      email: item.email ? String(item.email) : null,
      phone: item.phone ? String(item.phone) : null,
    }))
    .filter((item: PrepaidCustomerOption) => item.id > 0);
}

function normalizePrepaidEntitlements(input: any): PrepaidEntitlementRecord[] {
  const rows = Array.isArray(input?.entitlements) ? input.entitlements : Array.isArray(input) ? input : [];
  return rows
    .filter((item: any) => item && typeof item === "object")
    .map((item: any) => ({
      id: Number(item.id || 0),
      customerId: Number(item.customer_id || 0),
      prepaidProductId: Number(item.prepaid_product_id || 0),
      status: item.status ? String(item.status) : "active",
      source: item.source ? String(item.source) : "manual_grant",
      originalQuantity: Number(item.original_quantity || 0),
      remainingQuantity: Number(item.remaining_quantity || 0),
      startsAt: item.starts_at ? String(item.starts_at) : "",
      expiresAt: item.expires_at ? String(item.expires_at) : "",
      notes: item.notes ? String(item.notes) : "",
      metadata: item.metadata ?? null,
      customerName: item.customer_name ? String(item.customer_name) : "",
      customerEmail: item.customer_email ? String(item.customer_email) : "",
      prepaidProductName: item.prepaid_product_name ? String(item.prepaid_product_name) : "",
      productType: item.product_type ? String(item.product_type) : "",
      createdAt: item.created_at ? String(item.created_at) : "",
      updatedAt: item.updated_at ? String(item.updated_at) : "",
    }))
    .filter((item: PrepaidEntitlementRecord) => item.id > 0);
}

function tenantBrandingUrl(apiBase: string, tenantSlug: any, tenantId: number, isPlatformOwner: boolean) {
  const slug = coerceTenantSlug(tenantSlug).trim();
  return isPlatformOwner
    ? `${apiBase}/tenants/${tenantId}/branding`
    : `${apiBase}/tenant/${encodeURIComponent(slug)}/branding`;
}


const normalizeHomeLanding = (input: any): TenantHomeLanding => {
  const o = input && typeof input === "object" ? input : {};
  const contact = o.contact && typeof o.contact === "object" ? o.contact : {};
  const ctas = o.ctas && typeof o.ctas === "object" ? o.ctas : {};
  const primary = ctas.primary && typeof ctas.primary === "object" ? ctas.primary : {};
  const secondary = ctas.secondary && typeof ctas.secondary === "object" ? ctas.secondary : {};



  return {
    heroImageUrl: o.heroImageUrl ? String(o.heroImageUrl) : "",
    headline: o.headline ? String(o.headline) : "",
    description: o.description ? String(o.description) : "",
    offersTitle: o.offersTitle ? String(o.offersTitle) : "",
    offers: Array.isArray(o.offers) ? o.offers.map((x: any) => String(x)).filter(Boolean) : [],
    note: o.note ? String(o.note) : "",
    contact: {
      phone: contact.phone ? String(contact.phone) : "",
      whatsapp: contact.whatsapp ? String(contact.whatsapp) : "",
      address: contact.address ? String(contact.address) : "",
      mapUrl: contact.mapUrl ? String(contact.mapUrl) : "",
    },
    ctas: {
      primary: { label: primary.label ? String(primary.label) : "" },
      secondary: { label: secondary.label ? String(secondary.label) : "" },
    },
  };
};

const loadHomeLanding = async (tenantSlug: string) => {
  setHomeLandingLoading(true);
  setHomeLandingError(null);
  setHomeLandingMessage(null);

  try {
    const res = await fetch(
      homeLandingUrl(apiBase, tenantSlug),
      { method: "GET" }
    );
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error((json as any)?.error || "Failed to load home landing content.");

    setHomeLanding(normalizeHomeLanding((json as any)?.homeLanding));
    homeLandingLoadedForSlug.current = tenantSlug;
  } catch (e: any) {
    setHomeLandingError(e?.message || "Failed to load home landing content.");
  } finally {
    setHomeLandingLoading(false);
  }
};

const saveHomeLanding = async () => {
  if (!props.tenant?.slug) return;
  setHomeLandingSaving(true);
  setHomeLandingError(null);
  setHomeLandingMessage(null);

  try {
    const payload: TenantHomeLanding = normalizeHomeLanding(homeLanding);

    // Offers can be edited as a newline list via textarea; keep as array.
    const res = await fetch(
      homeLandingUrl(apiBase, props.tenant.slug),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeLanding: payload }),
      }
    );
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error((json as any)?.error || "Failed to save home landing content.");

    setHomeLanding(normalizeHomeLanding((json as any)?.homeLanding));
    setHomeLandingMessage("Saved.");
  } catch (e: any) {
    setHomeLandingError(e?.message || "Failed to save home landing content.");
  } finally {
    setHomeLandingSaving(false);
  }
};

  const loadMembershipCheckoutPolicy = async (tenantSlug: string) => {
    setMembershipCheckoutLoading(true);
    setMembershipCheckoutError(null);
    setMembershipCheckoutMessage(null);

    try {
      const res = await fetch(
        membershipCheckoutUrl(apiBase, tenantSlug),
        { method: "GET" }
      );
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to load membership checkout policy.");

      const currency = (json as any)?.currency_code ? String((json as any).currency_code) : null;
      setMembershipCheckoutCurrency(currency);

      const merged = mergeMembershipCheckoutPolicy((json as any)?.membershipCheckout, currency);
      setMembershipCheckoutPolicy(merged);
      membershipCheckoutLoadedForSlug.current = tenantSlug;
    } catch (e: any) {
      setMembershipCheckoutError(e?.message || "Failed to load membership checkout policy.");
    } finally {
      setMembershipCheckoutLoading(false);
    }
  };

  const saveMembershipCheckoutPolicy = async () => {
    const tenantSlug = String(localTenant?.slug || "");
    if (!tenantSlug) return;

    setMembershipCheckoutSaving(true);
    setMembershipCheckoutError(null);
    setMembershipCheckoutMessage(null);

    try {
      // sanitize values (prevent NaNs / crazy inputs)
      const clean: MembershipCheckoutPolicy = {
        mode: String(membershipCheckoutPolicy.mode || "smart_top_up"),
        topUp: {
          enabled: !!membershipCheckoutPolicy.topUp?.enabled,
          allowSelfServe: !!membershipCheckoutPolicy.topUp?.allowSelfServe,
          pricePerMinute: clampNum(membershipCheckoutPolicy.topUp?.pricePerMinute, 0, 0, 999999),
          currency: membershipCheckoutPolicy.topUp?.currency || membershipCheckoutCurrency || null,
          roundToMinutes: clampInt(membershipCheckoutPolicy.topUp?.roundToMinutes, 30, 1, 1440),
          minPurchaseMinutes: clampInt(membershipCheckoutPolicy.topUp?.minPurchaseMinutes, 30, 0, 1440),
        },
        renewUpgrade: { enabled: !!membershipCheckoutPolicy.renewUpgrade?.enabled },
        strict: { enabled: !!membershipCheckoutPolicy.strict?.enabled },
      };

      // if mode is strict, enforce strict.enabled to avoid ambiguous state
      if (clean.mode === "strict") clean.strict.enabled = true;

      const res = await fetch(
        membershipCheckoutUrl(apiBase, tenantSlug),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membershipCheckout: clean }),
        }
      );

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to save membership checkout policy.");

      const merged = mergeMembershipCheckoutPolicy((json as any)?.membershipCheckout, membershipCheckoutCurrency);
      setMembershipCheckoutPolicy(merged);
      setMembershipCheckoutMessage("Saved.");
      membershipCheckoutLoadedForSlug.current = tenantSlug;
    } catch (e: any) {
      setMembershipCheckoutError(e?.message || "Failed to save membership checkout policy.");
    } finally {
      setMembershipCheckoutSaving(false);
    }
  };

  const loadMembershipPlans = async (tenantSlug: string) => {
    setMembershipPlansLoading(true);
    setMembershipPlansError(null);
    setMembershipPlansMessage(null);

    try {
      const res = await fetch(membershipPlansUrl(apiBase, tenantSlug), { method: "GET", cache: "no-store" });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to load membership plans.");
      setMembershipPlans(normalizeMembershipPlans((json as any)?.plans));
      membershipPlansLoadedForSlug.current = tenantSlug;
    } catch (e: any) {
      setMembershipPlansError(e?.message || "Failed to load membership plans.");
    } finally {
      setMembershipPlansLoading(false);
    }
  };

  const createMembershipPlan = async (payload: Record<string, any>) => {
    const tenantSlug = String(localTenant?.slug || "");
    if (!tenantSlug) return;

    setMembershipPlansSaving(true);
    setMembershipPlansError(null);
    setMembershipPlansMessage(null);

    try {
      const res = await fetch(membershipPlansUrl(apiBase, tenantSlug), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to create membership plan.");
      await loadMembershipPlans(tenantSlug);
      setMembershipPlansMessage("Membership plan created.");
    } catch (e: any) {
      setMembershipPlansError(e?.message || "Failed to create membership plan.");
    } finally {
      setMembershipPlansSaving(false);
    }
  };

  const updateMembershipPlan = async (planId: number, payload: Record<string, any>) => {
    const tenantSlug = String(localTenant?.slug || "");
    if (!tenantSlug || !planId) return;

    setMembershipPlansSaving(true);
    setMembershipPlansError(null);
    setMembershipPlansMessage(null);

    try {
      const res = await fetch(membershipPlanItemUrl(apiBase, tenantSlug, planId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to update membership plan.");
      await loadMembershipPlans(tenantSlug);
      setMembershipPlansMessage("Membership plan updated.");
    } catch (e: any) {
      setMembershipPlansError(e?.message || "Failed to update membership plan.");
    } finally {
      setMembershipPlansSaving(false);
    }
  };

  const archiveMembershipPlan = async (planId: number, isActive: boolean) => {
    await updateMembershipPlan(planId, { is_active: isActive });
    setMembershipPlansMessage(isActive ? "Membership plan restored." : "Membership plan archived.");
  };

  const loadPrepaidCatalog = async (tenantSlug: string) => {
    setPrepaidLoading(true);
    setPrepaidError(null);
    setPrepaidMessage(null);

    try {
      const tenantScoped = isTenantScopedApiBase(apiBase);
      const res = await fetch(
        tenantScoped ? prepaidProductsUrl(apiBase, tenantSlug) : prepaidCatalogUrl(apiBase, tenantSlug),
        { method: "GET" }
      );
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error((json as any)?.error || (tenantScoped ? "Failed to load prepaid products." : "Failed to load prepaid catalog."));
      }
      const normalized = tenantScoped
        ? normalizePrepaidCatalog((json as any)?.products)
        : normalizePrepaidCatalog((json as any)?.prepaidCatalog);
      setPrepaidProducts(normalized);
      prepaidLoadedForSlug.current = tenantSlug;
    } catch (e: any) {
      setPrepaidError(e?.message || "Failed to load prepaid products.");
    } finally {
      setPrepaidLoading(false);
    }
  };

  const loadPrepaidLedger = async (tenantSlug: string) => {
    if (!isTenantScopedApiBase(apiBase)) {
      setPrepaidLedgerSummary({
        active_products: prepaidProducts.filter((p) => p?.isActive).length,
        active_entitlements: 0,
        transaction_count: 0,
        redemption_count: 0,
      });
      setPrepaidTransactions([]);
      setPrepaidRedemptions([]);
      prepaidLedgerLoadedForSlug.current = tenantSlug;
      return;
    }

    setPrepaidLedgerLoading(true);
    setPrepaidLedgerError(null);

    try {
      const [summaryRes, transactionsRes, redemptionsRes] = await Promise.all([
        fetch(prepaidAccountingSummaryUrl(apiBase, tenantSlug), { method: "GET" }),
        fetch(`${prepaidTransactionsUrl(apiBase, tenantSlug)}?limit=50`, { method: "GET" }),
        fetch(`${prepaidRedemptionsUrl(apiBase, tenantSlug)}?limit=50`, { method: "GET" }),
      ]);

      const [summaryJson, transactionsJson, redemptionsJson] = await Promise.all([
        summaryRes.json().catch(() => ({} as any)),
        transactionsRes.json().catch(() => ({} as any)),
        redemptionsRes.json().catch(() => ({} as any)),
      ]);

      if (!summaryRes.ok) throw new Error((summaryJson as any)?.error || "Failed to load prepaid ledger summary.");
      if (!transactionsRes.ok) throw new Error((transactionsJson as any)?.error || "Failed to load prepaid transactions.");
      if (!redemptionsRes.ok) throw new Error((redemptionsJson as any)?.error || "Failed to load prepaid redemptions.");

      setPrepaidLedgerSummary(normalizePrepaidAccountingSummary((summaryJson as any)?.summary));
      setPrepaidTransactions(normalizePrepaidTransactions((transactionsJson as any)?.transactions));
      setPrepaidRedemptions(normalizePrepaidRedemptions((redemptionsJson as any)?.redemptions));
      prepaidLedgerLoadedForSlug.current = tenantSlug;
    } catch (e: any) {
      setPrepaidLedgerError(e?.message || "Failed to load prepaid ledger.");
    } finally {
      setPrepaidLedgerLoading(false);
    }
  };

  const loadPrepaidCustomers = async (tenantSlug: string) => {
    if (!isTenantScopedApiBase(apiBase)) {
      setPrepaidCustomers([]);
      return;
    }
    setPrepaidCustomersLoading(true);
    try {
      const res = await fetch(customersUrl(apiBase, tenantSlug), { method: "GET" });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to load customers.");
      setPrepaidCustomers(normalizePrepaidCustomers((json as any)?.customers));
    } catch {
      setPrepaidCustomers([]);
    } finally {
      setPrepaidCustomersLoading(false);
    }
  };

  const loadPrepaidEntitlements = async (tenantSlug: string) => {
    if (!isTenantScopedApiBase(apiBase)) {
      setPrepaidEntitlements([]);
      prepaidEntitlementsLoadedForSlug.current = tenantSlug;
      return;
    }

    setPrepaidEntitlementsLoading(true);
    setPrepaidEntitlementsError(null);

    try {
      const [entitlementsRes] = await Promise.all([
        fetch(`${prepaidEntitlementsUrl(apiBase, tenantSlug)}?limit=100`, { method: "GET" }),
        loadPrepaidCustomers(tenantSlug),
      ]);
      const entitlementsJson = await entitlementsRes.json().catch(() => ({} as any));
      if (!entitlementsRes.ok) throw new Error((entitlementsJson as any)?.error || "Failed to load prepaid entitlements.");
      setPrepaidEntitlements(normalizePrepaidEntitlements((entitlementsJson as any)?.entitlements));
      prepaidEntitlementsLoadedForSlug.current = tenantSlug;
    } catch (e: any) {
      setPrepaidEntitlementsError(e?.message || "Failed to load prepaid entitlements.");
    } finally {
      setPrepaidEntitlementsLoading(false);
    }
  };

  const grantPrepaidEntitlement = async (payload: {
    customerId: number;
    prepaidProductId: number;
    quantity: number;
    startsAt?: string | null;
    expiresAt?: string | null;
    notes?: string | null;
    status?: string;
  }) => {
    const tenantSlug = String(localTenant?.slug || "");
    if (!tenantSlug || !isTenantScopedApiBase(apiBase)) return;

    setPrepaidEntitlementsSaving(true);
    setPrepaidEntitlementsError(null);
    setPrepaidEntitlementsMessage(null);

    try {
      const res = await fetch(prepaidEntitlementGrantUrl(apiBase, tenantSlug), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: Number(payload.customerId || 0),
          prepaidProductId: Number(payload.prepaidProductId || 0),
          quantity: Math.max(1, Number(payload.quantity || 0)),
          startsAt: payload.startsAt || null,
          expiresAt: payload.expiresAt || null,
          notes: payload.notes || null,
          status: payload.status || "active",
          source: "manual_grant",
          metadata: { source_ui: "prepaid_ledger" },
        }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to grant prepaid entitlement.");
      await Promise.all([loadPrepaidLedger(tenantSlug), loadPrepaidEntitlements(tenantSlug)]);
      setPrepaidEntitlementsMessage("Entitlement granted.");
    } catch (e: any) {
      setPrepaidEntitlementsError(e?.message || "Failed to grant prepaid entitlement.");
    } finally {
      setPrepaidEntitlementsSaving(false);
    }
  };

  const adjustPrepaidEntitlement = async (entitlementId: number, quantityDelta: number, notes?: string | null) => {
    const tenantSlug = String(localTenant?.slug || "");
    if (!tenantSlug || !isTenantScopedApiBase(apiBase) || !entitlementId || !quantityDelta) return;

    setPrepaidEntitlementsSaving(true);
    setPrepaidEntitlementsError(null);
    setPrepaidEntitlementsMessage(null);

    try {
      const res = await fetch(prepaidEntitlementAdjustUrl(apiBase, tenantSlug, entitlementId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityDelta: Number(quantityDelta || 0),
          notes: notes || null,
          metadata: { source_ui: "prepaid_ledger" },
        }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to adjust prepaid entitlement.");
      await Promise.all([loadPrepaidLedger(tenantSlug), loadPrepaidEntitlements(tenantSlug)]);
      setPrepaidEntitlementsMessage("Entitlement adjusted.");
    } catch (e: any) {
      setPrepaidEntitlementsError(e?.message || "Failed to adjust prepaid entitlement.");
    } finally {
      setPrepaidEntitlementsSaving(false);
    }
  };

  const savePrepaidProducts = async (products: PrepaidCatalogProduct[]) => {
    const tenantSlug = String(localTenant?.slug || "");
    if (!tenantSlug) return;

    setPrepaidSaving(true);
    setPrepaidError(null);
    setPrepaidMessage(null);

    try {
      if (isTenantScopedApiBase(apiBase)) {
        const currentById = new Map(prepaidProducts.map((product) => [String(product.id), product]));
        const targetProducts = normalizePrepaidCatalog(products);

        for (const product of targetProducts) {
          const existing = currentById.get(String(product.id));
          const payload = serializePrepaidProductForAccounting(product, membershipCheckoutCurrency);
          const isPersisted = /^\d+$/.test(String(product.id || ""));
          const endpoint = isPersisted
            ? prepaidProductUrl(apiBase, tenantSlug, product.id)
            : prepaidProductsUrl(apiBase, tenantSlug);
          const method = isPersisted ? "PATCH" : "POST";
          const body = JSON.stringify({ product: payload });
          if (
            isPersisted &&
            existing &&
            JSON.stringify(serializePrepaidProductForAccounting(existing, membershipCheckoutCurrency)) === JSON.stringify(payload)
          ) {
            continue;
          }
          const res = await fetch(endpoint, {
            method,
            headers: { "Content-Type": "application/json" },
            body,
          });
          const json = await res.json().catch(() => ({} as any));
          if (!res.ok) throw new Error((json as any)?.error || "Failed to save prepaid product.");
        }

        await loadPrepaidCatalog(tenantSlug);
        await loadPrepaidLedger(tenantSlug);
        setPrepaidMessage("Saved.");
        return;
      }

      const payload: PrepaidCatalog = { products: normalizePrepaidCatalog(products) };
      const res = await fetch(prepaidCatalogUrl(apiBase, tenantSlug), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepaidCatalog: payload }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error((json as any)?.error || "Failed to save prepaid catalog.");
      const normalized = normalizePrepaidCatalog((json as any)?.prepaidCatalog);
      setPrepaidProducts(normalized);
      setPrepaidLedgerSummary({
        active_products: normalized.filter((item) => item?.isActive).length,
        active_entitlements: 0,
        transaction_count: 0,
        redemption_count: 0,
      });
      setPrepaidTransactions([]);
      setPrepaidRedemptions([]);
      setPrepaidMessage("Saved.");
      prepaidLoadedForSlug.current = tenantSlug;
      prepaidLedgerLoadedForSlug.current = tenantSlug;
    } catch (e: any) {
      setPrepaidError(e?.message || "Failed to save prepaid products.");
    } finally {
      setPrepaidSaving(false);
    }
  };

  React.useEffect(() => {
    const tenantSlug = String(localTenant?.slug || "");
    if (!tenantSlug) return;

    if (currentPill !== "memberships") return;

    if (membershipPlansLoadedForSlug.current !== tenantSlug) {
      loadMembershipPlans(tenantSlug);
    }
    if (prepaidLoadedForSlug.current !== tenantSlug) {
      loadPrepaidCatalog(tenantSlug);
    }
    if (prepaidLedgerLoadedForSlug.current !== tenantSlug) {
      loadPrepaidLedger(tenantSlug);
    }
    if (prepaidEntitlementsLoadedForSlug.current !== tenantSlug) {
      loadPrepaidEntitlements(tenantSlug);
    }
  }, [currentPill, localTenant?.slug, apiBase]);

  React.useEffect(() => {
    const tenantSlug = String(localTenant?.slug || "");
    if (!tenantSlug) return;

    // only load when user opens the Memberships setup pill
    if (currentPill !== "memberships") return;

    if (membershipCheckoutLoadedForSlug.current !== tenantSlug) {
      loadMembershipCheckoutPolicy(tenantSlug);
    }
  }, [currentPill, localTenant?.slug]);

React.useEffect(() => {
  const tenantSlug = coerceTenantSlug(localTenant?.slug);
  if (!tenantSlug) return;

  // Home landing content belongs in Appearance & Brand pill
  if (currentPill !== "appearance") return;

  if (homeLandingLoadedForSlug.current !== tenantSlug) {
    loadHomeLanding(tenantSlug);
  }
}, [currentPill, localTenant?.slug]);




  const openImagePreview = (src: string, alt: string) => {
    if (!src) return;
    setImagePreviewZoom(1);
    setImagePreview({ src, alt });
  };

  const closeImagePreview = () => setImagePreview(null);


  // ---------------------------------------------------------------------------
  // Phase D1: Plan summary + creation gating (UI assist; backend enforces as well)
  // ---------------------------------------------------------------------------
  type PlanSummary = {
    subscription: {
      status: string;
      trial_ends_at?: string | null;
      plan_code: string;
      plan_name: string;
      is_trial_active: boolean;
    };
    limits: {
      services: number | null;
      staff: number | null;
      resources: number | null;
    };
    usage: {
      services_count: number;
      staff_count: number;
      resources_count: number;
    };
  };

  const [planSummary, setPlanSummary] = React.useState<PlanSummary | null>(null);
  const [planSummaryError, setPlanSummaryError] = React.useState<string | null>(null);
  const [planSummaryLoading, setPlanSummaryLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!tenant?.id) return;
    if (!isPlatformOwner) return;
    let cancelled = false;
    (async () => {
      try {
        setPlanSummaryLoading(true);
        setPlanSummaryError(null);
        const res = await fetch(`${apiBase}/admin/tenants/${tenant.id}/plan-summary`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as any)?.error || `Failed to load plan summary (HTTP ${res.status})`);
        if (!cancelled) setPlanSummary(json as any);
      } catch (e: any) {
        if (!cancelled) setPlanSummaryError(e?.message || "Failed to load plan summary.");
      } finally {
        if (!cancelled) setPlanSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant?.id, apiBase]);

  const isTrialActive = Boolean(planSummary?.subscription?.is_trial_active);
  const svcLimit = planSummary?.limits?.services ?? null;
  const staffLimit = planSummary?.limits?.staff ?? null;
  const resLimit = planSummary?.limits?.resources ?? null;

  const atServicesLimit = !isTrialActive && typeof svcLimit === "number" && services.length >= svcLimit;
  const atStaffLimit = !isTrialActive && typeof staffLimit === "number" && staff.length >= staffLimit;
  const atResourcesLimit = !isTrialActive && typeof resLimit === "number" && resources.length >= resLimit;

  const [planUiMessage, setPlanUiMessage] = React.useState<string | null>(null);

  const planLabel = planSummary?.subscription?.plan_name || planSummary?.subscription?.plan_code;

  const fmtTrialEnds = (iso?: string | null) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleString();
    } catch {
      return String(iso);
    }
  };

  // Mobile UX guardrail:
  // If any setup section accidentally overflows horizontally, the browser can keep a non-zero
  // scrollLeft. Then, when you switch pills, the whole card appears "shifted" left/right.
  // We hard-reset horizontal scroll on pill change to keep the layout stable.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // keep current Y position, reset X
    window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });
  }, [currentPill]);

  // --- Blackouts (closures) ---
  const [blackouts, setBlackouts] = React.useState<TenantBlackout[]>([]);
  const [blackoutsLoading, setBlackoutsLoading] = React.useState(false);
  const [blackoutsError, setBlackoutsError] = React.useState<string | null>(null);
  const [blackoutModalOpen, setBlackoutModalOpen] = React.useState(false);
  const [blackoutStartsLocal, setBlackoutStartsLocal] = React.useState<string>("");
  const [blackoutEndsLocal, setBlackoutEndsLocal] = React.useState<string>("");
  const [blackoutReason, setBlackoutReason] = React.useState<string>("");
  const [blackoutSaving, setBlackoutSaving] = React.useState(false);

  const tenantTimeZone = (tenant as any)?.timezone || "UTC";

  const fmtInTz = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tenantTimeZone,
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  const loadBlackouts = React.useCallback(async () => {
    const tenantId = tenant?.id;
    if (!tenantId) return;

    setBlackoutsLoading(true);
    setBlackoutsError(null);
    try {
      const res = await fetch(`${apiBase}/tenant-blackouts?tenantId=${tenantId}`, {
        cache: "no-store",
      });
const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || `Failed to load blackouts (HTTP ${res.status})`);
      setBlackouts(Array.isArray((json as any)?.blackouts) ? (json as any).blackouts : []);
    } catch (e: any) {
      setBlackoutsError(e?.message || "Failed to load blackouts.");
    } finally {
      setBlackoutsLoading(false);
    }
  }, [tenant?.id, apiBase]);

  React.useEffect(() => {
  if (!tenant?.id) return;
  if (currentPill !== "hours") return;
  loadBlackouts();
}, [tenant?.id, currentPill, loadBlackouts]);

  const createBlackout = async () => {
    if (!tenant?.id) return;
    setBlackoutSaving(true);
    setBlackoutsError(null);
    try {
      if (!blackoutStartsLocal || !blackoutEndsLocal) {
        throw new Error("Please set a start and end date/time.");
      }

      const res = await fetch(`${apiBase}/tenant-blackouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          startsLocal: blackoutStartsLocal,
          endsLocal: blackoutEndsLocal,
          reason: blackoutReason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || `Failed to create blackout (HTTP ${res.status})`);

      setBlackoutModalOpen(false);
      setBlackoutStartsLocal("");
      setBlackoutEndsLocal("");
      setBlackoutReason("");
      await loadBlackouts();
    } catch (e: any) {
      setBlackoutsError(e?.message || "Failed to create blackout.");
    } finally {
      setBlackoutSaving(false);
    }
  };

  const deleteBlackout = async (id: number) => {
    if (!tenant?.id) return;
    setBlackoutsError(null);
    try {
      const res = await fetch(`${apiBase}/tenant-blackouts/${id}?tenantId=${tenant.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || `Failed to delete blackout (HTTP ${res.status})`);
      await loadBlackouts();
    } catch (e: any) {
      setBlackoutsError(e?.message || "Failed to delete blackout.");
    }
  };

  // Services: lightweight inline editor for scheduling controls
  const [svcEditOpenId, setSvcEditOpenId] = React.useState<number | null>(null);
  const [svcEditInterval, setSvcEditInterval] = React.useState<string>("");
  const [svcEditMaxSlots, setSvcEditMaxSlots] = React.useState<string>("");
  const [svcEditParallel, setSvcEditParallel] = React.useState<string>("");
  const [svcEditRequiresConfirmation, setSvcEditRequiresConfirmation] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!props.initialPill) return;
    // Allow deep-linking to a specific setup section (pill)
    setActiveSetupPill(props.initialPill as SetupPill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.initialPill]);

  const mergeBranding = (branding: any): BrandSettings => {
    const b = branding || {};
    return {
      colors: { ...BRAND_DEFAULTS.colors, ...(b.colors || {}) },
      buttons: { ...BRAND_DEFAULTS.buttons, ...(b.buttons || {}) },
      typography: { ...BRAND_DEFAULTS.typography, ...(b.typography || {}) },
      assets: {
        ...BRAND_DEFAULTS.assets,
        ...(b.assets || {}),
        banners: { ...(BRAND_DEFAULTS.assets.banners || {}), ...(b.assets?.banners || {}) },
      },
      bookingUi: { ...BRAND_DEFAULTS.bookingUi, ...(b.bookingUi || {}) },
      terminology: { ...(BRAND_DEFAULTS as any).terminology, ...(b.terminology || {}) },
    };
  };

  const [brandDraft, setBrandDraft] = React.useState<BrandSettings>(() =>
    mergeBranding((tenant as any)?.branding)
  );
  const [brandSaving, setBrandSaving] = React.useState(false);
  const [brandMessage, setBrandMessage] = React.useState<string | null>(null);
  const [brandError, setBrandError] = React.useState<string | null>(null);
  const [brandPreset, setBrandPreset] = React.useState<string>("default");

  // Advanced booking UI style overrides (Theme Studio draft CSS vars)
  const advDraft = themeStudioDraft || {};
  const adv = advDraft;
  const setAdv = (k: string, v: string) => {
    if (!setThemeStudioDraft) return;
    setThemeStudioDraft((prev: any) => {
      const next: Record<string, string> = { ...(prev || {}) };
      const val = String(v || "").trim();
      if (!val) delete next[k];
      else next[k] = val;
      return next;
    });
  };
  const clearAdv = (k: string) => setAdv(k, "");
  const advGet = (k: string, fallback: string) => String((advDraft as any)[k] ?? fallback);



  // ------------------------------
  // Theme selector (tenant.theme_key)
  // Drives booking page layout without requiring ?layout=premium
  // ------------------------------
  type PublishedTheme = { key: string; name: string; layout_key?: string | null; is_published?: boolean };
  const [publishedThemes, setPublishedThemes] = React.useState<PublishedTheme[]>([]);
  const [themeKeyDraft, setThemeKeyDraft] = React.useState<string>(() => (tenant as any)?.theme_key || "default_v1");
  const [themeSaving, setThemeSaving] = React.useState(false);
  const [themeMessage, setThemeMessage] = React.useState<string | null>(null);
  const [themeError, setThemeError] = React.useState<string | null>(null);
  const liveThemeKey = (tenant as any)?.theme_key || themeKeyDraft;

  const liveThemeMeta = React.useMemo(() => {
    const t = publishedThemes.find((x) => x.key === liveThemeKey);
    const layout = String(t?.layout_key || (tenant as any)?.layout_key || "").trim();
    const name =
      t?.name ||
      (liveThemeKey === "default_v1"
        ? "Default v1 (classic)"
        : liveThemeKey === "premium_v1"
          ? "Premium v1"
          : liveThemeKey === "modern_v1"
            ? "Modern v1"
            : liveThemeKey === "minimal_v1"
              ? "Minimal v1"
              : liveThemeKey);
    return { name, layout };
  }, [publishedThemes, liveThemeKey, tenant]);

  function openBookingLive() {
    if (!tenant?.slug) return;
    window.open(buildPublicBookingUrl(tenant.slug), "_blank", "noopener,noreferrer");
  }

  function previewBookingSelectedTheme() {
    if (!tenant?.slug) return;
    const layout = liveThemeMeta.layout;
    const url = buildPublicBookingUrl(tenant.slug, { layout });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  React.useEffect(() => {
    setThemeKeyDraft((tenant as any)?.theme_key || "default_v1");
  }, [tenant?.id, apiBase]);

  React.useEffect(() => {
    // load published themes for selector
    if (!isPlatformOwner) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/admin/themes`, { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Failed to load themes");
        const themes = (j?.themes || []) as PublishedTheme[];
        setPublishedThemes(themes.filter((t) => (t as any).is_published));
      } catch (e: any) {
        // Non-fatal: selector will fall back to built-in options
        setPublishedThemes([]);
      }
    })();
  }, []);

  async function saveThemeKey(nextKey: string) {
    if (!tenant?.id) return;
    setThemeError(null);
    setThemeMessage(null);
    setThemeSaving(true);
    try {
      const r = await setTenantThemeKey({ apiBase, tenantId: tenant.id, themeKey: nextKey });
      if (!r.ok) throw new Error(r.error);
      setThemeMessage("Theme updated. Refresh the booking page to see it.");
    } catch (e: any) {
      setThemeError(e?.message || String(e));
    } finally {
      setThemeSaving(false);
    }
  }


  React.useEffect(() => {
    setBrandDraft(mergeBranding((tenant as any)?.branding));
    setBrandPreset("default");
  }, [tenant?.id, apiBase]);

  const setBrandColor = (key: keyof BrandColors, value: string) => {
    setBrandDraft((prev) => ({ ...prev, colors: { ...(prev.colors || {}), [key]: value } }));
  };

  const setBrandButton = (key: keyof BrandButtons, value: any) => {
    setBrandDraft((prev) => ({ ...prev, buttons: { ...(prev.buttons || {}), [key]: value } }));
  };

  const setBrandTypography = (key: keyof BrandTypography, value: any) => {
    setBrandDraft((prev) => ({
      ...prev,
      typography: { ...(prev.typography || {}), [key]: value },
    }));
  };

  const setBrandBookingUi = (key: keyof BrandBookingUi, value: any) => {
    setBrandDraft((prev) => ({
      ...prev,
      bookingUi: { ...(prev.bookingUi || {}), [key]: value },
    }));
  };

  // Terminology (Booking UI labels)
  // UI-only helper: all persistence remains handled by `saveBranding`.
  const setBrandTerminology = (key: keyof BrandTerminology, value: any) => {
    setBrandDraft((prev) => ({
      ...prev,
      terminology: { ...(prev.terminology || {}), [key]: value },
    }));
  };

  const applyBrandPreset = (presetKey: string) => {
    const preset = BRAND_PRESETS[presetKey] || BRAND_PRESETS.default;
    setBrandPreset(presetKey);
    setBrandDraft((prev) => ({
      ...prev,
      colors: { ...preset.colors },
      buttons: { ...preset.buttons },
      typography: { ...preset.typography },
      bookingUi: { ...preset.bookingUi },
      // keep existing uploaded assets/banners
      assets: { ...(prev.assets || {}), banners: { ...(prev.assets?.banners || {}) } },
    }));
    setBrandMessage(null);
    setBrandError(null);
  };

  const uploadBrandAsset = async (kind: "favicon" | "hero", file: File) => {
    if (!tenant?.id) return;
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${uploadBase}/tenants/${tenant.id}/${kind}`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error || "Upload failed");

    const url = (data as any)?.favicon_url || (data as any)?.hero_url || (data as any)?.url || null;

    setBrandDraft((prev) => ({
      ...prev,
      assets: {
        ...(prev.assets || {}),
        ...(kind === "favicon" ? { faviconUrl: url } : { heroUrl: url }),
      },
    }));
  };

  const saveBranding = async () => {
  if (!tenant?.id) return;
  setBrandSaving(true);
  setBrandMessage(null);
  setBrandError(null);
  try {
    const slug = (localTenant?.slug ?? tenant?.slug) as string | undefined;
    if (!slug) throw new Error("Missing tenant slug");
    const res = await fetch(`${apiBase}/tenant/${encodeURIComponent(slug)}/branding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patch: brandDraft }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Failed to save branding (HTTP ${res.status})`);

    setBrandMessage("Brand settings saved.");
  } catch (e: any) {
    setBrandError(e?.message || "Failed to save branding.");
  } finally {
    setBrandSaving(false);
  }
};

  const resetBrandDraft = () => {
    setBrandDraft(mergeBranding((tenant as any)?.branding));
    setBrandMessage(null);
    setBrandError(null);
    setBrandPreset("default");
  };

  const resetAdvancedDraft = () => {
    if (!setThemeStudioDraft) return;
    setThemeStudioDraft({});
  };



  // --- extracted sections (PR-REFactor-OWNER-SPLIT-1) ---
  // Keep ctx as `any` to avoid needing to thread exact types during the refactor.
  const servicesCtx: any = {
    tenantSlug,
    apiBase,
    isPending,
    services,
    showServiceForm,
    setShowServiceForm,
    resetServiceForm,
    atServicesLimit,
    svcLimit,
    setPlanUiMessage,
    handleCreateService,

    svcName,
    setSvcName,
    svcDuration,
    setSvcDuration,
    svcInterval,
    setSvcInterval,
    svcMinSlots,
    setSvcMinSlots,
    svcMaxSlots,
    setSvcMaxSlots,
    svcParallel,
    setSvcParallel,
    svcPrice,
    setSvcPrice,
    svcReqStaff,
    setSvcReqStaff,
    svcReqRes,
    setSvcReqRes,
    svcRequiresConfirmation,
    setSvcRequiresConfirmation,

    svcEditOpenId,
    setSvcEditOpenId,
    svcEditInterval,
    setSvcEditInterval,
    svcEditMaxSlots,
    setSvcEditMaxSlots,
    svcEditParallel,
    setSvcEditParallel,
    svcEditRequiresConfirmation,
    setSvcEditRequiresConfirmation,

    handleDeleteService,
    handlePatchService,
    handleUpdateServiceAvailabilityBasis,

    resolveAssetUrl,
    openImagePreview,
    handleEntityImageChange,
    handleEntityImageDelete,
  };

  const staffCtx: any = {
    isPending,
    staff,
    staffServiceMap,
    atStaffLimit,
    staffLimit,
    showStaffForm,
    setShowStaffForm,
    resetStaffForm,
    setPlanUiMessage,
    handleCreateStaff,
    staffName,
    setStaffName,
    staffRole,
    setStaffRole,
    handleDeleteStaff,
    handlePatchStaff,
    resolveAssetUrl,
    openImagePreview,
    openLinkModal,
    handleEntityImageChange,
    handleEntityImageDelete,
  };

  const resourcesCtx: any = {
    isPending,
    resources,
    resourceServiceMap,
    atResourcesLimit,
    resLimit,
    showResourceForm,
    setShowResourceForm,
    resetResourceForm,
    setPlanUiMessage,
    handleCreateResource,
    resName,
    setResName,
    resType,
    setResType,
    handleDeleteResource,
    handlePatchResource,
    resolveAssetUrl,
    openImagePreview,
    openLinkModal,
    handleEntityImageChange,
    handleEntityImageDelete,
  };

  const operationsCtx: any = {
    opsSection,
    setOpsSection,
    servicesCtx,
    staffCtx,
    resourcesCtx,
    ratesCtx: {
      apiBase,
      tenantSlug,
      services,
      staff,
      resources,
      setPlanUiMessage,
    },
  };

  const membershipsCtx: any = {
    // policy state lives in OwnerSetupTab
    membershipCheckoutPolicy,
    setMembershipCheckoutPolicy,
    membershipCheckoutCurrency,
    membershipCheckoutLoading,
    membershipCheckoutSaving,
    membershipCheckoutError,
    membershipCheckoutMessage,
    saveMembershipCheckoutPolicy,

    // Needed for per-service membership eligibility toggles
    services,
    handlePatchService,

    // standalone prepaid catalog
    prepaidProducts,
    prepaidLoading,
    prepaidSaving,
    prepaidMessage,
    prepaidError,
    savePrepaidProducts,
    prepaidLedgerLoading,
    prepaidLedgerError,
    prepaidLedgerSummary,
    prepaidTransactions,
    prepaidRedemptions,
    prepaidCustomers,
    prepaidCustomersLoading,
    prepaidEntitlements,
    prepaidEntitlementsLoading,
    prepaidEntitlementsSaving,
    prepaidEntitlementsError,
    prepaidEntitlementsMessage,
    grantPrepaidEntitlement,
    adjustPrepaidEntitlement,
    reloadPrepaidLedger: async () => {
      const tenantSlug = String(localTenant?.slug || "");
      if (!tenantSlug) return;
      await Promise.all([loadPrepaidLedger(tenantSlug), loadPrepaidEntitlements(tenantSlug)]);
    },
  };

  const imagesCtx: any = {
    tenantName,
    localTenant,
    logoSrc,
    logoUploading,
    handleLogoFileChange,
    deleteTenantLogo,
    getTenantBannerUrl,
    getTenantBannerFieldLabel,
    resolveAssetUrl,
    uploadTenantBanner,
    deleteTenantBanner,
    openImagePreview,
  };

  return (
    <section
      className="bf-setup-shell"
      style={{
        marginBottom: 28,
        padding: "clamp(14px, 3vw, 20px)",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        borderRadius: 18,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
      }}
    >
      <style jsx global>{`
        .bf-field-row{display:grid;grid-template-columns:160px 1fr;gap:12px;align-items:center;}
        .bf-field-label{font-size:12px;font-weight:600;color:#334155;white-space:nowrap;}
        .bf-input{border-radius:10px;border:1px solid #cbd5e1;padding:7px 10px;font-size:13px;background:#fff;width:100%;}
        .bf-input-compact{max-width:260px;}
        .bf-select{border-radius:10px;border:1px solid #cbd5e1;padding:7px 10px;font-size:13px;background:#fff;width:100%;}
        .bf-select-compact{max-width:320px;}
        .bf-form-stack{display:grid;gap:10px;margin-bottom:10px;}
        .bf-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.bf-ab-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start;}
.bf-ab-main{display:grid;gap:12px;min-width:0;}
.bf-ab-sidebar{min-width:0;}
.bf-ab-sticky{position:sticky;top:12px;display:grid;gap:12px;}
.bf-ab-card{background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;box-shadow:0 10px 28px rgba(15,23,42,0.05);}
.bf-ab-preview-mobile{display:none;border:1px solid #e2e8f0;background:#fff;border-radius:14px;padding:12px;}
.bf-ab-preview-mobile>summary{cursor:pointer;font-size:12px;font-weight:900;color:#0f172a;list-style:none;outline:none;}
.bf-ab-preview-mobile>summary::-webkit-details-marker{display:none;}
.bf-ab-actions-mobile{display:none;gap:10px;align-items:center;flex-wrap:wrap;}
.bf-ab-actions-mobile-msg{font-size:12px;color:#64748b;display:flex;gap:10px;flex-wrap:wrap;}
.bf-ab-btn-primary{padding:10px 12px;border-radius:12px;background:#0f172a;color:#fff;font-weight:900;font-size:12px;border:none;cursor:pointer;}
.bf-ab-btn-secondary{padding:10px 12px;border-radius:12px;background:#ffffff;color:#0f172a;font-weight:900;font-size:12px;border:1px solid #e2e8f0;cursor:pointer;}
@media (max-width: 980px){
  .bf-ab-layout{grid-template-columns:1fr;}
  .bf-ab-sticky{position:static;}
}
@media (max-width: 640px){
  .bf-ab-preview-mobile{display:block;}
  .bf-ab-sidebar{display:none;}
  .bf-ab-actions-mobile{display:flex;}
}
        @media (max-width: 900px){.bf-grid-2{grid-template-columns:1fr;}}
        @media (max-width: 640px){
          .bf-field-row{grid-template-columns:1fr;gap:6px;align-items:start;}
          .bf-field-label{white-space:normal;}
          .bf-input-compact,.bf-select-compact{max-width:100%;}
        }

        /* ---- SaaS-grade Setup responsiveness (mobile-safe) ---- */
        .bf-setup-shell{width:100%;max-width:100%;box-sizing:border-box;overflow-x:hidden;}
        .bf-setup-hours-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start;}
        @media (max-width: 900px){.bf-setup-hours-grid{grid-template-columns:1fr;}}

        .bf-setup-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;}
        .bf-setup-title{font-size:18px;font-weight:800;margin:0 0 4px 0;color:#0f172a;}
        .bf-setup-subtitle{font-size:12px;color:#64748b;max-width:520px;margin:0;}
                .bf-setup-pillsbar{display:flex;align-items:center;gap:8px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px;WebkitOverflowScrolling:touch;}
        .bf-setup-pillsbar::-webkit-scrollbar{height:6px;}
        .bf-setup-pillsbar::-webkit-scrollbar-thumb{background:rgba(15,23,42,0.18);border-radius:999px;}
        .bf-setup-pill{display:inline-flex;align-items:center;justify-content:center;gap:6px;line-height:1;font-size:12px;font-weight:700;}
        .bf-setup-pill-icon{display:inline-flex;align-items:center;justify-content:center;}
        .bf-setup-pill-icon svg{width:20px;height:20px;}
        .bf-setup-pill-label{display:inline-block;}

        /* Mobile: main setup pills should be large, horizontal, evenly spread, and pill-shaped */
        @media (max-width: 640px){
          .bf-setup-pillsbar{
            width:100%;
            display:flex;
            align-items:center;
            justify-content:space-between;
            /* Keep a single row, but prevent the last pill from getting cropped on narrow devices */
            gap:clamp(6px, 1.8vw, 12px);
            overflow-x:hidden;
            padding-bottom:0;
            box-sizing:border-box;
            padding-left:2px;
            padding-right:2px;
          }
          .bf-setup-pill{
            /* Allow pills to shrink a bit so the row always fits (no right-side clipping) */
            flex:1 1 0;
            min-width:46px;
            max-width:60px;
            height:clamp(52px, 13vw, 62px);
            padding:0 !important; /* overrides inline padding */
            border-radius:999px;
            box-sizing:border-box;
          }
          .bf-setup-pill-label{display:none;}
          .bf-setup-pill-icon svg{width:30px;height:30px;}
        }

/* Operations (Services / Staff / Resources / Rates) subtabs */
        .bf-setup-subtabs{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;margin:12px 0 12px;overflow-x:auto;padding-bottom:4px;WebkitOverflowScrolling:touch;}
        .bf-setup-subtabs::-webkit-scrollbar{height:6px;}
        .bf-setup-subtabs::-webkit-scrollbar-thumb{background:rgba(15,23,42,0.18);border-radius:999px;}
        .bf-setup-subtabpill{display:flex;align-items:center;gap:8px;border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;padding:7px 12px;border-radius:999px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;}
        .bf-setup-subtabpill.is-active{border-color:#0f172a;background:#0f172a;color:#ffffff;box-shadow:0 10px 22px rgba(15,23,42,0.10);} 
        .bf-setup-subtabicon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;}
        .bf-setup-subtablabel{display:inline;}
        @media (max-width: 640px){
          /* Keep operations pills horizontal and visually centered */
          .bf-setup-subtabs{
            gap:8px;
            justify-content:center;
            margin:10px 0 12px;
          }
          /* Icon-only pills on mobile */
          .bf-setup-subtabpill{padding:8px 12px;font-size:12px;}
          .bf-setup-subtablabel{display:none;}
          .bf-setup-subtabicon{width:18px;height:18px;}
        }

        @media (max-width: 640px){
          /* Bring the top main pills slightly higher within the card while keeping safe spacing from the hamburger menu */
          .bf-setup-pillswrap{position:sticky;top:6px;z-index:25;background:#ffffff;padding:8px 0 10px;border-bottom:1px solid #e2e8f0;margin-left:calc(-1 * clamp(14px, 3vw, 20px));margin-right:calc(-1 * clamp(14px, 3vw, 20px));padding-left:clamp(14px, 3vw, 20px);padding-right:clamp(14px, 3vw, 20px);}
        }

        /* Global spacing between top pills and the active section cards */
        .bf-setup-content{display:grid;gap:14px;margin-top:12px;}
        /* Prevent any setup cards/sections from bleeding out horizontally */
        .bf-setup-content > *{max-width:100%;box-sizing:border-box;}
        @media (max-width: 640px){
          .bf-setup-content > *{overflow-x:hidden;}
        }

        /* Working hours row: day + Closed stay on one line, times stack cleanly on mobile */
        .bf-wh-row{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:6px 0;box-sizing:border-box;}
        .bf-wh-top{display:flex;align-items:center;gap:12px;min-width:150px;flex:0 0 auto;}
        .bf-wh-day{width:40px;color:#475569;font-weight:700;font-size:12px;}
        .bf-wh-closed{display:flex;align-items:center;gap:6px;color:#475569;font-weight:600;font-size:12px;white-space:nowrap;}
        .bf-wh-times{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0;flex:1 1 auto;flex-wrap:nowrap;}
        .bf-wh-times input,.bf-wh-times select{min-width:0;max-width:100%;box-sizing:border-box;}
        .bf-wh-to{color:#64748b;font-size:12px;font-weight:700;white-space:nowrap;}
        @media (max-width: 640px){
          /* Mobile: keep everything inline like desktop, but tighter */
          .bf-wh-row{display:grid;grid-template-columns:38px auto minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:8px;}
          .bf-wh-top{display:contents;min-width:0;}
          .bf-wh-times{display:contents;}
          .bf-wh-day{width:auto;font-size:11px;}
          .bf-wh-closed{font-size:11px;}
          .bf-wh-to{font-size:11px;}
          .bf-wh-times input,.bf-wh-times select{font-size:11px !important;padding:2px 6px !important;}
        }

      `}</style>

      {(setupMessage || logoError) && (
        <div style={{ marginBottom: 10 }}>
          {setupMessage && (
            <div style={{ fontSize: 12, color: "#16a34a" }}>{setupMessage}</div>
          )}
          {logoError && (
            <div style={{ marginTop: setupMessage ? 6 : 0, fontSize: 12, color: "#b91c1c" }}>
              {logoError}
            </div>
          )}
        </div>
      )}

      {/* Setup section (pill-based) */}

      {/* Setup navigation pills (legacy / embedded mode) */}
      {!isSingle && (
        <div className="bf-setup-pillswrap">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="bf-setup-pillsbar">
              {([
                { key: "general", label: "General", icon: "settings" },
                { key: "hours", label: "Working hours", icon: "clock" },
                { key: "services", label: "Operations", icon: "grid" },
                { key: "memberships", label: "Prepaid", icon: "wallet" },
                { key: "images", label: "Images", icon: "image" },
                {
                  key: "appearance",
                  label: "Appearance & Brand",
                  icon: "sparkles",
                },
              ] as {
                key: SetupPill;
                label: string;
                icon:
                  | "settings"
                  | "clock"
                  | "calendar"
                  | "grid"
                  | "users"
                  | "box"
                  | "image"
                  | "sparkles"
                  | "credit"
                  | "wallet";
              }[]).map((t) => {
          const active = currentPill === t.key;
          return (
            <button
              key={t.key}
              type="button"
              className="bf-setup-pill"
              onClick={() => setActiveSetupPill(t.key)}
              style={{
                border: "1px solid " + (active ? "#0f172a" : "#cbd5e1"),
                background: active ? "#0f172a" : "#ffffff",
                color: active ? "#ffffff" : "#0f172a",
                padding: "8px 12px",
                borderRadius: 999,
cursor: "pointer",
                boxShadow: active ? "0 10px 22px rgba(15,23,42,0.10)" : "none",
              }}
            >
              <span className="bf-setup-pill-icon" aria-hidden="true">
                <SetupPillIcon name={t.icon} />
              </span>
              <span className="bf-setup-pill-label">{t.label}</span>
            </button>
          );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bf-setup-content">
                {currentPill === "general" && (
          <GeneralSection
            ctx={{
              tenant,
              localTenant,
              setLocalTenant,
              onTenantUpdated,
              apiBase,
              planSummary,
              planSummaryError,
              planSummaryLoading,
              fmtInTz,
            }}
          />
        )}

{currentPill === "hours" && (
        <div className="bf-setup-hours-grid">
          {/** Working hours **/}
	    <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            background: "#f9fafb",
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Working hours (Sun–Sat)
          </h3>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
            These hours are used to suggest available booking times. You can
            still override them with manual bookings.
          </div>

          <div style={{ marginBottom: 8 }}>
            {DAY_LABELS.map(({ key, label }) => {
              const conf = workingHours?.[key] ?? { open: "08:00", close: "22:00", closed: false };
              return (
                <div key={key} className="bf-wh-row">
                  <div className="bf-wh-top"><div className="bf-wh-day">
                    {label}
                  </div>

                  <label className="bf-wh-closed">
                    <input
                      type="checkbox"
                      checked={conf.closed}
                      onChange={(e) =>
                        handleWorkingHoursChange(key, "closed", e.target.checked)
                      }
                    />
                    <span>Closed</span>
                  </label></div>

                  {!conf.closed && (
                    <div className="bf-wh-times">
                      <input
                        type="time"
                        value={conf.open}
                        onChange={(e) => handleWorkingHoursChange(key, "open", e.target.value)}
                        style={{
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          padding: "3px 6px",
                          fontSize: 12,
                          width: "100%",
                          maxWidth: "100%",
                        }}
                      />
                      <span className="bf-wh-to">to</span>
                      <input
                        type="time"
                        value={conf.close}
                        onChange={(e) => handleWorkingHoursChange(key, "close", e.target.value)}
                        style={{
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          padding: "3px 6px",
                          fontSize: 12,
                          width: "100%",
                          maxWidth: "100%",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
                        onClick={handleSaveWorkingHours}
            disabled={savingWorkingHours}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              background: savingWorkingHours ? "#94a3b8" : "#0f172a",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 500,
              cursor: savingWorkingHours ? "default" : "pointer",
            }}
          >
            {savingWorkingHours ? "Saving…" : "Save working hours"}
          </button>
        </div>

          {/** Cut-off dates (Blackouts) **/}
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              background: "#f9fafb",
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Cut-off dates (Blackouts)
            </h3>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, maxWidth: 760 }}>
              Use this to block all bookings during major construction, private events, holidays, or unexpected closures.
              Any blackout window that overlaps a time slot will mark that slot unavailable (and booking creation will be rejected).
            </div>

	            {blackoutsError && (
	              <div style={{ fontSize: 12, color: "#b91c1c", marginBottom: 8 }}>
	                {blackoutsError}
	              </div>
	            )}


            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#475569" }}>
                Timezone: <span style={{ fontWeight: 600 }}>{tenantTimeZone}</span>
              </div>
              <button
                type="button"
                        onClick={() => setBlackoutModalOpen(true)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #0f172a",
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                        cursor: "pointer",
                }}
              >
                Add blackout
              </button>
            </div>

            <div style={{ maxHeight: 240, overflowY: "auto", paddingRight: 6, borderRadius: 12 }}>
              {blackoutsLoading ? (
<div style={{ fontSize: 12, color: "#64748b", padding: 10 }}>Loading…</div>
              ) : blackouts.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b", padding: 10 }}>
                  No cut-off dates yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {blackouts
                    .filter((b) => b.is_active)
                    .map((b) => (
                      <div
                        key={b.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                            {fmtInTz(b.starts_at)} → {fmtInTz(b.ends_at)}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            {b.reason ? b.reason : "(No reason)"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteBlackout(b.id)}
                          style={{
                            flexShrink: 0,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid #fecaca",
                            background: "#fff",
                            color: "#b91c1c",
                            fontSize: 12,
                            fontWeight: 700,
                        cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {blackoutModalOpen && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "var(--surface-overlay, rgba(15,23,42,0.6))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    width: "min(520px, 100%)",
                    background: "var(--surface-panel, #ffffff)",
                    borderRadius: 16,
                    border: "1px solid var(--border-default, #e2e8f0)",
                    boxShadow: "var(--shadow-modal, 0 24px 70px rgba(2,6,23,0.22))",
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary, #0f172a)" }}>Add blackout</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                        Enter tenant-local start/end date-time.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBlackoutModalOpen(false)}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
                      Start
                      <input
                        type="datetime-local"
                        value={blackoutStartsLocal}
                        onChange={(e) => setBlackoutStartsLocal(e.target.value)}
                        style={{
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          padding: "8px 10px",
                          fontSize: 12,
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
                      End
                      <input
                        type="datetime-local"
                        value={blackoutEndsLocal}
                        onChange={(e) => setBlackoutEndsLocal(e.target.value)}
                        style={{
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          padding: "8px 10px",
                          fontSize: 12,
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
                      Reason (optional)
                      <input
                        type="text"
                        placeholder="e.g. Private event"
                        value={blackoutReason}
                        onChange={(e) => setBlackoutReason(e.target.value)}
                        style={{
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          padding: "8px 10px",
                          fontSize: 12,
                        }}
                      />
                    </label>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setBlackoutModalOpen(false)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#0f172a",
                          fontSize: 12,
                          fontWeight: 700,
                        cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={createBlackout}
                        disabled={blackoutSaving}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid #0f172a",
                          background: blackoutSaving ? "#94a3b8" : "#0f172a",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: blackoutSaving ? "default" : "pointer",
                        }}
                      >
                        {blackoutSaving ? "Saving…" : "Save blackout"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {currentPill === "services" && (
          <OperationsSection ctx={operationsCtx} />
        )}

		{currentPill === "memberships" && (
		  <MembershipsSection ctx={membershipsCtx} />
		)}

		{currentPill === "images" && (
		  <ImagesSection ctx={imagesCtx} />
        )}

        {currentPill === "appearance" && (
          <AppearanceBrandPanel
            model={{
              tenant,
              BRAND_PRESETS,
              brandPreset,
              applyBrandPreset,
              brandDraft,
              setBrandColor,
              setBrandTypography,
              setBrandBookingUi,
              setBrandTerminology,
              saveBranding,
              brandSaving,
              brandMessage,
              brandError,
              resetBrandDraft,
              // Theme
              publishedThemes,
              themeKeyDraft,
              setThemeKeyDraft,
              liveThemeMeta,
              themeSaving,
              themeMessage,
              themeError,
              saveThemeKey,
              openBookingLive,
              previewBookingSelectedTheme,
              // Advanced UI tokens
              themeStudioDraft: advDraft,
              setThemeStudioDraft,
              advGet,
              setAdv,
              clearAdv,
              onSaveBrandOverrides,
              resetAdvancedDraft,
              // Home landing
              homeLanding,
              setHomeLanding,
              saveHomeLanding,
              homeLandingSaving,
              homeLandingMessage,
              homeLandingError,
            }}
          />
        )}
	      </div>

	      <ImagePreviewModal
	        imagePreview={imagePreview}
	        zoom={imagePreviewZoom}
	        setZoom={setImagePreviewZoom}
	        onClose={closeImagePreview}
	      />


      <LinkServicesModal
        linkModal={linkModal}
        services={services}
        linksMapError={
          linkModal?.kind === "staff" ? (props.staffLinksMapError ?? linksMapError) : linksMapError
        }
        linkError={linkError}
        linkSaving={
          linkSaving ||
          (linkModal
            ? isPending(linkModal.kind === "staff" ? `staff:link:${linkModal.id}` : `resource:link:${linkModal.id}`)
            : false)
        }
        onClose={closeLinkModal}
        onToggle={toggleLinkSelection}
        onClear={() => setLinkModal((prev) => (prev ? { ...prev, selected: [] } : prev))}
        onSave={saveLinkModal}
      />
  </section>
);
}
