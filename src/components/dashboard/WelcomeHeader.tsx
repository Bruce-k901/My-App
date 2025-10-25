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