import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * API route para obtener dinámicamente la dirección del contrato Ecommerce desde .env.local
 * Esto evita problemas de caché con variables de entorno en Next.js
 */
export async function GET() {
  try {
    // Intentar leer desde process.env primero (variables de entorno del servidor)
    let contractAddress = 
      process.env.NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS || 
      process.env.NEXT_PUBLIC_ECOMMERCE_ADDRESS || 
      "";

    // Si no está en process.env, intentar leer directamente desde .env.local
    if (!contractAddress) {
      const envPath = path.join(process.cwd(), ".env.local");
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        const lines = envContent.split("\n");
        
        for (const line of lines) {
          // Buscar NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS o NEXT_PUBLIC_ECOMMERCE_ADDRESS
          const match = line.match(/^NEXT_PUBLIC_ECOMMERCE_(?:CONTRACT_)?ADDRESS=(.+)$/);
          if (match) {
            contractAddress = match[1].trim().replace(/^["']|["']$/g, ""); // Remover comillas si existen
            break;
          }
        }
      }
    }

    if (!contractAddress) {
      return NextResponse.json(
        { error: "ECOMMERCE_CONTRACT_ADDRESS not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({ address: contractAddress });
  } catch (error) {
    console.error("Error reading ECOMMERCE_CONTRACT_ADDRESS:", error);
    return NextResponse.json(
      { error: "Failed to read contract address" },
      { status: 500 }
    );
  }
}

