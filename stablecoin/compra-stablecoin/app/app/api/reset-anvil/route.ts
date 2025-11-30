import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Anvil JSON-RPC endpoint
    const anvilUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

    // Enviar comando anvil_reset a Anvil
    const response = await fetch(anvilUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "anvil_reset",
        params: [],
        id: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error resetting Anvil:", errorText);
      return NextResponse.json(
        { success: false, error: `HTTP error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.error) {
      console.error("Anvil error:", data.error);
      return NextResponse.json(
        { success: false, error: data.error.message || "Error al resetear Anvil" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Anvil ha sido reseteado exitosamente",
    });
  } catch (error: any) {
    console.error("Error en reset-anvil:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error desconocido al resetear Anvil",
      },
      { status: 500 }
    );
  }
}

