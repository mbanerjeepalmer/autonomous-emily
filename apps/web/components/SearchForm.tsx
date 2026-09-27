"use client";

import { useRef, useState } from "react";

export function SearchForm() {
  const [image, setImage] = useState<{ name: string; url: string } | null>(null);
  const [typed, setTyped] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form action="/insider" method="GET" className="landing-form">
      {image && <input type="hidden" name="image" value={image.name} />}

      {image && (
        <div className="landing-image-chip">
          <img src={image.url} alt="" />
          <span>{image.name}</span>
          <button type="button" onClick={() => setImage(null)} aria-label="Remove image">
            ×
          </button>
        </div>
      )}

      <div className="landing-bar">
        <button
          type="button"
          className="landing-icon-btn"
          aria-label="Attach a photo"
          onClick={() => fileRef.current?.click()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="1.5" />
            <circle cx="9" cy="10.5" r="1.4" />
            <path d="M21 16l-5.5-5.5-4 4L8 11l-5 5" />
          </svg>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="landing-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setImage({ name: f.name, url: URL.createObjectURL(f) });
          }}
        />

        <textarea
          name="q"
          rows={1}
          placeholder="Brand, model, anything you know…"
          defaultValue=""
          onInput={(e) => setTyped(e.currentTarget.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />

        <button type="submit" className="landing-icon-btn send" aria-label="Next">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12" />
            <polyline points="14 6 20 12 14 18" />
          </svg>
        </button>
      </div>

      {image && !typed.trim() && (
        <p className="small muted" style={{ margin: 0 }}>
          Emily will search from the file name — she cannot see the photo pixels yet.
        </p>
      )}
    </form>
  );
}
