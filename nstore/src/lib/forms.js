export function flattenValidationErrors(value, key = "", output = {}) {
  if (Array.isArray(value)) {
    const firstString = value.find((item) => typeof item === "string" && item.trim());
    if (firstString && key && !output[key]) {
      output[key] = firstString;
      return output;
    }
    value.forEach((item) => flattenValidationErrors(item, key, output));
    return output;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      const nextKey = key ? `${key}.${childKey}` : childKey;
      flattenValidationErrors(childValue, nextKey, output);
    });
    return output;
  }

  if (typeof value === "string" && value.trim() && key && !output[key]) {
    output[key] = value.trim();
  }

  return output;
}

export function parseFormError(error, fallbackMessage) {
  const detail = typeof error?.message === "string" && error.message.trim() ? error.message.trim() : fallbackMessage;
  const source = error?.errors;
  const fieldErrors = source && typeof source === "object" ? flattenValidationErrors(source) : {};
  return { detail, fieldErrors };
}
