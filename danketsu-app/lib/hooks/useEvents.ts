"use client";

import { useEffect } from "react";
import { useEventStore } from "../stores/useEventStore";
import { supabase } from "../utils/supabaseClient";

export const useEvents = () => {
  const setEvents = useEventStore((state) => state.setEvents);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from("events").select("*");
      if (!error && data) {
        setEvents(data);
      }
    };
    fetchEvents();
  }, [setEvents]);
};

