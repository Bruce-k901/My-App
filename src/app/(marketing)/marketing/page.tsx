import Link from "next/link";
import { Button } from "@/components/ui";

export default function MarketingPage() {
  return (
    <>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-10">
        <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">
          Turn <span className="text-checkly-blue">Chaos</span> into Clarity
        </h1>
        <p className="text-lg md:text-xl text-checkly-gray max-w-2xl mb-8">
          A system built for calm productivity. Components that make your interface effortless, your
          workflow precise, and your users happy.
        </p>
        <div className="flex gap-4">
          <Link href="/signup">
            <Button variant="primary">Get Started</Button>
          </Link>
          <Link href="/login">
            <Button variant="primary">Login</Button>
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-white py-10 border-t border-gray-200 text-checkly-dark">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-3">Modular Components</h3>
            <p className="text-checkly-gray">
              Build faster with consistent, reusable elements that stay in sync across every page.
            </p>
          </div>
          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-3">Zero Friction</h3>
            <p className="text-checkly-gray">
              Your UI works straight out of the box. No endless config tweaks or rebuild loops.
            </p>
          </div>
          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-3">Built to Scale</h3>
            <p className="text-checkly-gray">
              Expand easily. The same system that powers your MVP can handle your growth.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-checkly-dark text-checkly-light py-4">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>© {new Date().getFullYear()} MyApp. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}