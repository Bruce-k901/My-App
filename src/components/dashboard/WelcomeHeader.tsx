"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export default function WelcomeHeader() {
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const { session } = useAppContext();

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update date only on client
  useEffect(() => {
    if (!isMounted) return;
    
    const updateDate = () => {
      try {
        const now = new Date();
        setFormattedDate(format(now, "EEEE, d MMMM yyyy"));
      } catch (error) {
        console.error('Error formatting date:', error);
        setFormattedDate('');
      }
    };
    
    updateDate();
    const intervalId = setInterval(updateDate, 60000);
    
    return () => clearInterval(intervalId);
  }, [isMounted]);

  // Fetch user name
  useEffect(() => {
    if (!isMounted || !session?.user?.id) return;
    
    const fetchUserName = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (profile?.full_name) {
        const name = profile.full_name.split(" ")[0];
        setFirstName(name);
      }
    };
    fetchUserName();
  }, [session, isMounted]);

  return (
    <div className="text-white">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Welcome{firstName ? `, ${firstName}` : ""}
          </h1>
          <p 
            className="text-white/60 text-xs sm:text-sm md:text-base"
            suppressHydrationWarning
          >
            {isMounted && formattedDate ? formattedDate : "\u00A0"}
          </p>
        </div>
      </div>
    </div>
  );
}
