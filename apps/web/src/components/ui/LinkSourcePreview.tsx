import { useEffect, useState } from "react";

/** Parses a URL, accepting only http(s) — returns null for anything else (including plain text). */
function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function toDomain(hostname: string): string {
  return hostname.replace(/^www\./i, "");
}

function toReadableName(domain: string): string {
  const label = domain.split(".")[0] || domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** A small "which website is this" chip for an Import Request link — favicon,
 * a readable site name, and the bare domain. Renders nothing for a URL that
 * isn't valid http(s) yet, so it's safe to use while the user is still typing. */
export function LinkSourcePreview({ url }: { url: string }) {
  const parsed = parseHttpUrl(url);
  const domain = parsed ? toDomain(parsed.hostname) : null;
  const [faviconFailed, setFaviconFailed] = useState(false);

  useEffect(() => setFaviconFailed(false), [domain]);

  if (!domain) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1.5">
      {faviconFailed ? (
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M3 12h18M12 3c2.5 2.5 3.75 5.75 3.75 9S14.5 18.5 12 21c-2.5-2.5-3.75-5.75-3.75-9S9.5 5.5 12 3Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </span>
      ) : (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full"
          onError={() => setFaviconFailed(true)}
        />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-neutral-900">{toReadableName(domain)}</p>
        <p className="truncate text-xs text-neutral-500">{domain}</p>
      </div>
    </div>
  );
}
