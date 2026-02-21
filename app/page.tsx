import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <main className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-6 text-6xl">👶</div>
        <h1 className="mb-3 text-3xl font-bold tracking-tight">SoPersonal</h1>
        <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
          Your AI parenting companion. Get personalized advice grounded in
          evidence-based resources.
        </p>
        <Link
          href="/login"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-medium text-white transition-colors hover:bg-primary-light"
        >
          Start Chatting
        </Link>
      </main>
    </div>
  );
}
