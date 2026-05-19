import { AuthCard } from "@/components/auth-card";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      heading="Student registration"
      description="This page preserves the current signup workflow: username checks, OTP verification, college/course selection, and final account creation."
    >
      <SignupForm />
    </AuthCard>
  );
}
