"use client";

import { AppLayout } from "@/components/layouts";
import { Heading, Card } from "../../components/ui";

export default function PrivacyPage() {
  return (
    <AppLayout>
      <section className="section">
        <Card>
          <Heading level={2} className="mb-4 text-checkly-blue">
            Privacy Policy
          </Heading>
          <p className="text-muted">
            This is a placeholder for your privacy policy. Add details here about how you handle
            user data, security, and compliance once you have the final text.
          </p>
        </Card>
      </section>
    </AppLayout>
  );
}
