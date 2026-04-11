import React, { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  FileText,
  Hash,
  Lock,
  Mail,
  MapPin,
  Phone,
  Upload,
  User,
} from "lucide-react";
import {
  getPasswordStrengthMessage,
  isValidEmail,
  isValidHotelCode,
  isValidName,
  isValidPhone,
  normalizeEmail,
} from "../../utils/authValidation";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  contactNumber: "",
  password: "",
  hotelCode: "",
  hotelName: "",
  hotelAddress: "",
};

const REQUIRED_DOCUMENTS = [
  { key: "businessPermit", label: "Business Permit" },
  { key: "birCertificate", label: "BIR Certificate" },
  { key: "fireSafetyCertificate", label: "Fire Safety Certificate" },
  { key: "validId", label: "Valid ID of Owner" },
];

const STEPS = [
  { id: 1, title: "Account", helper: "Owner access details" },
  { id: 2, title: "Hotel", helper: "Create or claim a property" },
  { id: 3, title: "Documents", helper: "Required compliance files" },
];

const INPUT_CLASS =
  "w-full rounded-2xl border border-[#eadfc8] bg-white py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-[#a6977b] focus:border-[#bf9b30] focus:ring-4 focus:ring-[#bf9b30]/12 dark:border-[#3a2e18] dark:bg-[#0f1115] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#c9a84c] dark:focus:ring-[#c9a84c]/12";

const formatFileMeta = (file) => {
  if (!file) return "PDF, JPG, PNG, or WEBP";
  const sizeInKb = file.size / 1024;
  return `${file.name} • ${sizeInKb >= 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeInKb))} KB`}`;
};

export default function OwnerSignUp() {
  const navigate = useNavigate();
  const [signupMode, setSignupMode] = useState("create");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [documents, setDocuments] = useState({
    businessPermit: null,
    birCertificate: null,
    fireSafetyCertificate: null,
    validId: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const updateDocument = (key, file) => {
    setDocuments((current) => ({ ...current, [key]: file || null }));
  };

  const selectedCount = useMemo(
    () => REQUIRED_DOCUMENTS.filter(({ key }) => Boolean(documents[key])).length,
    [documents]
  );

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.contactNumber.trim() || !formData.password) {
        return "Please complete the owner account details first.";
      }
      if (!isValidName(formData.firstName) || !isValidName(formData.lastName)) {
        return "Enter a valid owner first and last name.";
      }
      if (!isValidEmail(formData.email)) {
        return "Enter a valid owner email address.";
      }
      if (!isValidPhone(formData.contactNumber)) {
        return "Enter a valid owner contact number.";
      }
      const passwordError = getPasswordStrengthMessage(formData.password);
      if (passwordError) {
        return passwordError;
      }
    }

    if (step === 2) {
      if (signupMode === "create" && !formData.hotelName.trim()) {
        return "Hotel name is required when creating a new hotel.";
      }
      if (signupMode === "claim" && !formData.hotelCode.trim()) {
        return "Please enter the existing hotel code.";
      }
      if (signupMode === "claim" && !isValidHotelCode(formData.hotelCode)) {
        return "Hotel code must follow the INNOVAHMS-123 format.";
      }
    }

    if (step === 3) {
      const missingDocuments = REQUIRED_DOCUMENTS.filter(({ key }) => !documents[key]);
      if (missingDocuments.length) {
        return "Please upload the Business Permit, BIR Certificate, Fire Safety Certificate, and Valid ID of Owner.";
      }
    }

    return "";
  };

  const goToStep = (nextStep) => {
    const stepError = validateStep(currentStep);
    if (nextStep > currentStep && stepError) {
      setErrorMessage(stepError);
      return;
    }
    setErrorMessage("");
    setCurrentStep(nextStep);
  };

  const handleCopyCode = async () => {
    if (!successData?.hotelCode || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(successData.hotelCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessData(null);
    setCopied(false);
    navigate("/owner/login");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const finalStepError = validateStep(currentStep) || validateStep(1) || validateStep(2) || validateStep(3);
    if (finalStepError) {
      setErrorMessage(finalStepError);
      return;
    }

    const payload = {
      ...formData,
      email: normalizeEmail(formData.email),
      hotelCode: signupMode === "claim" ? formData.hotelCode.trim().toUpperCase() : "",
      hotelName: signupMode === "create" ? formData.hotelName.trim() : "",
      hotelAddress: signupMode === "create" ? formData.hotelAddress.trim() : "",
    };

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const formPayload = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formPayload.append(key, value ?? "");
      });
      REQUIRED_DOCUMENTS.forEach(({ key }) => {
        if (documents[key]) formPayload.append(key, documents[key]);
      });

      const response = await fetch("/api/owner/signup", {
        method: "POST",
        body: formPayload,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data.error || "Registration failed.");
        return;
      }

      setSuccessData({
        ...data,
        email: payload.email,
      });
      setFormData(INITIAL_FORM);
      setDocuments({
        businessPermit: null,
        birCertificate: null,
        fireSafetyCertificate: null,
        validId: null,
      });
      setSignupMode("create");
      setCurrentStep(1);
    } catch {
      setErrorMessage("Unable to reach the server right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-white px-4 py-10 text-slate-900 transition-colors duration-300 dark:bg-[#090b10] dark:text-white md:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#f3e5c2]/60 blur-3xl dark:bg-[#3a2b13]/25" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#f6edd8] blur-3xl dark:bg-[#241a0d]/40" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-[#eadfc8] bg-white shadow-[0_24px_80px_rgba(84,58,20,0.12)] dark:border-[#2d2417] dark:bg-[#111318] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)] lg:grid-cols-[0.95fr_1.25fr]"
        >
          <section className="border-b border-[#eadfc8] bg-[linear-gradient(180deg,#fffaf0_0%,#f8f1e3_100%)] p-8 dark:border-[#2d2417] dark:bg-[linear-gradient(180deg,#13100b_0%,#0d1015_100%)] lg:border-b-0 lg:border-r">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-[#9b7a2a] dark:text-[#c9a84c]">
              Innova HMS
            </p>
            <h1 className="mt-5 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Owner Registration
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#6b5d45] dark:text-[#b7a88d]">
              Shorter signup flow na ito. Bank details, hotel policies, at hotel profile images ay ilalagay mo na lang sa owner profile page after login.
            </p>

            <div className="mt-8 space-y-4">
              <InfoCard
                title="Step-by-step"
                body="Tap Next to move through account details, hotel setup, then required documents."
              />
              <InfoCard
                title="After signup"
                body="Once your owner account is created, you can complete your hotel profile, policies, payout details, and website images inside the owner system."
              />
              <InfoCard
                title="Admin review"
                body="Required documents are still collected here so your registration can proceed to approval review immediately."
              />
            </div>
          </section>

          <section className="p-8 md:p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9b7a2a] dark:text-[#c9a84c]">
                  Owner Sign Up
                </p>
                <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Register Your Account
                </h2>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#aa9362] dark:text-[#8f7a4f]">
                Step {currentStep} of {STEPS.length}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setSignupMode("create");
                  setErrorMessage("");
                }}
                className={`rounded-[24px] border p-5 text-left transition-all ${
                  signupMode === "create"
                    ? "border-[#bf9b30] bg-[linear-gradient(135deg,#cda548_0%,#b88d2a_100%)] text-white shadow-[0_16px_36px_rgba(191,155,48,0.22)]"
                    : "border-[#eadfc8] bg-white text-slate-900 hover:border-[#cfb57a] dark:border-[#2e2619] dark:bg-[#12161d] dark:text-white dark:hover:border-[#4a3b23]"
                }`}
              >
                <p className="text-sm font-black uppercase tracking-[0.18em]">Create New Hotel</p>
                <p className={`mt-2 text-xs font-semibold ${signupMode === "create" ? "text-white/80" : "text-[#7f7056] dark:text-slate-400"}`}>
                  The system assigns a hotel code after signup.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSignupMode("claim");
                  setErrorMessage("");
                }}
                className={`rounded-[24px] border p-5 text-left transition-all ${
                  signupMode === "claim"
                    ? "border-[#bf9b30] bg-[linear-gradient(135deg,#cda548_0%,#b88d2a_100%)] text-white shadow-[0_16px_36px_rgba(191,155,48,0.22)]"
                    : "border-[#eadfc8] bg-white text-slate-900 hover:border-[#cfb57a] dark:border-[#2e2619] dark:bg-[#12161d] dark:text-white dark:hover:border-[#4a3b23]"
                }`}
              >
                <p className="text-sm font-black uppercase tracking-[0.18em]">Claim Existing Hotel</p>
                <p className={`mt-2 text-xs font-semibold ${signupMode === "claim" ? "text-white/80" : "text-[#7f7056] dark:text-slate-400"}`}>
                  Use the hotel code already assigned to your property.
                </p>
              </button>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isDone = currentStep > step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (step.id <= currentStep) setCurrentStep(step.id);
                    }}
                    className={`rounded-[24px] border px-4 py-4 text-left transition-all ${
                      isActive
                        ? "border-[#bf9b30] bg-[#fff5dd] dark:border-[#c9a84c] dark:bg-[#17120a]"
                        : "border-[#eadfc8] bg-white dark:border-[#2d2417] dark:bg-[#12161d]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-black uppercase ${
                          isDone || isActive
                            ? "bg-[#bf9b30] text-white"
                            : "bg-[#efe4c7] text-[#8b6f2b] dark:bg-[#2d2417] dark:text-[#d4b25c]"
                        }`}
                      >
                        {isDone ? <CheckCircle2 size={16} /> : step.id}
                      </span>
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-900 dark:text-white">
                          {step.title}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-[#7f7056] dark:text-slate-400">
                          {step.helper}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <AnimatePresence mode="wait">
                {currentStep === 1 ? (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5"
                  >
                    <SectionCard title="Owner Account" body="Enter the basic access details for the owner profile.">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextInput icon={User} placeholder="First Name" value={formData.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
                        <TextInput icon={User} placeholder="Last Name" value={formData.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
                        <TextInput icon={Mail} type="email" placeholder="Business Email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} className="sm:col-span-2" />
                        <TextInput icon={Phone} placeholder="Contact Number" value={formData.contactNumber} onChange={(event) => updateField("contactNumber", event.target.value)} />
                        <TextInput icon={Lock} type="password" placeholder="Password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} />
                      </div>
                    </SectionCard>
                  </motion.div>
                ) : null}

                {currentStep === 2 ? (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5"
                  >
                    {signupMode === "create" ? (
                      <SectionCard title="Create Hotel" body="Only the hotel name and address are needed here. Hotel profile images, policies, and bank details can be completed after login.">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <TextInput icon={Building2} placeholder="Hotel Name" value={formData.hotelName} onChange={(event) => updateField("hotelName", event.target.value)} />
                          <TextInput icon={MapPin} placeholder="Hotel Address" value={formData.hotelAddress} onChange={(event) => updateField("hotelAddress", event.target.value)} />
                        </div>
                        <div className="mt-5 rounded-2xl border border-[#eadfc8] bg-white px-4 py-3 dark:border-[#2e2619] dark:bg-[#12161d]">
                          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b7a2a] dark:text-[#c9a84c]">
                            Hotel code
                          </p>
                          <p className="mt-2 text-sm font-semibold text-[#5d4e36] dark:text-slate-300">
                            You do not need to create the code manually. The server will generate it for the hotel after signup.
                          </p>
                        </div>
                      </SectionCard>
                    ) : (
                      <SectionCard title="Claim Hotel" body="Use the existing hotel code already assigned to your property.">
                        <TextInput
                          icon={Hash}
                          placeholder="Hotel Code"
                          value={formData.hotelCode}
                          onChange={(event) => updateField("hotelCode", event.target.value.toUpperCase())}
                          inputClassName={`${INPUT_CLASS} uppercase`}
                        />
                        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9f8b63] dark:text-[#8c7851]">
                          Example: INNOVAHMS-12
                        </p>
                      </SectionCard>
                    )}
                  </motion.div>
                ) : null}

                {currentStep === 3 ? (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5"
                  >
                    <SectionCard title="Document Uploads" body="Upload the required files for admin review. The selected file name is shown directly in each card.">
                      <div className="mb-5 rounded-2xl border border-[#eadfc8] bg-white px-4 py-3 dark:border-[#2e2619] dark:bg-[#12161d]">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b7a2a] dark:text-[#c9a84c]">
                          Completion
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#5d4e36] dark:text-slate-300">
                          {selectedCount} of {REQUIRED_DOCUMENTS.length} required documents selected.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {REQUIRED_DOCUMENTS.map((document) => (
                          <FilePickerCard
                            key={document.key}
                            label={document.label}
                            file={documents[document.key]}
                            onChange={(file) => updateDocument(document.key, file)}
                          />
                        ))}
                      </div>
                    </SectionCard>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#aa9362] dark:text-[#8f7a4f]">
                  Already registered?{" "}
                  <Link to="/owner/login" className="text-[#9b7a2a] hover:underline dark:text-[#d3af56]">
                    Go to owner login
                  </Link>
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => goToStep(currentStep - 1)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#eadfc8] bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.26em] text-[#8e7229] dark:border-[#2e2619] dark:bg-[#12161d] dark:text-[#d6b65a]"
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                  ) : null}

                  {currentStep < STEPS.length ? (
                    <button
                      type="button"
                      onClick={() => goToStep(currentStep + 1)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#cda548_0%,#b88d2a_100%)] px-5 py-4 text-xs font-black uppercase tracking-[0.26em] text-white shadow-[0_16px_34px_rgba(191,155,48,0.22)] transition-all hover:brightness-105"
                    >
                      Next
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#cda548_0%,#b88d2a_100%)] px-5 py-4 text-xs font-black uppercase tracking-[0.26em] text-white shadow-[0_16px_34px_rgba(191,155,48,0.22)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? "Creating account..." : "Create Owner Account"}
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </section>
        </motion.div>
      </main>

      <AnimatePresence>
        {successData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              className="w-full max-w-xl rounded-[28px] border border-[#eadfc8] bg-white p-6 text-slate-900 shadow-[0_28px_80px_rgba(84,58,20,0.22)] dark:border-[#2d2417] dark:bg-[#111318] dark:text-white"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#bf9b30]/12 p-3 text-[#b88d2a] dark:bg-[#c9a84c]/12 dark:text-[#d6b65a]">
                  <CheckCircle2 size={28} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9b7a2a] dark:text-[#c9a84c]">
                    Registration complete
                  </p>
                  <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">
                    {successData.createdHotel ? "Hotel Code Assigned" : "Hotel Code Linked"}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#6b5d45] dark:text-[#b7a88d]">
                    {successData.createdHotel
                      ? "Your owner account and hotel profile are saved. Keep this hotel code while the registration waits for admin review."
                      : "Your owner account is now linked to the existing hotel code shown below and is waiting for admin review."}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-[#eadfc8] bg-[#fffaf1] p-5 dark:border-[#2e2619] dark:bg-[#0d1015]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b7a2a] dark:text-[#c9a84c]">
                  Hotel Code
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-2xl font-black tracking-[0.18em] text-slate-900 dark:text-white">
                    {successData.hotelCode}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#eadfc8] bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#8e7229] hover:bg-[#fff8ea] dark:border-[#2e2619] dark:bg-[#12161d] dark:text-[#d6b65a]"
                  >
                    <Copy size={16} />
                    {copied ? "Copied" : "Copy Code"}
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-[#eadfc8] bg-[#fffaf1] px-4 py-4 dark:border-[#2e2619] dark:bg-[#0d1015]">
                  <p className="text-sm font-semibold leading-relaxed text-[#5d4e36] dark:text-slate-300">
                    {successData.hotelCodeEmailSent
                      ? `A copy of the hotel code was sent to ${successData.hotelCodeSentTo || successData.email}.`
                      : `Email delivery is not configured right now, so please keep this code safely: ${successData.hotelCode}.`}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#eadfc8] bg-[#fffaf1] px-4 py-4 dark:border-[#2e2619] dark:bg-[#0d1015]">
                  <p className="text-sm font-semibold leading-relaxed text-[#5d4e36] dark:text-slate-300">
                    You can complete bank details, hotel policies, and website-ready hotel profile images inside the owner profile page after login.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeSuccessModal}
                  className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#cda548_0%,#b88d2a_100%)] px-5 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_34px_rgba(191,155,48,0.22)] hover:brightness-105"
                >
                  Continue To Owner Login
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function InfoCard({ title, body }) {
  return (
    <div className="rounded-[24px] border border-[#e7d5ac] bg-white/90 p-5 shadow-[0_14px_34px_rgba(191,155,48,0.08)] dark:border-[#3a2e18] dark:bg-[#12161d]">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9b7a2a] dark:text-[#c9a84c]">
        {title}
      </p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-[#52452f] dark:text-slate-300">
        {body}
      </p>
    </div>
  );
}

function SectionCard({ title, body, children }) {
  return (
    <div className="rounded-[28px] border border-[#eadfc8] bg-[#fffaf1] p-5 dark:border-[#2e2619] dark:bg-[#0d1015]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b7a2a] dark:text-[#c9a84c]">
        {title}
      </p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-[#5d4e36] dark:text-slate-300">
        {body}
      </p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function TextInput({ icon: Icon, placeholder, value, onChange, type = "text", className = "", inputClassName = INPUT_CLASS }) {
  return (
    <label className={`relative block ${className}`}>
      <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
      <input type={type} placeholder={placeholder} value={value} className={inputClassName} onChange={onChange} />
    </label>
  );
}

function FilePickerCard({ label, file, onChange }) {
  const inputRef = useRef(null);

  return (
    <div className="rounded-[24px] border border-dashed border-[#d6c192] bg-white p-4 dark:border-[#3a2e18] dark:bg-[#12161d]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7f6a3b] dark:text-[#cbb27a]">
            {label}
          </p>
          <p className="mt-2 break-all text-sm font-semibold text-[#5d4e36] dark:text-slate-300">
            {formatFileMeta(file)}
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${file ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-[#f4ead1] text-[#8d6f2c] dark:bg-[#1d1811] dark:text-[#d3b159]"}`}>
          {file ? "Selected" : "Required"}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#bf9b30]/12 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#8e7229] transition-all hover:bg-[#bf9b30]/18 dark:bg-[#c9a84c]/12 dark:text-[#d6b65a]"
      >
        <Upload size={16} />
        {file ? "Change File" : "Choose File"}
      </button>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#eadfc8] bg-[#fffaf1] px-4 py-3 text-sm text-[#7f7056] dark:border-[#2e2619] dark:bg-[#0d1015] dark:text-slate-400">
        <FileText size={16} className="mt-0.5 shrink-0 text-[#9b7a2a] dark:text-[#c9a84c]" />
        <span>Accepted formats: PDF, JPG, PNG, and WEBP.</span>
      </div>
    </div>
  );
}
