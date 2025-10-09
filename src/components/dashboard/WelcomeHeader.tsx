"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WelcomeHeader() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");

  const supabase = createClientComponentClient();

  useEffect(() => {
    const tick = () => {
      setTime(format(new Date(), "HH:mm:ss"));
      setDate(format(new Date(), "EEEE, d MMMM yyyy"));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();
      if (profile?.first_name) setFirstName(profile.first_name);
    }
    fetchUser();
  }, []);

  return (
    <div className="text-white">
      {/* Centered Clock */}
      <div className="w-full flex justify-center mb-2">
        <div className="font-mono text-2xl tracking-widest text-pink-400 text-center">
          {time}
        </div>
      </div>
      {/* Welcome + Date below */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            Welcome{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-white/60 text-sm md:text-base">{date}</p>
        </div>
      </div>
    </div>
  );
}