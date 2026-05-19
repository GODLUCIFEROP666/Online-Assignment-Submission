import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/forms/login-form";

export default function AdminLoginPage() {
  return (
    <AuthCard
      heading="Admin access"
      description="Teacher and superadmin authentication will be separated from the student flow and backed by JWT plus role claims."
    >
      <LoginForm mode="admin" />
    </AuthCard>
  );
}
