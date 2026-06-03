import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      heading="Welcom to Online Assignment Submission Portel"

      description="Student and admin access will be routed through JWT-backed FastAPI authentication."
    >
      <LoginForm />
    </AuthCard>
  );
}
