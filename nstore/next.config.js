/** @type {import('next').NextConfig} */
function normalizeBasePath(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "/") {
    return "";
  }
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

const basePath = normalizeBasePath(process.env.NEXT_BASE_PATH);

const nextConfig = {
  reactStrictMode: true,
  basePath
};

module.exports = nextConfig;
