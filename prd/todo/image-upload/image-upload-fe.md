# Frontend Implementation Plan: Mobile Camera + Client-Side Image Pipeline

**Target audience:** AI coding agent.
**Scope:** Build the React upload wizard with phone camera capture, client-side compression, and aspect-locked cropping. Integrates with the Django backend from the previous plan.
**Project conventions:** Vite + React + pnpm (matches `bigtortsupport_frontend`). TypeScript. Tailwind for styling (substitute existing CSS approach if project doesn't use Tailwind).

---

## Pre-flight checks (agent must do first)

Before writing any code, the agent verifies the following. If any check fails, stop and report — do not improvise.

1. **Confirm project root.** The frontend lives in a directory with `package.json` containing `"vite"` in `devDependencies` and `"react"` in `dependencies`. If unsure which directory, ask.
2. **Confirm package manager.** Look for `pnpm-lock.yaml`. If `package-lock.json` or `yarn.lock` exists instead, use that package manager — do not switch.
3. **Confirm React version.** Must be React 18+. If React 17 or lower, stop and report (`react-image-crop@11` requires React 16.13+ but the hook patterns below assume 18).
4. **Confirm TypeScript.** Look for `tsconfig.json`. If JavaScript-only, drop type annotations from the code but keep all logic identical.
5. **Confirm the backend endpoint.** The dashboard expects `POST /api/product-images/` accepting `multipart/form-data`. If the backend from the prior plan is not deployed yet, the agent builds the frontend in isolation and stubs the upload call.

---

## Step 1 — Install dependencies

Run from the frontend project root:

```bash
pnpm add browser-image-compression@^2.0.2 react-image-crop@^11.0.5
```

Verify both appear in `package.json` `dependencies` after install. Do not add anything else. Do not upgrade other packages.

If the project does not have `@tanstack/react-query` and the agent needs polling, add it:

```bash
pnpm add @tanstack/react-query@^5
```

Otherwise reuse whatever data-fetching the project already has.

---

## Step 2 — Environment variables

Append to existing `frontend/.env.example` (create the file if it doesn't exist; never overwrite an existing `.env`):

```
VITE_API_BASE_URL=http://localhost:8000
VITE_MAX_UPLOAD_MB=10
VITE_MAX_DIMENSION=2400
VITE_COMPRESSION_TARGET_MB=2
```

Document in the same file (as comments):

- `VITE_MAX_UPLOAD_MB` — hard upper limit on the raw file the user picks. Bigger than `VITE_COMPRESSION_TARGET_MB` because we accept big phone shots and compress them down.
- `VITE_MAX_DIMENSION` — longest edge after compression. 2400px = 2× retina headroom for the 1200px backend `large` variant.
- `VITE_COMPRESSION_TARGET_MB` — target size after browser-side compression.

---

## Step 3 — Directory structure

Create exactly these files under `src/`. Do not create extras. Do not nest deeper.

```
src/
├── components/
│   └── upload/
│       ├── ImageUploadForm.tsx       # Step 9 — wizard orchestrator
│       ├── FileSourcePicker.tsx      # Step 4 — camera + file buttons
│       ├── ImageCompressor.ts        # Step 5 — compression helper (no JSX)
│       ├── CropStep.tsx              # Step 6 — react-image-crop wrapper
│       ├── PreviewCard.tsx           # Step 7 — final preview before upload
│       └── useImageUpload.ts         # Step 8 — upload hook
├── lib/
│   ├── aspectRatios.ts               # Step 3a — shared aspect ratio map
│   └── api.ts                        # Step 3b — fetch wrapper (skip if exists)
└── pages/
    └── ProductImageDashboard.tsx     # Step 10 — page that uses the form
```

### Step 3a — `src/lib/aspectRatios.ts`

Single source of truth for aspect ratios across the frontend. Backend defines the same 5 values; keep them in sync.

```typescript
export type AspectRatio = "2:3" | "1:1" | "4:5" | "4:3" | "16:9";

export const ASPECT_RATIOS: Record<
  AspectRatio,
  { value: number; label: string; usage: string }
> = {
  "2:3": { value: 2 / 3, label: "Portrait 2:3", usage: "Books, posters" },
  "1:1": { value: 1, label: "Square 1:1", usage: "Coins, stamps, products" },
  "4:5": { value: 4 / 5, label: "Portrait 4:5", usage: "Apparel, social" },
  "4:3": {
    value: 4 / 3,
    label: "Landscape 4:3",
    usage: "Furniture, product shots",
  },
  "16:9": {
    value: 16 / 9,
    label: "Landscape 16:9",
    usage: "Course thumbnails, banners",
  },
};

export const ASPECT_RATIO_KEYS = Object.keys(ASPECT_RATIOS) as AspectRatio[];
```

### Step 3b — `src/lib/api.ts`

If the project already has an API wrapper, skip this file and use the existing one. Otherwise create:

```typescript
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiPost(path: string, body: FormData) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", body });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}
```

---

## Step 4 — `FileSourcePicker.tsx`

**Purpose:** Two buttons. Camera button uses `capture="environment"` (rear camera on mobile, file picker on desktop). File button is a plain file input.

**Props:**

- `onFileSelected: (file: File) => void`
- `disabled?: boolean`

**Implementation contract:**

- Two hidden `<input type="file" accept="image/*">` elements, refs forwarded to two visible buttons.
- Camera input has `capture="environment"`. File input does not.
- After `onChange` fires, reset `e.target.value = ""` so picking the same file twice still triggers the handler.
- Buttons receive an inline SVG icon (camera, folder). Do not pull an icon library — keep deps minimal.
- Styling: flex row, two equal-width buttons with border, padding `px-4 py-3`, rounded corners. Match existing dashboard button styling if the project has one; otherwise use Tailwind utility classes.

**Output to disk:** one file, ~60 lines.

---

## Step 5 — `ImageCompressor.ts`

**Purpose:** Pure helper module. No JSX. No component. Wraps `browser-image-compression` so the rest of the code calls one function.

**Exports:**

```typescript
export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export async function compressImage(file: File): Promise<CompressionResult>;
export function formatBytes(bytes: number): string;
```

**Implementation contract:**

- Read `VITE_COMPRESSION_TARGET_MB` and `VITE_MAX_DIMENSION` from `import.meta.env` with numeric defaults (2 and 2400).
- Call `imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: true, fileType: "image/jpeg", initialQuality: 0.85 })`.
- The library returns a `Blob`. Wrap it back into a `File` with the original name (extension swapped to `.jpg`), `type: "image/jpeg"`, fresh `lastModified`. This is necessary because `FormData` uses the `File.name` as the filename sent to the server.
- HEIC handling: setting `fileType: "image/jpeg"` makes the library decode HEIC and re-encode as JPEG automatically. No conditional logic needed.
- `formatBytes` returns "B" / "KB" / "MB" depending on magnitude. Used for UI display only.

**Output to disk:** one file, ~50 lines.

---

## Step 6 — `CropStep.tsx`

**Purpose:** Aspect-locked crop UI using `react-image-crop`. Returns a JPEG `Blob` of the cropped region.

**Props:**

- `src: string` — object URL of the compressed image (created via `URL.createObjectURL`)
- `aspectRatio: AspectRatio` — one of the 5 keys from `aspectRatios.ts`
- `onCropComplete: (blob: Blob) => void`
- `onCancel: () => void`

**Implementation contract:**

1. Import:

   ```typescript
   import ReactCrop, {
     centerCrop,
     makeAspectCrop,
     type Crop,
     type PixelCrop,
   } from "react-image-crop";
   import "react-image-crop/dist/ReactCrop.css";
   ```

2. State: `crop: Crop | undefined`, `completedCrop: PixelCrop | undefined`. Ref to the `<img>` element.

3. On image load, initialise a centred crop covering 90% of the image at the chosen aspect:

   ```typescript
   function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
     const { width, height } = e.currentTarget;
     const aspect = ASPECT_RATIOS[aspectRatio].value;
     const initial = centerCrop(
       makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
       width,
       height
     );
     setCrop(initial);
   }
   ```

4. On "Use this crop" click, draw the cropped region to a canvas and export as JPEG blob:

   ```typescript
   async function exportCrop(): Promise<Blob> {
     const image = imgRef.current!;
     const canvas = document.createElement("canvas");
     const scaleX = image.naturalWidth / image.width;
     const scaleY = image.naturalHeight / image.height;
     const px = completedCrop!;
     canvas.width = Math.round(px.width * scaleX);
     canvas.height = Math.round(px.height * scaleY);
     const ctx = canvas.getContext("2d")!;
     ctx.drawImage(
       image,
       px.x * scaleX,
       px.y * scaleY,
       px.width * scaleX,
       px.height * scaleY,
       0,
       0,
       canvas.width,
       canvas.height
     );
     return new Promise((resolve) => {
       canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
     });
   }
   ```

5. JSX structure:
   - `<ReactCrop crop={crop} onChange={setCrop} onComplete={setCompletedCrop} aspect={aspect} keepSelection>`
     - inside: `<img ref={imgRef} src={src} onLoad={onImageLoad} alt="Crop source" style={{ maxHeight: "70vh" }} />`
   - Two buttons below: "Cancel" → calls `onCancel`, "Use this crop" → calls `exportCrop` then `onCompete(blob)`.
   - Disable "Use this crop" until `completedCrop` is set.

**Critical detail the agent must not miss:** `ReactCrop` requires the import of the CSS file. Forgetting this gives an invisible crop overlay.

**Output to disk:** one file, ~80 lines.

---

## Step 7 — `PreviewCard.tsx`

**Purpose:** Show the final cropped blob before upload. Display thumbnail, dimensions, file size. Offer "Re-crop" and "Start over" actions.

**Props:**

- `blob: Blob`
- `originalSize: number` — raw file size before compression, for the savings display
- `onUpload: () => void`
- `onRecrop: () => void`
- `onReset: () => void`
- `uploading?: boolean`
- `uploadProgress?: number` — 0-100

**Implementation contract:**

- Generate object URL with `URL.createObjectURL(blob)`. Revoke in cleanup `useEffect` return.
- Read image dimensions by setting `img.onload` and reading `naturalWidth/Height`. Store in state.
- Display: thumbnail (max 200px), filename, dimensions ("400 × 600"), final size (use `formatBytes` from Step 5), compression savings ("saved 78% from 8.2 MB → 1.8 MB").
- Three buttons: "Upload" (primary), "Re-crop", "Start over". Disable all three when `uploading` is true; show progress bar when `uploadProgress > 0`.

**Output to disk:** one file, ~80 lines.

---

## Step 8 — `useImageUpload.ts`

**Purpose:** Custom hook handling the actual upload. Wraps `fetch` with `FormData`, exposes progress via `XMLHttpRequest` (fetch can't report upload progress).

**Signature:**

```typescript
interface UploadParams {
  blob: Blob;
  contentType: string; // e.g. "books.book"
  objectId: string;
  aspectRatio: AspectRatio;
  title?: string;
  isPrimary?: boolean;
  order?: number;
}

interface UploadState {
  upload: (params: UploadParams) => Promise<unknown>;
  uploading: boolean;
  progress: number; // 0-100
  error: string | null;
  result: unknown | null; // parsed JSON response
}

export function useImageUpload(): UploadState;
```

**Implementation contract:**

1. State: `uploading`, `progress`, `error`, `result`.
2. The `upload` function creates a `FormData`:
   ```typescript
   const form = new FormData();
   form.append("file", params.blob, "upload.jpg");
   form.append("content_type", params.contentType);
   form.append("object_id", params.objectId);
   form.append("aspect_ratio", params.aspectRatio);
   if (params.title) form.append("title", params.title);
   if (params.isPrimary !== undefined)
     form.append("is_primary", String(params.isPrimary));
   if (params.order !== undefined) form.append("order", String(params.order));
   ```
3. Use `XMLHttpRequest` (not `fetch`) so upload progress events fire:
   ```typescript
   const xhr = new XMLHttpRequest();
   xhr.upload.onprogress = (e) => {
     if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
   };
   xhr.onload = () => { ... resolve(JSON.parse(xhr.responseText)) ... };
   xhr.onerror = () => reject(new Error("Network error"));
   xhr.open("POST", `${import.meta.env.VITE_API_BASE_URL}/api/product-images/`);
   xhr.send(form);
   ```
4. Wrap the XHR in a `Promise` and return it. Set `uploading = false` in both success and error paths (use `try/finally`).
5. Reset `progress` to 0 at the start of each upload.

**Output to disk:** one file, ~70 lines.

---

## Step 9 — `ImageUploadForm.tsx` (the wizard)

**Purpose:** Orchestrates the whole flow. Owns the wizard state machine.

**Props:** none (page-level component, or accepts `defaultContentType` / `defaultObjectId` if embedded into a product detail page later).

**State shape:**

```typescript
type Stage =
  | "form"
  | "compressing"
  | "cropping"
  | "preview"
  | "uploading"
  | "done";

interface WizardState {
  stage: Stage;
  // Form fields
  contentType: string; // "books.book"
  objectId: string;
  aspectRatio: AspectRatio; // default "2:3"
  title: string;
  isPrimary: boolean;
  order: number;
  // File flow
  rawFile: File | null;
  compressed: CompressionResult | null;
  croppedBlob: Blob | null;
  // UI
  error: string | null;
}
```

**Stage transitions:**

1. **`form`** — User fills product type, object ID, aspect ratio. Bottom of form renders `<FileSourcePicker onFileSelected={handleFileSelected} disabled={!objectId || !contentType} />`.
2. **`compressing`** — Triggered by `handleFileSelected`. Validate file size against `VITE_MAX_UPLOAD_MB`. Show spinner with "Compressing image…". Call `compressImage(file)`. On success, store result, move to `cropping`. On failure, show error and return to `form`.
3. **`cropping`** — Render `<CropStep src={URL.createObjectURL(compressed.file)} aspectRatio={aspectRatio} onCropComplete={handleCropped} onCancel={resetToForm} />`.
4. **`preview`** — Render `<PreviewCard blob={croppedBlob} originalSize={compressed.originalSize} onUpload={handleUpload} onRecrop={() => setStage("cropping")} onReset={resetToForm} />`.
5. **`uploading`** — Same `PreviewCard` but with `uploading={true}` and `uploadProgress` from the hook.
6. **`done`** — Success message with the returned image ID. Button "Upload another" resets to `form` (keeps product type / object ID for convenience, clears file state).

**Form field UI contract:**

- **Content type** — dropdown. For now, hard-code these options matching backend models: `books.book`, `books.coin`, `books.stamp`, `courses.course`. Document in a comment that this list grows as new product types are added.
- **Object ID** — text input. Placeholder: "UUID or numeric ID of the product".
- **Aspect ratio** — dropdown built from `ASPECT_RATIO_KEYS`, showing `label` + `usage` from the map. Default-selects an aspect based on `contentType`:
  - `books.book` → `2:3`
  - `books.coin`, `books.stamp` → `1:1`
  - `courses.course` → `16:9`
  - everything else → `2:3`
- **Title** — text input (optional, used as alt text).
- **Order** — number input (default 0).
- **Is primary** — checkbox.

**Validation before allowing file pick:**

- `contentType` and `objectId` must be non-empty. If not, the `FileSourcePicker` is disabled.
- Display the chosen aspect ratio with a small visual preview rectangle (a div sized 60 × `60/aspect` px with a border) so the user sees what they're committing to before opening their camera.

**Cleanup:** Use `useEffect` cleanup to revoke any `URL.createObjectURL` URLs when the component unmounts or the wizard resets.

**Output to disk:** one file, ~250 lines (this is the biggest file in the set).

---

## Step 10 — `ProductImageDashboard.tsx`

**Purpose:** The `/dash/product-images` page. Hosts the upload form and (eventually) a grid of existing images. For this plan, the agent builds the upload section. The grid section is a stub with a TODO comment — it will be built in a follow-up task.

**Implementation contract:**

```tsx
export default function ProductImageDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-medium">Product images</h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload product photos. Variants and CDN URLs are generated
          automatically.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-lg font-medium mb-4">Upload new image</h2>
        <ImageUploadForm />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Recent uploads</h2>
        {/* TODO: render grid of ProductImage records, poll until status=done */}
        <div className="text-sm text-gray-500">
          Grid coming in next iteration.
        </div>
      </section>
    </div>
  );
}
```

**Routing:** Add the route to whatever router the project uses (React Router, TanStack Router, etc.). The agent does NOT modify routing config without first viewing the existing router file and reporting the change.

---

## Step 11 — Wire-up checklist (agent runs through these in order)

After all files are written, the agent verifies each item:

1. `pnpm install` completed without errors. `browser-image-compression` and `react-image-crop` appear in `node_modules`.
2. `pnpm tsc --noEmit` (or equivalent) reports zero type errors across the new files.
3. `pnpm build` succeeds.
4. Run `pnpm dev` and open the dashboard route. The form renders. Both buttons appear.
5. On desktop browser: click "Take photo" → file picker opens (capture attribute ignored, no error).
6. On desktop browser: pick a 5MB JPEG → spinner appears → crop UI appears → crop → preview shows → upload (stubbed if no backend).

If any check fails, the agent reports the specific failure and stops. Does not attempt to fix unrelated issues.

---

## Step 12 — Testing checklist (manual, post-build)

Same as Step 14 in the backend plan, plus:

1. **Mobile iPhone, Safari:** open `/dash/product-images`. Tap "Take photo" → native camera opens. Shoot a portrait photo (HEIC by default).
   - Verify: spinner appears, then crop UI. File arrived as JPEG (check network tab — `multipart/form-data` boundary shows `filename=*.jpg`).
   - Verify: crop frame is locked to chosen aspect ratio.
   - Verify: uploaded payload is under 2 MB.
2. **Mobile Android, Chrome:** same as above. Verify rear camera opens (not selfie).
3. **Mobile, "Choose file":** verify it opens photo library, not camera.
4. **Desktop, both buttons:** verify both fall back to file picker. No console errors.
5. **Re-crop button:** click after first crop, verify the same source image reopens (don't re-compress).
6. **Cancel during crop:** returns to form with file state cleared.
7. **Aspect ratio change:** changing the dropdown after selecting a file does NOT silently re-crop. Either the agent locks the dropdown after file selection, OR adds a confirmation "Changing aspect will discard your crop. Continue?" — agent picks one and documents the choice in a comment.
8. **Upload failure:** simulate 500 from backend → error appears in `PreviewCard`, "Upload" button re-enabled, no stuck state.

---

## Step 13 — What the agent must NOT do

These are common failure modes. Each is listed as a hard rule.

1. **Do not switch package managers.** If the project uses pnpm, do not run `npm install`. If it uses npm, do not run `pnpm add`.
2. **Do not upgrade React, Vite, TypeScript, or other existing dependencies.** Only install the two new packages.
3. **Do not invent new aspect ratios.** The 5 in `aspectRatios.ts` match the backend exactly. Adding a 6th here will break server-side validation.
4. **Do not skip the `react-image-crop` CSS import.** Without it the crop overlay is invisible. Triple-check this in `CropStep.tsx`.
5. **Do not use `fetch` for the upload if progress reporting matters.** Use `XMLHttpRequest`. The hook contract depends on this.
6. **Do not omit `useWebWorker: true`** in the compression call. Without it the UI freezes for several seconds on large phone photos.
7. **Do not handle HEIC server-side as well.** The whole point of client compression is to keep the Django stack simple. If the agent feels the urge to add `pillow-heif` to the backend, stop and re-read the previous plan.
8. **Do not store `File` objects in React state for long-lived components.** Memory pressure on mobile is real. Once `compressed.file` exists, the original `rawFile` can be dropped from state.
9. **Do not `URL.createObjectURL` without `URL.revokeObjectURL` in cleanup.** Each unrevoked URL pins the blob in memory until tab close.
10. **Do not add a backend HEIC handler "just in case".** That contradicts the previous plan and adds a libheif system dependency to the VPS.

---

## Step 14 — Files the agent will create

Summary table for the agent to tick off:

| #   | Path                                         | Approx lines | Purpose                      |
| --- | -------------------------------------------- | ------------ | ---------------------------- |
| 1   | `src/lib/aspectRatios.ts`                    | 20           | Aspect ratio constants       |
| 2   | `src/lib/api.ts`                             | 20           | API wrapper (skip if exists) |
| 3   | `src/components/upload/FileSourcePicker.tsx` | 60           | Camera + file buttons        |
| 4   | `src/components/upload/ImageCompressor.ts`   | 50           | Compression helper           |
| 5   | `src/components/upload/CropStep.tsx`         | 80           | Crop UI                      |
| 6   | `src/components/upload/PreviewCard.tsx`      | 80           | Final preview                |
| 7   | `src/components/upload/useImageUpload.ts`    | 70           | Upload hook (XHR + progress) |
| 8   | `src/components/upload/ImageUploadForm.tsx`  | 250          | Wizard orchestrator          |
| 9   | `src/pages/ProductImageDashboard.tsx`        | 40           | Page route                   |
| -   | `.env.example` (append only)                 | +4 lines     | Env documentation            |
| -   | `package.json`                               | +2 deps      | Via `pnpm add`               |

Total new code: ~670 lines across 9 files.

---

## Step 15 — Reporting back

After completing the plan, the agent reports:

1. List of files created with line counts.
2. `pnpm tsc` output (must be clean).
3. `pnpm build` output (must succeed).
4. Screenshots or descriptions of the wizard at each stage (form, cropping, preview).
5. Any deviations from this plan, with justification. Examples of acceptable deviations: project uses styled-components instead of Tailwind, project uses zustand instead of useState, project has its own `api.ts` wrapper. Examples of unacceptable deviations: adding a new dependency, changing the aspect ratio list, skipping the compression step.

If any step is unclear, the agent stops and asks before improvising.

---

**This concludes the frontend implementation plan. Combined with the previous backend plan, the agent now has end-to-end instructions for: Django models + Celery pipeline + Bunny storage (backend) and Vite/React wizard with camera + compression + cropping (frontend).**
