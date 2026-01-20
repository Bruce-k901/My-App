"use client";

import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function TermsPage() {
  return (
    <MarketingSubPageLayout>
      <section className="max-w-3xl mx-auto text-left py-16 px-6 space-y-6">
        <h1 className="text-4xl font-bold">Terms of Use</h1>
        <p className="text-sm text-gray-400">Last updated: October 2025</p>

        {/* 1. Acceptance */}
        <div>
          <h2 className="text-xl font-semibold mb-2">1. Acceptance</h2>
          <p className="text-gray-300">
            By using Opsly ("the Service"), you agree to these Terms of Use. If you don’t agree,
            don’t use the platform.
          </p>
        </div>

        {/* 2. Service Description */}
        <div>
          <h2 className="text-xl font-semibold mb-2">2. Service Description</h2>
          <p className="text-gray-300">
            Opsly provides cloud-based operations management tools for
            hospitality, retail, and manufacturing businesses.
          </p>
          <p className="text-gray-300">
            We may update or improve the Service at any time, but we’ll avoid breaking changes
            without notice.
          </p>
        </div>

        {/* 3. Accounts */}
        <div>
          <h2 className="text-xl font-semibold mb-2">3. Accounts</h2>
          <p className="text-gray-300">You’re responsible for:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>Keeping your login credentials secure.</li>
            <li>Ensuring any information you provide is accurate.</li>
            <li>Any activity that occurs under your account.</li>
          </ul>
          <p className="text-gray-300">
            We may suspend or close accounts that violate these terms or applicable law.
          </p>
        </div>

        {/* 4. Subscriptions and Payment */}
        <div>
          <h2 className="text-xl font-semibold mb-2">4. Subscriptions and Payment</h2>
          <p className="text-gray-300 mb-3">
            <strong className="text-white">60-Day Free Trial:</strong> New accounts receive a 60-day free trial period. 
            No payment information is required during the trial. You can use all features of your selected plan during this period.
          </p>
          <p className="text-gray-300 mb-3">
            <strong className="text-white">Monthly Billing:</strong> After your trial ends, you will be invoiced monthly 
            via email. We use manual invoicing - no automatic payments are set up. Invoices are due within 30 days of issue.
          </p>
          <p className="text-gray-300 mb-3">
            <strong className="text-white">Cancellation:</strong> To cancel your subscription, you must provide 60 days 
            written notice via email to billing@opsly.app. Your subscription will remain active during the notice period, 
            and you will be invoiced for this period.
          </p>
          <p className="text-gray-300">
            Pricing and plans are published on our site and may change with notice. Changes to pricing will not affect 
            your current subscription until renewal.
          </p>
        </div>

        {/* 5. Acceptable Use */}
        <div>
          <h2 className="text-xl font-semibold mb-2">5. Acceptable Use</h2>
          <p className="text-gray-300">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>Copy, modify, or reverse-engineer any part of the Service.</li>
            <li>Upload unlawful, abusive, or misleading content.</li>
            <li>Interfere with other users or our systems.</li>
          </ul>
          <p className="text-gray-300">
            We reserve the right to suspend accounts engaged in misuse or security breaches.
          </p>
        </div>

        {/* 6. Intellectual Property */}
        <div>
          <h2 className="text-xl font-semibold mb-2">6. Intellectual Property</h2>
          <p className="text-gray-300">
            All Opsly trademarks, code, and design assets belong to us. You keep ownership of any
            content or data you upload, but grant us a licence to store and process it solely for
            operating the Service.
          </p>
        </div>

        {/* 7. Data Protection */}
        <div>
          <h2 className="text-xl font-semibold mb-2">7. Data Protection</h2>
          <p className="text-gray-300">
            Use of Opsly is also governed by our Privacy Policy. By using the Service, you consent
            to the collection and processing described there.
          </p>
        </div>

        {/* 8. Termination */}
        <div>
          <h2 className="text-xl font-semibold mb-2">8. Termination</h2>
          <p className="text-gray-300 mb-3">
            <strong className="text-white">Cancellation by You:</strong> You can cancel your subscription by providing 
            60 days written notice via email to billing@checkly.app. Your subscription will remain active during the 
            notice period, and you will be invoiced for this period.
          </p>
          <p className="text-gray-300 mb-3">
            <strong className="text-white">Data Export:</strong> Upon cancellation or termination, you may request a 
            full export of your data. We will provide your data in JSON format within 30 days of your request. 
            Data export requests can be made through your billing dashboard or by emailing support@opsly.app.
          </p>
          <p className="text-gray-300">
            We may terminate access if you breach these Terms or misuse the platform. Upon termination, your access 
            ends but relevant legal rights and obligations survive (e.g. unpaid fees, indemnities).
          </p>
        </div>

        {/* 9. Disclaimer */}
        <div>
          <h2 className="text-xl font-semibold mb-2">9. Disclaimer</h2>
          <p className="text-gray-300">
            Opsly is provided “as is.” We make no guarantees that the Service will be error-free or
            uninterrupted. We’re not liable for loss of profits, data, or business arising from your
            use of the Service.
          </p>
        </div>

        {/* 10. Limitation of Liability */}
        <div>
          <h2 className="text-xl font-semibold mb-2">10. Limitation of Liability</h2>
          <p className="text-gray-300">
            Our total liability for any claim shall not exceed the amount you paid for the Service in
            the past 12 months.
          </p>
        </div>

        {/* 11. Governing Law */}
        <div>
          <h2 className="text-xl font-semibold mb-2">11. Governing Law</h2>
          <p className="text-gray-300">
            These Terms are governed by the laws of England and Wales. Any disputes will be handled
            by the courts of London, UK.
          </p>
        </div>

        {/* 12. Contact */}
        <div>
          <h2 className="text-xl font-semibold mb-2">12. Contact</h2>
          <p className="text-gray-300">
            For legal notices or questions: {" "}
            <a className="text-magenta-400 hover:text-magenta-300" href="mailto:legal@opsly.app">
              legal@opsly.app
            </a>
          </p>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}