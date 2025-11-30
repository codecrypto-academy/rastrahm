import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// Leer la clave pública directamente del archivo .env.local
const getStripePublishableKey = () => {
  // Primero intentar con process.env (método estándar de Next.js)
  let key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  
  // Si no está disponible o es un placeholder, intentar leer directamente del archivo
  if (!key || key === "pk_test_your_stripe_publishable_key" || key.length < 50) {
    try {
      const envPath = join(process.cwd(), ".env.local");
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=(.+)$/m);
      if (match && match[1]) {
        key = match[1].trim();
        console.log("📄 Leyendo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY directamente de .env.local");
      }
    } catch (error) {
      console.error("❌ Error leyendo .env.local para clave pública:", error);
    }
  }
  
  if (!key || key === "pk_test_your_stripe_publishable_key" || key.length < 50) {
    console.error("⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está configurada correctamente");
    return null;
  }
  
  return key;
};

export async function GET() {
  const key = getStripePublishableKey();
  
  if (!key) {
    return NextResponse.json(
      { error: "STRIPE_PUBLISHABLE_KEY no está configurada" },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ publishableKey: key });
}

