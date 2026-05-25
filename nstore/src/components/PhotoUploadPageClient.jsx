"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { attachPhoto, markPhotoUploaded, requestPhotoUploadSignature } from "@/lib/api";
import { useAuth } from "@/components/ClientShell";

const TARGET_OPTIONS = [
  { value: "product", label: "Product (gallery)" },
  { value: "book", label: "Book (gallery)" },
  { value: "soap", label: "Soap (gallery)" },
  { value: "user", label: "User (profile)" },
  { value: "author", label: "Author (profile)" },
  { value: "publisher", label: "Publisher (profile)" },
  { value: "category", label: "Category (profile)" },
  { value: "tag", label: "Tag (profile / slug)" }
];

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image dimensions."));
    };
    image.src = objectUrl;
  });
}

function dataUrlToFile(dataUrl, fileName = "capture.jpg") {
  const [header, content] = dataUrl.split(",");
  const mimeMatch = /data:(.*?);base64/.exec(header || "");
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(content || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mimeType });
}

export default function PhotoUploadPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [targetType, setTargetType] = useState("product");
  const [targetIdentifier, setTargetIdentifier] = useState("");
  const [relationType, setRelationType] = useState("");
  const [altTag, setAltTag] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState(null);

  const expectsSlug = targetType === "tag";
  const relationPlaceholder = useMemo(() => {
    if (targetType === "product" || targetType === "book" || targetType === "soap") {
      return "gallery";
    }
    return "profile";
  }, [targetType]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    const startCamera = async () => {
      if (!cameraOpen) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setError("Camera access was denied or unavailable.");
        setCameraOpen(false);
      }
    };

    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOpen]);

  const onFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSuccess("");
    setError("");
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setError("Unable to capture image from camera.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to access camera frame.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    const file = dataUrlToFile(dataUrl, `camera-${Date.now()}.jpg`);
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
    setSuccess("");
    setError("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedFile) {
      setError("Select or capture an image first.");
      return;
    }
    if (!targetIdentifier.trim()) {
      setError(expectsSlug ? "Tag slug is required." : "Target UUID is required.");
      return;
    }

    setLoading(true);
    try {
      const signaturePayload = await requestPhotoUploadSignature({
        fileName: selectedFile.name,
        contentType: selectedFile.type || "image/jpeg",
        fileSizeBytes: selectedFile.size,
        altTag
      });

      const uploadUrl = signaturePayload?.upload?.url;
      const uploadMethod = signaturePayload?.upload?.method || "PUT";
      const uploadHeaders = signaturePayload?.upload?.headers || {};
      const photo = signaturePayload?.photo;

      if (!uploadUrl || !photo?.uuid) {
        throw new Error("Invalid presigned upload response.");
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: uploadMethod,
        headers: uploadHeaders,
        body: selectedFile
      });
      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
      }

      const dimensions = await readImageDimensions(selectedFile);
      await markPhotoUploaded(photo.uuid, {
        alt_tag: altTag,
        width: dimensions.width,
        height: dimensions.height,
        file_size_bytes: selectedFile.size,
        content_type: selectedFile.type || "image/jpeg"
      });

      const normalizedRelationType = relationType.trim().toLowerCase();
      await attachPhoto(photo.uuid, {
        target_type: targetType,
        target_uuid: expectsSlug ? undefined : targetIdentifier.trim(),
        target_slug: expectsSlug ? targetIdentifier.trim() : undefined,
        relation_type: normalizedRelationType,
        is_primary: normalizedRelationType === "profile" || normalizedRelationType === "cover",
        replace_existing: normalizedRelationType === "profile" || normalizedRelationType === "cover"
      });

      setUploadedPhoto(photo);
      setSuccess("Photo uploaded to S3 and linked successfully.");
    } catch (err) {
      setError(err?.message || "Photo upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300";

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>Photo Upload</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Photo Upload</h1>
      <p className="mt-1 text-sm text-slate-500">
        Uploads directly to AWS S3 with presigned URL and links the image to a target model.
      </p>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Target Type
            <select value={targetType} onChange={(event) => setTargetType(event.target.value)} className={inputClass}>
              {TARGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            {expectsSlug ? "Target Slug" : "Target UUID"}
            <input
              type="text"
              value={targetIdentifier}
              onChange={(event) => setTargetIdentifier(event.target.value)}
              placeholder={expectsSlug ? "tag-slug" : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
              required
              className={inputClass}
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Relation Type
            <input
              type="text"
              value={relationType}
              onChange={(event) => setRelationType(event.target.value)}
              placeholder={relationPlaceholder}
              className={inputClass}
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Alt Tag
            <input
              type="text"
              value={altTag}
              onChange={(event) => setAltTag(event.target.value)}
              placeholder="Short image description"
              className={inputClass}
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Upload Image
            <input type="file" accept="image/*" capture="environment" onChange={onFileChange} className="text-sm text-slate-600" />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => setCameraOpen((value) => !value)}
            >
              {cameraOpen ? "Close Camera" : "Use Camera"}
            </button>
            {cameraOpen ? (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={captureFromCamera}
              >
                Capture
              </button>
            ) : null}
          </div>

          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          {success ? <p className="text-sm font-semibold text-emerald-600">{success}</p> : null}

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload & Link Photo"}
          </button>
        </form>

        <aside className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {cameraOpen ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl border border-slate-200 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </>
          ) : null}
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full rounded-xl border border-slate-200 object-cover" />
          ) : (
            <p className="text-sm text-slate-500">No preview yet.</p>
          )}
          {uploadedPhoto?.cdn_url ? (
            <p className="text-sm text-slate-600">
              Uploaded URL:{" "}
              <a
                href={uploadedPhoto.cdn_url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-orange-700 hover:text-orange-800"
              >
                Open image
              </a>
            </p>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
