const OWNER_SESSION_KEY = "ownerSession";

const MEDIA_FIELDS = [
  "profileImage",
  "hotelProfilePicture",
  "hotelLogo",
  "hotelBuildingImage",
  "businessImage",
  "buildingImage",
];

export const sanitizeOwnerSession = (session = {}) => {
  if (!session || typeof session !== "object") return {};
  const next = { ...session };
  MEDIA_FIELDS.forEach((key) => {
    delete next[key];
  });
  return next;
};

export const readOwnerSession = () => {
  try {
    return JSON.parse(localStorage.getItem(OWNER_SESSION_KEY) || "{}");
  } catch {
    return {};
  }
};

export const persistOwnerSession = (nextSession, options = {}) => {
  const { merge = true, dispatch = true } = options;
  const current = merge ? readOwnerSession() : {};
  const merged = sanitizeOwnerSession({
    ...current,
    ...(nextSession || {}),
  });

  if (!merged.loginTime && current?.loginTime) {
    merged.loginTime = current.loginTime;
  }

  localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify(merged));

  if (dispatch && typeof window !== "undefined") {
    window.dispatchEvent(new Event("ownerSessionUpdated"));
  }

  return merged;
};

export const clearOwnerSession = () => {
  localStorage.removeItem(OWNER_SESSION_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ownerSessionUpdated"));
  }
};

export { OWNER_SESSION_KEY };
