"use client";

import { useState, useTransition } from "react";
import { loginAdmin } from "@/app/actions/admin";

export function AdminLoginForm() {
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const res = await loginAdmin(secret);
          if (!res.ok) {
            setMessage(res.error ?? "Login failed.");
            return;
          }
          window.location.reload();
        });
      }}
    >
      <div>
        <label htmlFor="admin-secret" className="mb-2 block text-sm font-medium text-[var(--muted)]">
          Admin secret
        </label>
        <input
          id="admin-secret"
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-white outline-none focus:border-[var(--accent)]"
        />
      </div>
      {message ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || secret.trim().length === 0}
        className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#052e16] hover:bg-[var(--accent-muted)] disabled:opacity-40"
      >
        {pending ? "Signing in..." : "Sign in as admin"}
      </button>
    </form>
  );
}
