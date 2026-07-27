import { useState, useEffect } from "react";
import TicketsTable from "../components/TicketsTable";
import { getTickets } from "../services/api";

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [skip,    setSkip]    = useState(0);
  const [loading, setLoading] = useState(false);
  const LIMIT = 50;

  const fetch = async (s) => {
    setLoading(true);
    try {
      const res = await getTickets(s, LIMIT);
      setTickets(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(skip); }, [skip]);

  return (
    <div className="p-6 space-y-4 bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-bold text-white">All Tickets</h1>
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : <TicketsTable tickets={tickets} />}
      <div className="flex gap-3">
        <button
          disabled={skip === 0}
          onClick={() => setSkip(Math.max(0, skip - LIMIT))}
          className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700"
        >
          ← Prev
        </button>
        <button
          disabled={tickets.length < LIMIT}
          onClick={() => setSkip(skip + LIMIT)}
          className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
