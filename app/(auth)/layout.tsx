/**
 * Auth Group Layout
 *
 * Provides the full-screen background and centered flex container for
 * /login and /signup pages. The form cards are rendered in the center
 * with a layered gradient background for visual depth.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      {/* Layered gradient background */}
      <div
        className="fixed inset-0 -z-10"
        style={{ background: "var(--color-surface-bg)" }}
        aria-hidden="true"
      >
        {/* Primary gradient orb — top left */}
        <div
          className="absolute -top-64 -left-64 h-[600px] w-[600px] rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, var(--color-brand-primary), transparent 70%)",
          }}
        />
        {/* Secondary gradient orb — bottom right */}
        <div
          className="absolute -right-64 -bottom-64 h-[500px] w-[500px] rounded-full opacity-15 blur-3xl"
          style={{
            background: "radial-gradient(circle, var(--color-brand-secondary), transparent 70%)",
          }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {children}
    </div>
  );
}
