"use client";

import { AppLayout, AuthLayout } from "@/components/layouts";
import { Card, Heading, Input, LinkButton } from "../../components/ui";

export default function LoginPage() {
  return (
    <AuthLayout>
      <Card>
        <Heading level={2} className="mb-6 text-center text-checkly-blue">
          Log In
        </Heading>
        <form className="space-y-4">
          <Input type="email" placeholder="Email" />
          <Input type="password" placeholder="Password" />
          <div className="pt-4">
            <button type="submit" className="btn-primary w-full">
              Log In
            </button>
          </div>
        </form>
        <p className="text-sm text-muted mt-6 text-center">
          Don’t have an account?{" "}
          <LinkButton href="/signup" variant="secondary">
            Sign Up
          </LinkButton>
        </p>
      </Card>
    </AuthLayout>
  );
}
