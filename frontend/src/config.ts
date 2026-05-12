// Frontend → backend base URL.
// Resolution order:
//   1. VITE_API_BASE_URL (preferred, matches .env.example)
//   2. VITE_API_URL (legacy name, kept for backwards compat)
//   3. http://localhost:8000 (local dev fallback)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000';