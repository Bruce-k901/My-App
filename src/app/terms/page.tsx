"use client";

import { AppLayout } from "@/components/layouts";
import { Heading, Card } from "../../components/ui";

export default function TermsPage() {
  return (
    <AppLayout>
      <section className="section">
        <Card>
          <Heading level={2} className="mb-4 text-checkly-blue">
            Terms & Conditions
          </Heading>
          <p className="text-muted">
            This is a placeholder for your terms of service. Add information here about acceptable
            use, account responsibilities, and disclaimers once you have the final copy.
          </p>
        </Card>
      </section>
    </AppLayout>
  );
}
