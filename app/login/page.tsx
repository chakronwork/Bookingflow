"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");

      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      window.location.assign(safeNext);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "เข้าสู่ระบบไม่สำเร็จ");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f6] px-4 py-8">
      <form onSubmit={handleSubmit} className="kiosk-panel w-full max-w-md space-y-6 p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#147d78]">BookFlow</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">เข้าสู่ระบบจัดการคิว</h1>
          <p className="mt-2 text-sm text-slate-500">สำหรับเจ้าของกิจการและพนักงาน</p>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            อีเมล
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="kiosk-field mt-1 w-full px-3 py-2.5" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            รหัสผ่าน
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="kiosk-field mt-1 w-full px-3 py-2.5" />
          </label>
        </div>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="kiosk-primary w-full rounded-lg px-4 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}