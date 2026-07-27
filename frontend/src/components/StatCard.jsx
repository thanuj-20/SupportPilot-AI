export default function StatCard({ title, value, color = "blue" }) {
  const colors = {
    blue:   "bg-blue-900/30   border-blue-700   text-blue-400",
    green:  "bg-green-900/30  border-green-700  text-green-400",
    red:    "bg-red-900/30    border-red-700    text-red-400",
    purple: "bg-purple-900/30 border-purple-700 text-purple-400",
    orange: "bg-orange-900/30 border-orange-700 text-orange-400",
  };
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${colors[color] ?? colors.blue}`}>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className="text-3xl font-bold mt-1 text-white">{value ?? "—"}</p>
    </div>
  );
}
