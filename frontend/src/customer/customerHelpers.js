export const extractCustomerSession = () => {
  const rawCandidates = [
    localStorage.getItem("customerSession"),
    localStorage.getItem("user"),
  ].filter(Boolean);

  for (const raw of rawCandidates) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.user && typeof parsed.user === "object") return parsed.user;
      if (parsed && typeof parsed === "object") return parsed;
    } catch (error) {
      console.warn("Invalid stored customer session payload:", error);
    }
  }

  return null;
};

export const resolveCustomerId = async (savedUser) => {
  const rawId = savedUser?.id || savedUser?.customer_id || savedUser?.user_id;
  if (rawId) {
    return String(rawId).split(":")[0];
  }

  if (!savedUser?.email) {
    throw new Error("Customer ID is missing from session.");
  }

  const resolveResponse = await fetch(`/api/customers/resolve?email=${encodeURIComponent(savedUser.email)}`);
  const resolvePayload = await resolveResponse.json().catch(() => ({}));
  if (!resolveResponse.ok || !resolvePayload?.user?.id) {
    throw new Error(resolvePayload?.error || "Unable to resolve customer session.");
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      ...savedUser,
      ...resolvePayload.user,
    })
  );

  return String(resolvePayload.user.id);
};

export const normalizeRoomType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "Suite";

  const roomMap = {
    single: "Single",
    double: "Double",
    suite: "Suite",
    deluxe: "Deluxe",
    standard: "Single",
  };

  return roomMap[raw] || String(value);
};

export const serializeBookingStatus = (value) => String(value || "PENDING").toUpperCase();

export const getDaysUntilCheckIn = (date) => {
  if (!date) return -1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
};

export const getBookingPolicy = (booking) => {
  const daysUntil = getDaysUntilCheckIn(booking.checkInDate);
  const normalizedStatus = String(booking.status || "").toLowerCase();
  const isLocked = ["cancelled", "completed", "checked_out"].includes(normalizedStatus);

  return {
    daysUntil,
    canModify: !isLocked && daysUntil >= 2,
    canCancel: !isLocked && daysUntil >= 1,
  };
};

export const formatBookingDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

