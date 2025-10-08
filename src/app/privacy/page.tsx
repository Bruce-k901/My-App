"use client";

import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function PrivacyPage() {
  return (
    <MarketingSubPageLayout>
      <section className="max-w-3xl mx-auto text-left py-16 px-6 space-y-6">
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-gray-400">Last updated: October 2025</p>

        {/* 1. Overview */}
        <div>
          <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
          <p className="text-gray-300">
            Checkly (“we”, “our”, “us”) provides digital tools that help hospitality businesses
            stay compliant, organised, and productive. This Privacy Policy explains how we collect,
            use, and protect your information when you use our website and app.
          </p>
        </div>

        {/* 2. Information We Collect */}
        <div>
          <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
          <p className="text-gray-300">We collect:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>
              <span className="font-medium text-white">Account data:</span> name, email address,
              business name, and password.
            </li>
            <li>
              <span className="font-medium text-white">Usage data:</span> activity within the app,
              device type, browser, and IP address.
            </li>
            <li>
              <span className="font-medium text-white">Support data:</span> messages or attachments
              you send to our support team.
            </li>
          </ul>
          <p className="text-gray-300">We don’t knowingly collect data from anyone under 16.</p>
        </div>

        {/* 3. How We Use Information */}
        <div>
          <h2 className="text-xl font-semibold mb-2">3. How We Use Information</h2>
          <p className="text-gray-300">We use your information to:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>Provide and improve our services.</li>
            <li>Communicate updates, security notices, and support messages.</li>
            <li>Diagnose issues, analyse trends, and enhance user experience.</li>
            <li>Comply with legal and accounting requirements.</li>
          </ul>
          <p className="text-gray-300">We do not sell or rent your data to anyone.</p>
        </div>

        {/* 4. Legal Basis */}
        <div>
          <h2 className="text-xl font-semibold mb-2">4. Legal Basis</h2>
          <p className="text-gray-300">Processing is based on:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>Performance of a contract (your account and subscription).</li>
            <li>Legitimate interest (analytics, fraud prevention).</li>
            <li>Consent (marketing emails, if you opt in).</li>
          </ul>
        </div>

        {/* 5. Data Storage and Security */}
        <div>
          <h2 className="text-xl font-semibold mb-2">5. Data Storage and Security</h2>
          <p className="text-gray-300">
            Your data is stored securely on trusted cloud infrastructure providers. We use
            encryption in transit and at rest, restricted admin access, and continuous monitoring.
          </p>
          <p className="text-gray-300">
            If we ever learn of a breach affecting your data, we’ll notify you promptly in line
            with applicable law.
          </p>
        </div>

        {/* 6. Sharing Information */}
        <div>
          <h2 className="text-xl font-semibold mb-2">6. Sharing Information</h2>
          <p className="text-gray-300">
            We may share limited data with service providers who help us run Checkly (for example,
            hosting, email delivery, analytics). Each acts under strict data-processing terms.
          </p>
          <p className="text-gray-300">
            If Checkly is ever acquired or merges with another business, we’ll ensure your rights
            remain protected and notify you before any transfer.
          </p>
        </div>

        {/* 7. Your Rights */}
        <div>
          <h2 className="text-xl font-semibold mb-2">7. Your Rights</h2>
          <p className="text-gray-300">Depending on where you live, you may have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>Access or request a copy of your data.</li>
            <li>Ask us to correct or delete it.</li>
            <li>Object to certain processing.</li>
            <li>Withdraw consent (for marketing, etc.).</li>
          </ul>
          <p className="text-gray-300">
            Contact us at {" "}
            <a className="text-magenta-400 hover:text-magenta-300" href="mailto:privacy@checkly.app">
              privacy@checkly.app
            </a>{" "}
            to exercise any of these rights.
          </p>
        </div>

        {/* 8. Data Retention */}
        <div>
          <h2 className="text-xl font-semibold mb-2">8. Data Retention</h2>
          <p className="text-gray-300">
            We keep your information only as long as your account is active or as needed to meet
            legal obligations. You can delete your account at any time from your profile settings.
          </p>
        </div>

        {/* 9. Cookies */}
        <div>
          <h2 className="text-xl font-semibold mb-2">9. Cookies</h2>
          <p className="text-gray-300">
            We use cookies for authentication, preferences, and analytics. You can adjust your
            browser to refuse cookies, but some parts of Checkly may not function properly.
          </p>
        </div>

        {/* 10. Contact */}
        <div>
          <h2 className="text-xl font-semibold mb-2">10. Contact</h2>
          <p className="text-gray-300">
            If you have questions or complaints about this policy, email {" "}
            <a className="text-magenta-400 hover:text-magenta-300" href="mailto:privacy@checkly.app">
              privacy@checkly.app
            </a>
            .
          </p>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
