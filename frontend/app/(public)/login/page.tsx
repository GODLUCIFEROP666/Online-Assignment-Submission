import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      heading="Sign in to FINAL2"
      description="Student and admin access will be routed through JWT-backed FastAPI authentication."
    >
      <LoginForm />
    </AuthCard>
  );
}
