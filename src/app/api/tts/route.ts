import { NextRequest } from "next/server";
import { Communicate } from "edge-tts-ts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");
  const voice = searchParams.get("voice") || "en-US-AndrewNeural";

  if (!text) {
    return new Response("Missing 'text' parameter", { status: 400 });
  }

  try {
    const comm = new Communicate(text, { voice });
    
    // Create a ReadableStream to pipe WebSocket audio chunks directly to client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of comm.stream()) {
            if (chunk.type === "audio") {
              controller.enqueue(chunk.data);
            }
          }
          controller.close();
        } catch (err) {
          console.error("Stream error in Edge TTS:", err);
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400", // Cache for 1 day
      },
    });
  } catch (error) {
    console.error("Edge TTS Error:", error);
    return new Response("Failed to generate speech", { status: 500 });
  }
}
