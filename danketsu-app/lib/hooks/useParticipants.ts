"use client";

import { useEffect } from "react";
import { useParticipantStore } from "../stores/useParticipantStore";
import { supabase } from "../utils/supabaseClient";

export const useParticipants = () => {
  const setParticipants = useParticipantStore((state) => state.setParticipants);

  useEffect(() => {
    const fetchParticipants = async () => {
      const { data, error } = await supabase.from("participants").select("*");
      if (!error && data) {
        setParticipants(data);
      }
    };
    fetchParticipants();
  }, [setParticipants]);
};

