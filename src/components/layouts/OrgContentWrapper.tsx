export default function OrgContentWrapper({ title, actions, search, children }: { title: string; actions?: React.ReactNode; search?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 px-6 pb-10 pt-4">
      {/* Title + Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>

      {/* Optional Search Bar */}
      {search && <div className="max-w-md">{search}</div>}

      {/* Divider (optional for cleaner visual separation) */}
      <div className="h-[1px] w-full bg-gray-800/40" />

      {/* Main Content */}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}