const PRIORITY_COLOR = {
  high:     "bg-red-900/40   text-red-300   border border-red-700",
  medium:   "bg-yellow-900/40 text-yellow-300 border border-yellow-800",
  low:      "bg-green-900/40 text-green-300  border border-green-700",
  critical: "bg-red-900/40   text-red-300   border border-red-700",
};
const SEVERITY_COLOR = {
  Critical: "bg-red-900/40    text-red-300    border border-red-700",
  High:     "bg-orange-900/40 text-orange-300 border border-orange-700",
  Medium:   "bg-yellow-900/40 text-yellow-300 border border-yellow-800",
  Low:      "bg-green-900/40  text-green-300  border border-green-700",
};
const STATUS_COLOR = {
  Open:    "bg-blue-900/40   text-blue-300   border border-blue-800",
  Closed:  "bg-gray-800      text-gray-400   border border-gray-600",
  Pending: "bg-purple-900/40 text-purple-300 border border-purple-700",
};

function Badge({ label, colorMap }) {
  const cls = colorMap[label] ?? "bg-gray-800 text-gray-400 border border-gray-600";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function TicketsTable({ tickets }) {
  if (!tickets?.length)
    return <p className="text-gray-400 text-sm py-4">No tickets found.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700 shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
          <tr>
            {["Ticket ID", "Subject", "Category", "Priority", "Severity", "Status", "Created"].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700 bg-gray-900">
          {tickets.map((t) => (
            <tr key={t.ticket_id} className="hover:bg-gray-800 transition-colors">
              <td className="px-4 py-2 text-gray-400 font-mono text-xs">{t.ticket_id?.slice(0, 8)}…</td>
              <td className="px-4 py-2 font-medium text-gray-200 max-w-xs truncate">{t.subject || "—"}</td>
              <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{t.category}</td>
              <td className="px-4 py-2"><Badge label={t.priority} colorMap={PRIORITY_COLOR} /></td>
              <td className="px-4 py-2"><Badge label={t.severity} colorMap={SEVERITY_COLOR} /></td>
              <td className="px-4 py-2"><Badge label={t.status}   colorMap={STATUS_COLOR}   /></td>
              <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
