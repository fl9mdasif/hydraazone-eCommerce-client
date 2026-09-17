import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-side proxy to imgbb — the first Route Handler in this app.
 *
 * `IMGBB_URL`/`IMGBB_API_KEY` deliberately have no `NEXT_PUBLIC_` prefix
 * (AGENTS.md §0 rule 7: only `NEXT_PUBLIC_*` values belong in client env),
 * so they're invisible to the browser bundle by design — this route is the
 * only place they're read, and the key never reaches the client.
 *
 * Protection is a light presence check on `Authorization`, not a full JWT
 * verify: the upload button only ever renders on already auth-gated
 * dashboard/profile pages, so this just blocks stray/scripted abuse of the
 * imgbb quota, not a determined attacker — a deliberate scope call given
 * imgbb is a free, low-stakes host.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — well under imgbb's own 32MB cap,
// keeps upload times reasonable on the mobile data AGENTS.md designs around.

export async function POST(request: NextRequest) {
  if (!request.headers.get("authorization")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const imgbbUrl = process.env.IMGBB_URL;
  const imgbbKey = process.env.IMGBB_API_KEY;
  if (!imgbbUrl || !imgbbKey) {
    console.error("[api/upload] IMGBB_URL / IMGBB_API_KEY not configured.");
    return NextResponse.json(
      { error: "Image upload is not configured." },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files can be uploaded." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is too large — please use a file under 5MB." },
      { status: 400 },
    );
  }

  try {
    const upstream = new FormData();
    upstream.set("key", imgbbKey);
    upstream.set("image", file);

    const response = await fetch(imgbbUrl, {
      method: "POST",
      body: upstream,
    });

    const json = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: { url?: string; display_url?: string };
      error?: { message?: string };
    } | null;

    const url = json?.data?.display_url || json?.data?.url;

    if (!response.ok || !json?.success || !url) {
      console.error("[api/upload] imgbb upload failed:", json?.error?.message);
      return NextResponse.json(
        { error: "Image upload failed. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[api/upload] imgbb request failed:", error);
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 502 },
    );
  }
}
