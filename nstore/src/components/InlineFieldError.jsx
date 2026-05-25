export default function InlineFieldError({ fieldErrors, names }) {
  const keyList = Array.isArray(names) ? names : [names];
  const message = keyList.map((key) => fieldErrors?.[key]).find(Boolean);
  if (!message) {
    return null;
  }
  return <p className="text-xs font-semibold text-red-600">{message}</p>;
}
