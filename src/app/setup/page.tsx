"use client";

import CompanySetupWizard from "@/components/setup/CompanySetupWizard";
import { AppContextProvider } from "@/context/AppContext";

export default function SetupPage() {
  return (
    <AppContextProvider>
      <CompanySetupWizard />
    </AppContextProvider>
  );
}