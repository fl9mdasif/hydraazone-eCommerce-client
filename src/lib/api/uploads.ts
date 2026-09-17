/**
 * Unlike every other file in `lib/api/`, this does NOT call the Express API
 * (`NEXT_PUBLIC_API_URL`) — it hits this Next.js app's own `/api/upload`
 * Route Handler, same-origin, which proxies to imgbb server-side so the
 * `IMGBB_API_KEY` never reaches the browser. See `app/api/upload/route.ts`.
 *
 * Built on `XMLHttpRequest`, not `fetch` — `fetch` has no upload-progress
 * event, and the uploader UI needs a real percentage, not a bare spinner.
 */
export function uploadImage(
  file: File,
  token: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.set("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("Authorization", token);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let json: { url?: string; error?: string } | null = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && json?.url) {
        resolve(json.url);
      } else {
        reject(new Error(json?.error || "Image upload failed. Please try again."));
      }
    };

    xhr.onerror = () => reject(new Error("Image upload failed. Please try again."));

    xhr.send(form);
  });
}
