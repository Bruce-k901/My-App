export default function Footer() {
  return (
    <footer className="global-footer w-full py-6 border-t border-white/10 text-center text-sm text-gray-400 bg-transparent">
      <p>© {new Date().getFullYear()} Checkly. All rights reserved.</p>
      <div className="mt-2 space-x-4">
        <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
        <a href="/terms" className="hover:text-white transition-colors">Terms of Use</a>
      </div>
    </footer>
  );
}