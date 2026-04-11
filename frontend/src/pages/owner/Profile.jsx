import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  Building2,
  Camera,
  ExternalLink,
  FileCheck2,
  MapPin,
  Pencil,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const parseOwnerSession = () => {
  try {
    return JSON.parse(localStorage.getItem("ownerSession") || "{}");
  } catch {
    return {};
  }
};

const formatPhp = (value) => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

const emptyProfile = {
  owner: {
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    profileImage: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    approvalStatus: "PENDING",
    reviewNotes: "",
    businessPermitPath: "",
    birCertificatePath: "",
    fireSafetyCertificatePath: "",
    validIdPath: "",
  },
  hotel: {
    hotelName: "",
    hotelCode: "",
    hotelAddress: "",
    hotelDescription: "",
    contactPhone: "",
    businessImage: "",
    buildingImage: "",
    checkInPolicy: "",
    checkOutPolicy: "",
    cancellationPolicy: "",
  },
  stats: { roomCount: 0, reservationCount: 0, revenue: 0 },
};

const documentItems = [
  { key: "businessPermitPath", label: "Business Permit" },
  { key: "birCertificatePath", label: "BIR Certificate" },
  { key: "fireSafetyCertificatePath", label: "Fire Safety Certificate" },
  { key: "validIdPath", label: "Valid ID" },
];

export default function OwnerProfile() {
  const navigate = useNavigate();
  const [session, setSession] = useState(parseOwnerSession());
  const [profile, setProfile] = useState(emptyProfile);
  const [draft, setDraft] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const ownerId = session?.id;

  useEffect(() => {
    const sync = () => setSession(parseOwnerSession());
    window.addEventListener("ownerSessionUpdated", sync);
    return () => window.removeEventListener("ownerSessionUpdated", sync);
  }, []);

  useEffect(() => {
    if (!ownerId) {
      navigate("/owner/login", { replace: true });
      return;
    }

    let dead = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/owner/profile/${ownerId}`);
        const data = await response.json().catch(() => ({}));
        if (!dead && response.ok) {
          const normalized = {
            owner: { ...emptyProfile.owner, ...(data.owner || {}) },
            hotel: { ...emptyProfile.hotel, ...(data.hotel || {}) },
            stats: { ...emptyProfile.stats, ...(data.stats || {}) },
          };
          setProfile(normalized);
          setDraft(normalized);
        }
      } finally {
        if (!dead) setLoading(false);
      }
    };

    load();
    return () => {
      dead = true;
    };
  }, [ownerId, navigate]);

  const initials = useMemo(
    () => `${draft.owner.firstName?.[0] || ""}${draft.owner.lastName?.[0] || ""}`.trim() || "O",
    [draft.owner.firstName, draft.owner.lastName]
  );

  const approvalTone =
    String(draft.owner.approvalStatus || "PENDING").toUpperCase() === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  const onFieldChange = (section, key, value) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const cancelEdit = () => {
    setDraft(profile);
    setEditing(false);
    setMessage("");
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/owner/profile/${ownerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to update owner profile.");

      const normalized = {
        owner: { ...emptyProfile.owner, ...(data.profile?.owner || {}) },
        hotel: { ...emptyProfile.hotel, ...(data.profile?.hotel || {}) },
        stats: { ...emptyProfile.stats, ...(data.profile?.stats || {}) },
      };
      setProfile(normalized);
      setDraft(normalized);
      setEditing(false);

      if (data.session) {
        localStorage.setItem(
          "ownerSession",
          JSON.stringify({
            ...parseOwnerSession(),
            ...data.session,
          })
        );
        window.dispatchEvent(new Event("ownerSessionUpdated"));
      }
      setMessage("Owner profile updated successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to update owner profile.");
    } finally {
      setSaving(false);
    }
  };

  const readOnly = !editing;
  const inputBase = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all ${
    readOnly
      ? "cursor-default bg-slate-50 text-slate-600"
      : "bg-white text-slate-900 focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/20"
  } border-slate-200`;
  const textareaBase = `${inputBase} min-h-[120px] resize-none`;

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#bf9b30]">Owner Profile</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Hotel, Payout, and Website Identity</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              This is now the main place for hotel profile details, hotel policy text, bank details, and the image links used across the public website.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-slate-700"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#bf9b30] px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white"
              >
                <Pencil size={14} />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {message ? (
          <div className={`mb-6 rounded-2xl border px-5 py-4 text-sm font-semibold ${message.toLowerCase().includes("failed") ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[28px] border border-slate-100 bg-white p-10 text-sm font-semibold text-slate-500 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)]">
            Loading owner profile...
          </div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
              <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)]">
                <div className="relative h-72 overflow-hidden bg-slate-900">
                  <img src={draft.hotel.buildingImage || "/images/signup-img.png"} alt={draft.hotel.hotelName || "Hotel building"} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-4 p-6 text-white md:flex-row md:items-end md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white/10">
                        {draft.owner.profileImage ? (
                          <img src={draft.owner.profileImage} alt={`${draft.owner.firstName} ${draft.owner.lastName}`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl font-black text-[#f0cf75]">{initials}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f0cf75]">Owner and Website Profile</p>
                        <h2 className="mt-2 text-2xl font-black">{draft.owner.firstName} {draft.owner.lastName}</h2>
                        <p className="mt-1 text-sm text-white/70">{draft.hotel.hotelName || "Hotel setup in progress"}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:min-w-[260px]">
                      <div className={`rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] backdrop-blur ${approvalTone}`}>
                        {draft.owner.approvalStatus || "PENDING"}
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">Hotel Code</p>
                        <p className="mt-2 text-sm font-bold">{draft.hotel.hotelCode || "--"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-3">
                  <StatCard label="Rooms" value={profile.stats.roomCount} />
                  <StatCard label="Reservations" value={profile.stats.reservationCount} />
                  <StatCard label="Revenue" value={formatPhp(profile.stats.revenue)} />
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)]">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Website Preview</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">Public Hotel Card</h3>
                <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  <img src={draft.hotel.buildingImage || draft.hotel.businessImage || "/images/signup-img.png"} alt="Hotel preview" className="h-56 w-full object-cover" />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-black text-slate-900">{draft.hotel.hotelName || "Your hotel name"}</p>
                        <p className="mt-2 text-sm text-slate-500">{draft.hotel.hotelAddress || "Your hotel address will appear here."}</p>
                      </div>
                      <div className="rounded-full bg-[#bf9b30]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#9a7a20]">
                        Website
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-600">
                      {draft.hotel.hotelDescription || "Add a short hotel description so guests immediately understand your property."}
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  The building image and hotel description here are reused by the public hotel cards and hotel showcase pages.
                </div>
              </section>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <SectionShell icon={ShieldCheck} eyebrow="Owner Identity" title="Personal Details">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="First Name"><input value={draft.owner.firstName} onChange={(e) => onFieldChange("owner", "firstName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <Field label="Last Name"><input value={draft.owner.lastName} onChange={(e) => onFieldChange("owner", "lastName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <Field label="Email"><input value={draft.owner.email} onChange={(e) => onFieldChange("owner", "email", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <Field label="Contact Number"><input value={draft.owner.contactNumber} onChange={(e) => onFieldChange("owner", "contactNumber", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <Field label="Profile Image URL" full><input value={draft.owner.profileImage} onChange={(e) => onFieldChange("owner", "profileImage", e.target.value)} readOnly={readOnly} className={inputBase} placeholder="https://..." /></Field>
                </div>
              </SectionShell>

              <SectionShell icon={Banknote} eyebrow="Bank Details" title="Payout Setup">
                <div className="grid gap-4">
                  <Field label="Bank Name"><input value={draft.owner.bankName} onChange={(e) => onFieldChange("owner", "bankName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Account Name"><input value={draft.owner.bankAccountName} onChange={(e) => onFieldChange("owner", "bankAccountName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                    <Field label="Account Number"><input value={draft.owner.bankAccountNumber} onChange={(e) => onFieldChange("owner", "bankAccountNumber", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    Use this section for the hotel payout bank details instead of entering them during registration.
                  </div>
                </div>
              </SectionShell>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <SectionShell icon={Building2} eyebrow="Hotel Profile" title="Property and Website Media">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Hotel Name"><input value={draft.hotel.hotelName} onChange={(e) => onFieldChange("hotel", "hotelName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                    <Field label="Hotel Code"><input value={draft.hotel.hotelCode} readOnly className={`${inputBase} bg-slate-100 text-slate-500`} /></Field>
                  </div>
                  <Field label="Hotel Address"><input value={draft.hotel.hotelAddress} onChange={(e) => onFieldChange("hotel", "hotelAddress", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Business Contact"><input value={draft.hotel.contactPhone} onChange={(e) => onFieldChange("hotel", "contactPhone", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                    <Field label="Business Picture URL"><input value={draft.hotel.businessImage} onChange={(e) => onFieldChange("hotel", "businessImage", e.target.value)} readOnly={readOnly} className={inputBase} placeholder="Logo or business image" /></Field>
                  </div>
                  <Field label="Hotel Building Image URL"><input value={draft.hotel.buildingImage} onChange={(e) => onFieldChange("hotel", "buildingImage", e.target.value)} readOnly={readOnly} className={inputBase} placeholder="Homepage building photo" /></Field>
                  <Field label="Hotel Description"><textarea value={draft.hotel.hotelDescription} onChange={(e) => onFieldChange("hotel", "hotelDescription", e.target.value)} readOnly={readOnly} className={textareaBase} /></Field>
                </div>
              </SectionShell>

              <SectionShell icon={MapPin} eyebrow="Hotel Policies" title="Guest Stay Rules">
                <div className="grid gap-4">
                  <Field label="Check-in Policy"><textarea value={draft.hotel.checkInPolicy} onChange={(e) => onFieldChange("hotel", "checkInPolicy", e.target.value)} readOnly={readOnly} className={textareaBase} /></Field>
                  <Field label="Check-out Policy"><textarea value={draft.hotel.checkOutPolicy} onChange={(e) => onFieldChange("hotel", "checkOutPolicy", e.target.value)} readOnly={readOnly} className={textareaBase} /></Field>
                  <Field label="Cancellation Policy"><textarea value={draft.hotel.cancellationPolicy} onChange={(e) => onFieldChange("hotel", "cancellationPolicy", e.target.value)} readOnly={readOnly} className={textareaBase} /></Field>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    These policy fields are used by the customer-facing hotel pages and AI assistant responses.
                  </div>
                </div>
              </SectionShell>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionShell icon={FileCheck2} eyebrow="Compliance Documents" title="Submitted Files">
                <div className="grid gap-4 md:grid-cols-2">
                  {documentItems.map((item) => (
                    <DocumentCard key={item.key} label={item.label} href={draft.owner[item.key]} />
                  ))}
                </div>
                {draft.owner.reviewNotes ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Review Notes</p>
                    <p className="mt-2 leading-relaxed">{draft.owner.reviewNotes}</p>
                  </div>
                ) : null}
              </SectionShell>

              <SectionShell icon={Camera} eyebrow="Image Preview" title="Website Visual Assets">
                <div className="grid gap-5">
                  <PreviewCard title="Business Picture" image={draft.hotel.businessImage || "/images/logo.png"} helper="Recommended for hotel logo or brand identity." />
                  <PreviewCard title="Hotel Building" image={draft.hotel.buildingImage || "/images/signup-img.png"} helper="Recommended for the public website hotel picture." />
                </div>
              </SectionShell>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function SectionShell({ icon: Icon, eyebrow, title, children }) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)]">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#bf9b30]/10 text-[#bf9b30]">
          <Icon size={18} />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function DocumentCard({ label, href }) {
  const hasFile = Boolean(href);
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">{label}</p>
          <p className="mt-2 text-sm text-slate-500 break-all">{hasFile ? href : "No file uploaded yet."}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${hasFile ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
          {hasFile ? "Ready" : "Missing"}
        </span>
      </div>
      {hasFile ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white"
        >
          Open File
          <ExternalLink size={14} />
        </a>
      ) : null}
    </div>
  );
}

function PreviewCard({ title, image, helper }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
      <div className="h-52 overflow-hidden">
        <img src={image} alt={title} className="h-full w-full object-cover" />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <BadgeCheck size={16} className="text-[#bf9b30]" />
          <p className="text-lg font-black text-slate-900">{title}</p>
        </div>
        <p className="mt-2 text-sm text-slate-500">{helper}</p>
      </div>
    </div>
  );
}
