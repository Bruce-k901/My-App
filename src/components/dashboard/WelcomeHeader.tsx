"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function WelcomeHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [firstName, setFirstName] = useState("");
  const { user, companyId } = useAuth();

  const tick = () => setCurrentTime(new Date());

  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchUser() {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) setFirstName(profile.full_name.split(" ")[0]);
    }
    fetchUser();
  }, [user]);

  return (
    <div className="text-white">
      {/* Centered Clock */}
      <div className="w-full flex justify-center mb-2">
        <div className="font-mono text-2xl tracking-widest text-pink-400 text-center">
          {format(currentTime, "HH:mm:ss")}
        </div>
      </div>
      {/* Welcome + Date below */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            Welcome{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-white/60 text-sm md:text-base">{format(currentTime, "EEEE, d MMMM yyyy")}</p>
        </div>
      </div>
    </div>
  );
}