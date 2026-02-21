import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  // Auth check
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio");

  if (!audio || !(audio instanceof Blob)) {
    return Response.json({ error: "No audio file provided" }, { status: 400 });
  }

  const whisperForm = new FormData();
  whisperForm.append("file", audio, "recording.webm");
  whisperForm.append("model", "whisper-1");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperForm,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Whisper API error:", error);
    return Response.json(
      { error: "Transcription failed" },
      { status: response.status }
    );
  }

  const result = await response.json();
  return Response.json({ text: result.text });
}
