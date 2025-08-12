import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/customers", label: "Manage Customers" },
  { to: "/admin/seats", label: "Manage Seats" },
  { to: "/admin/destinations", label: "Manage Destinations" },
  { to: "/admin/pickups", label: "Manage Pickup Points" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/analytics", label: "Financial Analytics" },
  { to: "/admin/settings", label: "Settings" },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) navigate("/auth", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[240px_1fr]">
      <aside className="border-r bg-sidebar px-4 py-4 sm:py-6 lg:block hidden">
        <div className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">ATT Admin</div>
        <nav className="space-y-1 sm:space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end as any}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-foreground font-medium" : "hover:bg-sidebar-accent"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      
      {/* Mobile Navigation */}
      <div className="lg:hidden border-b bg-sidebar p-4">
        <div className="text-lg font-semibold mb-3">ATT Admin</div>
        <nav className="flex overflow-x-auto gap-2 pb-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end as any}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-xs transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-foreground font-medium" : "hover:bg-sidebar-accent"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      
      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
