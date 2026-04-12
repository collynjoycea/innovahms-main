import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  Building2,
  Camera,
  ExternalLink,
  FileCheck2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { persistOwnerSession, readOwnerSession } from "../../utils/ownerSession";

const parseOwnerSession = () => readOwnerSession();

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

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event.target?.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

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
    hotelProfilePicture: "",
    businessImage: "",
    hotelLogo: "",
    buildingImage: "",
    checkInPolicy: "",
    checkOutPolicy: "",
    cancellationPolicy: "",
  },
  stats: { roomCount: 0, reservationCount: 0, revenue: 0 },
};

const normalizeOwnerProfile = (data = {}) => {
  const owner = { ...emptyProfile.owner, ...(data.owner || {}) };
  const hotelSeed = { ...emptyProfile.hotel, ...(data.hotel || {}) };
  const hotelProfilePicture =
    hotelSeed.hotelProfilePicture || hotelSeed.businessImage || hotelSeed.hotelLogo || "";

  return {
    owner,
    hotel: {
      ...hotelSeed,
      hotelProfilePicture,
      businessImage: hotelProfilePicture,
      hotelLogo: hotelProfilePicture,
      buildingImage: hotelSeed.buildingImage || "",
    },
    stats: { ...emptyProfile.stats, ...(data.stats || {}) },
  };
};

const buildOwnerProfilePayload = (draft) => ({
  owner: { ...draft.owner },
  hotel: {
    ...draft.hotel,
    hotelProfilePicture: draft.hotel.hotelProfilePicture || "",
    businessImage: draft.hotel.hotelProfilePicture || "",
    hotelLogo: draft.hotel.hotelProfilePicture || "",
    buildingImage: draft.hotel.buildingImage || "",
  },
});

const documentItems = [
  { key: "businessPermitPath", label: "Business Permit" },
  { key: "birCertificatePath", label: "BIR Certificate" },
  { key: "fireSafetyCertificatePath", label: "Fire Safety Certificate" },
  { key: "validIdPath", label: "Valid ID" },
];

export default function OwnerProfile() {
  const navigate = useNavigate();
  const ownerProfilePictureInputRef = useRef(null);
  const hotelProfilePictureInputRef = useRef(null);
  const buildingImageInputRef = useRef(null);
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
          const normalized = normalizeOwnerProfile(data);
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

  const approvalStatusLabel = String(draft.owner.approvalStatus || "PENDING").toUpperCase();
  const approvalTone =
    approvalStatusLabel === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";

  const onFieldChange = (section, key, value) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const resetImageInputs = () => {
    if (ownerProfilePictureInputRef.current) ownerProfilePictureInputRef.current.value = "";
    if (hotelProfilePictureInputRef.current) hotelProfilePictureInputRef.current.value = "";
    if (buildingImageInputRef.current) buildingImageInputRef.current.value = "";
  };

  const handleImageChange = async (section, key, files) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image file.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      onFieldChange(section, key, dataUrl);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Failed to read image file.");
    }
  };

  const cancelEdit = () => {
    setDraft(profile);
    resetImageInputs();
    setEditing(false);
    setMessage("");
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = buildOwnerProfilePayload(draft);
      const response = await fetch(`/api/owner/profile/${ownerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to update owner profile.");

      const normalized = normalizeOwnerProfile(data.profile);
      setProfile(normalized);
      setDraft(normalized);
      resetImageInputs();
      setEditing(false);

      if (data.session) {
        persistOwnerSession(data.session, { merge: true });
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
      ? "cursor-default bg-slate-50 text-slate-600 dark:bg-[#0d1118] dark:text-slate-300"
      : "bg-white text-slate-900 focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/20 dark:bg-[#11151d] dark:text-white"
  } border-slate-200 dark:border-white/10`;
  const textareaBase = `${inputBase} min-h-[120px] resize-none`;
  const hotelName = draft.hotel.hotelName || "Your hotel name";
  const ownerName = `${draft.owner.firstName} ${draft.owner.lastName}`.trim() || "Hotel Owner";
  const ownerProfilePictureSrc = draft.owner.profileImage || "";
  const hotelProfilePictureSrc = draft.hotel.hotelProfilePicture || "/images/logo.png";
  const buildingImageSrc = draft.hotel.buildingImage || "/images/signup-img.png";
  const hotelProfileInitials =
    draft.hotel.hotelName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "HP";
  const hotelCode = draft.hotel.hotelCode || "--";
  const hotelAddress = draft.hotel.hotelAddress || "Your hotel address will appear here.";
  const hotelDescription =
    draft.hotel.hotelDescription || "Add a short hotel description so guests immediately understand your property.";
  const ownerEmail = draft.owner.email || "Add an email address for this account.";
  const ownerContactNumber = draft.owner.contactNumber || "Add a contact number for this account.";
  const previewGuideItems = [
    {
      title: "Building image",
      description: "The wide cover photo displayed at the top of the public hotel card.",
    },
    {
      title: "Hotel profile picture",
      description: "The square brand image shown beside the hotel name.",
    },
    {
      title: "Hotel description",
      description: "The short summary that appears below the address on the website.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-6 py-6 dark:bg-transparent dark:text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#bf9b30]">Owner Profile</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Hotel, Payout, and Website Identity</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              This is now the main place for hotel profile details, hotel policy text, bank details, and the uploaded hotel images used across the public website.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-slate-700 dark:border-white/10 dark:bg-[#11151d] dark:text-slate-200"
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
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white dark:bg-[#bf9b30] dark:text-[#0d0c0a]"
              >
                <Pencil size={14} />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {message ? (
          <div className={`mb-6 rounded-2xl border px-5 py-4 text-sm font-semibold ${message.toLowerCase().includes("failed") ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[28px] border border-slate-100 bg-white p-10 text-sm font-semibold text-slate-500 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[#11151d] dark:text-slate-400 dark:shadow-none">
            Loading owner profile...
          </div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
              <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
                <div className="relative h-72 overflow-hidden bg-slate-900">
                  <img src={buildingImageSrc} alt={draft.hotel.hotelName || "Hotel building"} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/10" />
                  <div className="absolute left-6 top-6 rounded-full border border-white/15 bg-slate-950/45 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white backdrop-blur">
                    Hotel Overview
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4 text-white">
                    <div className="max-w-lg">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f0cf75]">Primary building image</p>
                      <h2 className="mt-3 text-3xl font-black">{hotelName}</h2>
                      <p className="mt-2 max-w-md text-sm text-white/80">{hotelAddress}</p>
                    </div>
                    <div className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] backdrop-blur ${approvalTone}`}>
                      {approvalStatusLabel}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-6">
                  <SummaryStrip label="Hotel Code" value={hotelCode} />
                  <OwnerAccountStrip
                    ownerName={ownerName}
                    hotelName={hotelName}
                    image={draft.owner.profileImage}
                    initials={initials}
                  />
                  <SummaryStrip icon={Mail} label="Email" value={ownerEmail} />
                  <SummaryStrip icon={Phone} label="Contact Number" value={ownerContactNumber} />
                </div>

                <div className="grid gap-4 px-6 pb-6 md:grid-cols-3">
                  <StatCard label="Rooms" value={profile.stats.roomCount} />
                  <StatCard label="Reservations" value={profile.stats.reservationCount} />
                  <StatCard label="Revenue" value={formatPhp(profile.stats.revenue)} />
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Website Preview</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Public Hotel Card</h3>
                    <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
                      This is the simplified version guests see first on the public hotel listing.
                    </p>
                  </div>
                  <div className="rounded-full bg-[#bf9b30]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#9a7a20] dark:text-[#f0cf75]">
                    Website
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#0d1118]">
                  <div className="relative h-56 overflow-hidden">
                    <img src={buildingImageSrc} alt="Hotel preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/15 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 flex items-end gap-4">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white/10">
                        {draft.hotel.hotelProfilePicture ? (
                          <img src={hotelProfilePictureSrc} alt={`${hotelName} profile`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl font-black text-[#f0cf75]">{hotelProfileInitials}</span>
                        )}
                      </div>
                      <div className="min-w-0 rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white backdrop-blur">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0cf75]">Public card brand</p>
                        <p className="mt-1 truncate text-lg font-black">{hotelName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#11151d]">
                    <div className="flex items-start gap-3">
                      <div>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{hotelName}</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hotelAddress}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {hotelDescription}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {previewGuideItems.map((item) => (
                    <PreviewGuideItem key={item.title} title={item.title} description={item.description} />
                  ))}
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
                  <div className="md:col-span-2">
                    <ImageUploadField
                      label="Owner Profile Picture"
                      helper="Upload a clear photo of the hotel owner."
                      image={ownerProfilePictureSrc}
                      hasImage={Boolean(draft.owner.profileImage)}
                      alt={ownerName}
                      readOnly={readOnly}
                      inputRef={ownerProfilePictureInputRef}
                      onSelect={(event) => handleImageChange("owner", "profileImage", event.target.files)}
                      placeholder={initials}
                    />
                  </div>
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
                  <Field label="Business Contact"><input value={draft.hotel.contactPhone} onChange={(e) => onFieldChange("hotel", "contactPhone", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <ImageUploadField
                      label="Hotel Profile Picture"
                      helper="Use a square image for your hotel logo or brand identity."
                      image={hotelProfilePictureSrc}
                      hasImage={Boolean(draft.hotel.hotelProfilePicture)}
                      alt={`${hotelName} profile`}
                      readOnly={readOnly}
                      inputRef={hotelProfilePictureInputRef}
                      onSelect={(event) => handleImageChange("hotel", "hotelProfilePicture", event.target.files)}
                      placeholder={hotelProfileInitials}
                    />
                    <ImageUploadField
                      label="Hotel Building Image"
                      helper="Use a wide image of the building or main exterior for public hotel cards."
                      image={buildingImageSrc}
                      hasImage={Boolean(draft.hotel.buildingImage)}
                      alt={`${hotelName} building`}
                      readOnly={readOnly}
                      inputRef={buildingImageInputRef}
                      onSelect={(event) => handleImageChange("hotel", "buildingImage", event.target.files)}
                      wide
                    />
                  </div>
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

              <SectionShell icon={Camera} eyebrow="Hotel Media" title="Website Visual Assets">
                <div className="grid gap-5">
                  <PreviewCard title="Hotel Profile Picture" image={hotelProfilePictureSrc} helper="This is the small brand image used for hotel identity and card previews." square />
                  <PreviewCard title="Hotel Building Image" image={buildingImageSrc} helper="This is the large public-facing cover photo used for hotel previews and showcase sections." />
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
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#0d1118]">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function SummaryStrip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-[#0d1118]">
      {Icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#bf9b30]/10 text-[#bf9b30] dark:text-[#f0cf75]">
          <Icon size={16} />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold leading-relaxed text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function OwnerAccountStrip({ ownerName, hotelName, image, initials }) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-[#0d1118]">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#11151d]">
        {image ? (
          <img src={image} alt={ownerName} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-black text-[#bf9b30] dark:text-[#f0cf75]">{initials}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Owner Account</p>
        <p className="mt-1 truncate text-base font-black text-slate-900 dark:text-white">{ownerName}</p>
        <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{hotelName}</p>
      </div>
    </div>
  );
}

function SectionShell({ icon: Icon, eyebrow, title, children }) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#bf9b30]/10 text-[#bf9b30] dark:text-[#f0cf75]">
          <Icon size={18} />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function PreviewGuideItem({ title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-[#0d1118]">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#bf9b30]/10 text-[#bf9b30] dark:text-[#f0cf75]">
        <BadgeCheck size={16} />
      </span>
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function DocumentCard({ label, href }) {
  const hasFile = Boolean(href);
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-[#0d1118]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-white">{label}</p>
          <p className="mt-2 break-all text-sm text-slate-500 dark:text-slate-400">{hasFile ? href : "No file uploaded yet."}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${hasFile ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
          {hasFile ? "Ready" : "Missing"}
        </span>
      </div>
      {hasFile ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white dark:bg-[#bf9b30] dark:text-[#0d0c0a]"
        >
          Open File
          <ExternalLink size={14} />
        </a>
      ) : null}
    </div>
  );
}

function ImageUploadField({
  label,
  helper,
  image,
  hasImage,
  alt,
  readOnly,
  inputRef,
  onSelect,
  placeholder = "Image",
  wide = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</label>
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#0d1118]">
        <div className={wide ? "h-48 overflow-hidden" : "flex justify-center p-5 pb-0"}>
          {wide ? (
            hasImage ? (
              <img src={image} alt={alt} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-3xl font-black text-[#f0cf75] dark:from-[#11151d] dark:via-[#0d1118] dark:to-black">
                Hotel Building
              </div>
            )
          ) : (
            <div className="h-40 w-40 overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#11151d]">
              {hasImage ? (
                <img src={image} alt={alt} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-3xl font-black text-[#f0cf75] dark:from-[#11151d] dark:via-[#0d1118] dark:to-black">
                  {placeholder}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-3 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">{helper}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={readOnly}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#bf9b30] dark:text-[#0d0c0a]"
            >
              <Camera size={14} />
              {hasImage ? "Replace Image" : "Upload Image"}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {readOnly ? "Switch to edit mode to upload." : "PNG, JPG, WebP, or SVG image files."}
            </span>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onSelect} />
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ title, image, helper, square = false }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#0d1118]">
      {square ? (
        <div className="flex justify-center p-5 pb-0">
          <div className="h-52 w-52 overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#11151d]">
            <img src={image} alt={title} className="h-full w-full object-cover" />
          </div>
        </div>
      ) : (
        <div className="h-52 overflow-hidden">
          <img src={image} alt={title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2">
          <BadgeCheck size={16} className="text-[#bf9b30] dark:text-[#f0cf75]" />
          <p className="text-lg font-black text-slate-900 dark:text-white">{title}</p>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{helper}</p>
      </div>
    </div>
  );
}
