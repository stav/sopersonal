import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign In — SoPersonal",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 text-5xl">👶</div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to SoPersonal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to start chatting
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
