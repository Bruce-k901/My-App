import CompanySearchBar from "@/components/CompanySearchBar";

export default function TestSearchPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Company Search Test</h1>
        
        <div className="relative z-10 max-w-md">
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Search for a company:
          </label>
          <CompanySearchBar />
        </div>
        
        <div className="mt-8 text-sm text-gray-600">
          <p>Try typing a company name to see the live search in action.</p>
          <p>The search will query the contractors table for partial matches.</p>
        </div>
      </div>
    </div>
  );
}