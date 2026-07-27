import LoginCard from "../components/LoginCard";

export default function Login({ onLogin }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md animate-fade-in">
        <LoginCard onLogin={onLogin} />
      </div>
    </div>
  );
}
