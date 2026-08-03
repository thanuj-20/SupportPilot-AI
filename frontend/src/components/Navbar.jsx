import { NavLink } from "react-router-dom";

const links = [
  { to: "/",            label: "Dashboard"      },
  { to: "/tickets",     label: "Tickets"        },
  { to: "/predict",     label: "Predict"        },
  { to: "/knowledge",   label: "Knowledge Base" },
  { to: "/workflow",    label: "Workflow"        },
  { to: "/wf-monitor",  label: "WF Monitor"     },
  { to: "/escalations", label: "Escalations"    },
  { to: "/jira",        label: "Jira"           },
  { to: "/emails",      label: "Emails"         },
  { to: "/integrations",label: "Integrations"   },
];

export default function Navbar({ onLogout, theme, onToggleTheme }) {
  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center gap-8 shadow-md">
      <span className="text-xl font-bold text-blue-400">SupportPilot</span>

      <div className="flex items-center gap-6 flex-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive ? "text-blue-400" : "text-gray-300 hover:text-white"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>

      {/* User info + theme toggle + Logout */}
      <div className="flex items-center gap-3 ml-auto">

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 hover:border-blue-500 text-gray-400 hover:text-white transition-colors"
        >
          {theme === "dark" ? (
            /* Sun icon — click to go light */
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71m12.02 0-.71-.71M6.34 6.34l-.71-.71M12 7a5 5 0 100 10A5 5 0 0012 7z" />
            </svg>
          ) : (
            /* Moon icon — click to go dark */
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm text-gray-300 font-medium">Admin</span>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </nav>
  );
}
