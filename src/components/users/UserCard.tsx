"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Mail, Phone, MapPin, KeyRound, UserCircle2 } from "lucide-react";
import { useState } from "react";

export default function UserCard({ user }: { user: any }) {
  const [loginCode, setLoginCode] = useState<string | null>(null);

  const generateCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setLoginCode(code);
  };

  return (
    <Card className="bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all cursor-pointer border border-white/10 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-white">
          <UserCircle2 size={18} />
          {user.full_name || "Unnamed User"}
        </CardTitle>
      </CardHeader>

      <CardContent className="text-sm text-gray-200 space-y-2">
        <p>
          <Mail size={14} className="inline mr-1" />
          <a href={`mailto:${user.email}`} className="underline hover:text-white">
            {user.email}
          </a>
        </p>

        {user.phone_number && (
          <p>
            <Phone size={14} className="inline mr-1" />
            <a href={`tel:${user.phone_number}`} className="underline hover:text-white">
              {user.phone_number}
            </a>
          </p>
        )}

        {user.position_title && (
          <p>
            {user.position_title} — {user.boh_foh || "N/A"}
          </p>
        )}

        <p>Role: {user.role}</p>

        {user.home_site_id && (
          <p>
            <MapPin size={14} className="inline mr-1" />
            Home Site: {user.home_site_name || user.home_site_id}
          </p>
        )}

        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              generateCode();
            }}
            className="text-xs px-3 py-1 bg-pink-600/70 hover:bg-pink-600 rounded-lg text-white transition-colors"
          >
            Generate Code
          </button>

          {loginCode && <span className="font-mono text-pink-400 text-xs">{loginCode}</span>}
        </div>
      </CardContent>
    </Card>
  );
}