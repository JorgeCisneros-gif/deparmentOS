// src/config/brand.ts
//
// Fuente única del nombre de la app.
// Leer desde VITE_APP_NAME en .env; si no está definido, usar 'DepartmOS'.
//
// USO:
//   import { APP_NAME, APP_STORAGE_PREFIX } from '../config/brand'
//
//   localStorage.getItem(`${APP_STORAGE_PREFIX}_token`)
//   <span>{APP_NAME}</span>

export const APP_NAME: string =
  import.meta.env.VITE_APP_NAME || 'DepartmOS'

// Prefijo para claves de localStorage — derivado del nombre en minúsculas sin espacios
export const APP_STORAGE_PREFIX: string =
  APP_NAME.toLowerCase().replace(/\s+/g, '_')
