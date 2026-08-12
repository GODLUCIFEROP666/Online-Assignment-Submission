import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      heading="Welcome to Online Assignment Submission Portal"
      description="Access your academic portal to submit, track, and grade assignments effortlessly with secure JWT authentication."
    >
      <LoginForm />
    </AuthCard>
  );
}

