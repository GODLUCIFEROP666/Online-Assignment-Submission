import { AuthCard } from "@/components/auth-card";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      heading="Student Registration Portal"
      description="Create your student account with real-time verification and instant access to assignment submissions."
    >
      <SignupForm />
    </AuthCard>
  );
}

