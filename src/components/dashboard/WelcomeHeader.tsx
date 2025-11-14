"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export default function WelcomeHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [firstName, setFirstName] = useState("");
  const { session, companyId } = useAppContext();

  const tick = () => setCurrentTime(new Date());

  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!session?.user?.id) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.full_name) {
        const name = profile.full_name.split(" ")[0];
        setFirstName(name);
      }
    };
    fetchUserName();
  }, [session]);

  return (
    <div className="text-white">
      {/* Welcome + Date */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Welcome{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-white/60 text-xs sm:text-sm md:text-base">{format(currentTime, "EEEE, d MMMM yyyy")}</p>
        </div>
      </div>
    </div>
  );
}