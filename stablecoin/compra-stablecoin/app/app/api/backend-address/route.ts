import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";

// Leer la clave privada del backend para obtener su dirección
const getPrivateKey = () => {
  // Primero intentar con process.env
  let key = process.env.PRIVATE_KEY?.trim();
  
  // Si no está disponible, intentar leer directamente del archivo
  if (!key || key === "0x..." || key.length < 40) {
    try {
      const envPath = join(process.cwd(), ".env.local");
      const envContent = readFileSync(envPath, "utf-8");
      const match = envContent.match(/^PRIVATE_KEY=(.+)$/m);
      if (match && match[1]) {
        key = match[1].trim();
      }
    } catch (error) {
      console.error("❌ Error leyendo .env.local:", error);
    }
  }
  
  return key;
};

export async function GET() {
  try {
    const privateKey = getPrivateKey();
    
    if (!privateKey || privateKey === "0x..." || privateKey.length < 40) {
      return NextResponse.json(
        { error: "PRIVATE_KEY no está configurada" },
        { status: 500 }
      );
    }

    // Crear una wallet temporal solo para obtener la dirección
    // No necesitamos conectar a la red para esto
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;

    return NextResponse.json({ address });
  } catch (error: any) {
    console.error("Error obteniendo dirección del backend:", error);
    return NextResponse.json(
      { error: "Error al obtener la dirección del backend" },
      { status: 500 }
    );
  }
}

