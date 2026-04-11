const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const namePattern = /^[A-Za-z][A-Za-z\s'.-]{1,49}$/;
const hotelCodePattern = /^INNOVAHMS-\d+$/i;

export const normalizeEmail = (value = "") => String(value).trim().toLowerCase();
export const normalizePhone = (value = "") => String(value).replace(/[^\d+]/g, "");

export const isValidEmail = (value) => emailPattern.test(normalizeEmail(value));
export const isValidName = (value) => namePattern.test(String(value || "").trim());
export const isValidHotelCode = (value) => hotelCodePattern.test(String(value || "").trim().toUpperCase());

export const isValidPhone = (value) => {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/g, "");
  if (normalized.startsWith("+63")) return digits.length === 12;
  if (digits.startsWith("09")) return digits.length === 11;
  return digits.length >= 10;
};

export const getPasswordStrengthMessage = (value = "") => {
  const issues = [];
  if (value.length < 8) issues.push("at least 8 characters");
  if (!/[A-Z]/.test(value)) issues.push("one uppercase letter");
  if (!/[a-z]/.test(value)) issues.push("one lowercase letter");
  if (!/\d/.test(value)) issues.push("one number");
  if (!/[^A-Za-z0-9]/.test(value)) issues.push("one special character");
  return issues.length ? `Password must contain ${issues.join(", ")}.` : "";
};

export const validateCustomerSignup = (formData) => {
  if (!isValidName(formData.firstName) || !isValidName(formData.lastName)) {
    return "Enter a valid first and last name.";
  }
  if (!isValidPhone(formData.contactNumber)) {
    return "Enter a valid contact number.";
  }
  if (!isValidEmail(formData.email)) {
    return "Enter a valid email address.";
  }
  const passwordError = getPasswordStrengthMessage(formData.password);
  if (passwordError) return passwordError;
  if (formData.password !== formData.confirmPassword) {
    return "Passwords do not match.";
  }
  return "";
};

export const validateStaffSignup = (formData) => {
  if (!isValidName(formData.firstName) || !isValidName(formData.lastName)) {
    return "Enter a valid first and last name.";
  }
  if (!isValidEmail(formData.email)) {
    return "Enter a valid email address.";
  }
  if (!isValidPhone(formData.contactNumber)) {
    return "Enter a valid contact number.";
  }
  if (!isValidHotelCode(formData.hotelCode)) {
    return "Hotel code must follow the INNOVAHMS-123 format.";
  }
  return getPasswordStrengthMessage(formData.password);
};
