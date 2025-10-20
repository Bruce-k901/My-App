"use client";

import SetupLayout from "@/components/setup/SetupLayout";
import { AppContextProvider } from "@/context/AppContext";
import CompanySetupWizard from "@/components/setup/CompanySetupWizard";

export default function CompanySetupPage() {
  return (
    <AppContextProvider>
      <SetupLayout stepLabel="Company Details — Step 1 of 5">
        <CompanySetupWizard />
      </SetupLayout>
    </AppContextProvider>
  );
}