"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Caught by GlobalError:", error);
  }, [error]);

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", color: "red" }}>
      <h2>Vercel Debug Error Page</h2>
      <p><strong>Error Message:</strong> {error.message}</p>
      <p><strong>Digest:</strong> {error.digest}</p>
      <pre style={{ background: "#f0f0f0", padding: "1rem", overflow: "auto" }}>
        {error.stack}
      </pre>
      <button onClick={() => reset()} style={{ marginTop: "1rem", padding: "0.5rem" }}>
        Try again
      </button>
    </div>
  );
}
