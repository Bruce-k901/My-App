"use client";

import React from "react";

interface OrganizationPageLayoutProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  searchBar?: React.ReactNode;
}

export default function OrganizationPageLayout({
  title,
  actions,
  children,
  searchBar,
}: OrganizationPageLayoutProps) {
  return (
    <div className="pt-4 px-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>

        {/* Actions like Add/Upload/Download */}
        <div className="flex flex-wrap gap-3">{actions}</div>
      </div>

      {/* Search bar if provided */}
      {searchBar && <div className="max-w-md">{searchBar}</div>}

      {/* Main content */}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}