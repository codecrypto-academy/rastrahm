/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16.0.3 tiene Turbopack habilitado por defecto
  // Para deshabilitarlo, usamos NEXT_PRIVATE_SKIP_TURBO=1 en el script
  // No configuramos nada en experimental porque turbo: undefined no es válido
};

module.exports = nextConfig;

