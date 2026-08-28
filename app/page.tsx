import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden px-5 py-6 sm:px-10 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight text-[#193332]">
            Book<span className="text-[#147d78]">Flow</span>
          </Link>
          <Link href="/login" className="kiosk-field inline-flex items-center px-4 text-sm font-semibold transition hover:border-[#147d78]">
            Dashboard login
          </Link>
        </nav>

        <section className="grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-[#147d78]">Booking, made clear</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-[#193332] sm:text-7xl">
              Give every appointment a better flow.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#5d716f]">
              A configurable booking and queue platform for salons, clinics, hospitals, and service teams.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/luxe-hair" className="kiosk-primary inline-flex min-h-12 items-center rounded-lg px-6 font-semibold shadow-sm transition hover:-translate-y-0.5">
                Try a booking demo
              </Link>
              <Link href="/dashboard" className="kiosk-field inline-flex min-h-12 items-center rounded-lg px-6 font-semibold transition hover:border-[#147d78]">
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="relative rounded-2xl border border-[#c5ddda] bg-[#e4f3f1] p-6 shadow-[0_20px_60px_rgba(25,51,50,0.10)] sm:p-8">
            <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full border-[10px] border-[#f4f7f6] bg-[#f4c95d]" />
            <p className="text-sm font-semibold text-[#5d716f]">Today at a glance</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-5">
                <p className="text-3xl font-semibold text-[#193332]">24</p>
                <p className="mt-1 text-sm text-[#5d716f]">Appointments</p>
              </div>
              <div className="rounded-xl bg-[#193332] p-5 text-white">
                <p className="text-3xl font-semibold">06</p>
                <p className="mt-1 text-sm text-[#c5ddda]">In the queue</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-white p-5">
              <div className="flex items-center justify-between border-b border-[#d7e1df] pb-4">
                <span className="font-semibold text-[#193332]">Next appointment</span>
                <span className="rounded-full bg-[#e4f3f1] px-3 py-1 text-xs font-bold text-[#147d78]">10:30 AM</span>
              </div>
              <p className="mt-4 text-lg font-semibold text-[#193332]">Signature haircut</p>
              <p className="mt-1 text-sm text-[#5d716f]">Luxe Hair Studio · Alex Morgan</p>
            </div>
          </div>
        </section>

        <section className="border-t border-[#d7e1df] py-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#147d78]">Explore the demos</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#193332]">One platform, different workflows.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#5d716f]">Each sample business uses the same system with its own services, staff, and booking configuration.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              ["Luxe Hair Studio", "Direct booking", "/luxe-hair"],
              ["Smile Dental Clinic", "Service-first booking", "/smile-dental"],
              ["City Central Hospital", "Department queue", "/city-hospital"],
            ].map(([name, flow, href]) => (
              <Link key={href} href={href} className="kiosk-panel group p-5 transition hover:-translate-y-1 hover:border-[#147d78]">
                <p className="text-lg font-semibold text-[#193332]">{name}</p>
                <p className="mt-2 text-sm text-[#5d716f]">{flow}</p>
                <span className="mt-6 inline-block text-sm font-bold text-[#147d78] group-hover:underline">Book a slot -&gt;</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
