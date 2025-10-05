"use client";

import { AppLayout, AuthLayout } from "@/components/layouts";
import { Card, Heading, Input, LinkButton } from "../../components/ui";

export default function SignupPage() {
  return (
    <AuthLayout>
      <Card>
        <Heading level={2} className="mb-6 text-center text-checkly-blue">
          Sign Up
        </Heading>
        <form className="space-y-4">
          <Input type="text" placeholder="Full Name" />
          <Input type="email" placeholder="Email" />
          <Input type="password" placeholder="Password" />
          <div className="pt-4">
            <button type="submit" className="btn-primary w-full">
              Create Account
            </button>
          </div>
        </form>
        <p className="text-sm text-muted mt-6 text-center">
          Already have an account?{" "}
          <LinkButton href="/login" variant="secondary">
            Log In
          </LinkButton>
        </p>
      </Card>
    </AuthLayout>
  );
}
