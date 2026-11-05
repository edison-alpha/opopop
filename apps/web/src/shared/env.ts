/**
 * Utility pembaca Environment Variable yang aman untuk React / Vite.
 * Menerapkan prinsip Clean Architecture: layer aplikasi/UI tidak perlu tahu detail bundler
 * (`import.meta.env` milik Vite maupun `process.env` jika ada).
 */
export function getEnv(key: string, fallback: string = ""): string {
  // 1. Cek import.meta.env (standar Vite)
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env
    if (metaEnv && typeof metaEnv[key] === "string" && metaEnv[key] !== "") {
      return metaEnv[key]
    }
  } catch {
    // Ignore jika di environment non-ESM
  }

  // 2. Cek process.env jika di-polyfill atau saat unit test
  try {
    if (
      typeof process !== "undefined" &&
      process.env &&
      typeof process.env[key] === "string" &&
      process.env[key] !== ""
    ) {
      return process.env[key]
    }
  } catch {
    // Ignore jika process tidak terdefinisi
  }

  return fallback
}
