import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Briefcase,
  Building2,
  Headphones,
  LogOut,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "@/components/ui/sonner";
import { apiLogout, getRoleSelectionMock } from "@/lib/api";

const roles = [
  {
    key: "super_admin",
    title: "Super Admin",
    description: "Controls full system setup and permissions.",
    icon: ShieldCheck,
  },
  {
    key: "business_dev",
    title: "Business Dev",
    description: "Manages Google Sheets connections and mapping.",
    icon: Briefcase,
  },
  {
    key: "pre_sales",
    title: "Pre-sales",
    description: "Qualifies leads before branch assignment.",
    icon: Headphones,
  },
  {
    key: "branch_admin",
    title: "Branch Admin",
    description: "Confirms leads and books branch appointments.",
    icon: Building2,
  },
  {
    key: "head_physio",
    title: "Head Physio",
    description: "Tracks new and today appointments.",
    icon: Stethoscope,
  },
  {
    key: "physio",
    title: "Physio",
    description: "Handles patient appointments and completion.",
    icon: Activity,
  },
];

export const CRMPage = ({ auth, onLogout }) => {
  const [mockData, setMockData] = useState({ leads_preview: [] });

  const currentRole = useMemo(() => auth?.user?.role, [auth]);

  useEffect(() => {
    const loadMock = async () => {
      try {
        const data = await getRoleSelectionMock();
        setMockData(data);
      } catch {
        setMockData({ leads_preview: [] });
      }
    };
    loadMock();
  }, []);

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // fallback
    }
    onLogout();
  };

  const enterRole = (roleKey) => {
    if (roleKey !== currentRole) {
      toast.error("This login has access only to its own role dashboard.");
      return;
    }
    toast.success(`Screen 1 complete: ${roleKey} access is verified.`);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6 md:px-8 md:py-10" data-testid="screen1-role-page">
      <Toaster richColors position="top-right" />

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="screen1-role-header">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-sky-600" data-testid="screen1-role-subtitle">
                FITSIOMAX OS
              </p>
              <h1 className="font-heading text-4xl text-slate-900" data-testid="screen1-role-title">
                Role Access Selection
              </h1>
              <p className="text-sm text-slate-600" data-testid="screen1-role-active-user">
                Logged in user: <strong>{auth.user.full_name}</strong> · Active role: <strong>{currentRole}</strong>
              </p>
            </div>

            <Button
              variant="outline"
              onClick={logout}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              data-testid="screen1-role-logout-button"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </header>

        <section
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          data-testid="screen1-role-grid"
        >
          {roles.map((role) => {
            const Icon = role.icon;
            const active = role.key === currentRole;
            return (
              <button
                key={role.key}
                type="button"
                onClick={() => enterRole(role.key)}
                className={`rounded-xl border p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                  active
                    ? "border-sky-500 bg-sky-50"
                    : "border-slate-200 bg-white hover:border-sky-300"
                }`}
                data-testid={`screen1-role-card-${role.key}`}
              >
                <div className="mb-3 inline-flex rounded-lg bg-sky-100 p-2 text-sky-600" data-testid={`screen1-role-icon-${role.key}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-heading text-xl text-slate-900" data-testid={`screen1-role-title-${role.key}`}>
                  {role.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600" data-testid={`screen1-role-description-${role.key}`}>
                  {role.description}
                </p>
                <p
                  className={`mt-3 text-xs font-medium ${active ? "text-sky-700" : "text-slate-500"}`}
                  data-testid={`screen1-role-status-${role.key}`}
                >
                  {active ? "Current login role" : "Locked for current login"}
                </p>
              </button>
            );
          })}
        </section>

        <Card className="border border-slate-200 bg-white" data-testid="screen1-mock-data-card">
          <CardHeader>
            <CardTitle className="text-base text-slate-900" data-testid="screen1-mock-data-title">
              Google Sheet Mock Preview (for next screen)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre
              className="overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
              data-testid="screen1-mock-data-json"
            >
              {JSON.stringify(mockData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
