import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      heading="Reset password"
      description="Matches the current email OTP reset workflow and is backed by the FastAPI password recovery endpoints."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
