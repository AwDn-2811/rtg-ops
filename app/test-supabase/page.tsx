
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RTGStatus = {
  id: number;
  unit_code: string;
  status: string;
};

export default function TestSupabase() {
  const [data, setData] = useState<RTGStatus[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("rtg_statuses")
        .select("*");

      if (error) {
        setError(error.message);
        return;
      }

      setData(data ?? []);
    }

    fetchData();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        Test Koneksi Supabase
      </h1>

      {error ? (
        <p className="text-red-500">
          Error: {error}
        </p>
      ) : (
        <pre className="mt-4">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}