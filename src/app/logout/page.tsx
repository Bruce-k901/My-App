"use client";

import { AppLayout, AuthLayout } from "@/components/layouts";
import { Card, Heading, LinkButton } from "../../components/ui";

export default function LogoutPage() {
  return (
    <AuthLayout>
      <Card className="text-center">
        <Heading level={2} className="mb-4 text-checkly-blue">
          Logged Out
        </Heading>
        <p className="text-muted mb-6">You have been signed out successfully.</p>
        <LinkButton href="/login" variant="primary" fullWidth>
          Log In Again
        </LinkButton>
        <div className="mt-4">
          <LinkButton href="/" variant="secondary" fullWidth>
            Back to Home
          </LinkButton>
        </div>
      </Card>
    </AuthLayout>
  );
}
