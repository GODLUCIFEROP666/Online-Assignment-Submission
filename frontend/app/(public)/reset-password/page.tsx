import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      heading="Verify OTP"
      description="Enter the OTP returned by the backend and update your password through the FastAPI reset endpoint."
    >
      <Suspense fallback={<div className="text-center text-xs text-slate-400 py-6">Loading form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
