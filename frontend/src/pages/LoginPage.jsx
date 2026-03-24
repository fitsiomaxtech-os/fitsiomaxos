import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiLogin } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

const BG_IMAGE =
  "https://images.pexels.com/photos/62693/pexels-photo-62693.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@fitsiomax.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      onLogin(data);
      toast.success("Login successful");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white" data-testid="screen1-login-page">
      <img
        src={BG_IMAGE}
        alt="Minimal background"
        className="absolute inset-0 h-full w-full object-cover object-center"
        data-testid="screen1-login-background-image"
      />
      <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px]" data-testid="screen1-login-overlay" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 md:px-8 md:py-10">
        <Card
          className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(2,6,23,0.06)]"
          data-testid="screen1-login-card"
        >
          <CardHeader className="space-y-3 pb-2">
            <p
              className="text-xs uppercase tracking-[0.14em] text-sky-600"
              data-testid="screen1-login-brand-subtitle"
            >
              FITSIOMAX OS
            </p>
            <CardTitle className="font-heading text-4xl text-slate-900" data-testid="screen1-login-title">
              CRM View Login
            </CardTitle>
            <p className="text-sm text-slate-600" data-testid="screen1-login-description">
              Screen 1: Role Access login for Super Admin, Business Development, Pre-sales, Branch Admin,
              Head Physio, and Physio.
            </p>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit} data-testid="screen1-login-form">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" data-testid="screen1-login-email-label">
                  Email
                </label>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@fitsiomax.com"
                  className="border-slate-200 bg-white"
                  data-testid="screen1-login-email-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" data-testid="screen1-login-password-label">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="border-slate-200 bg-white"
                  data-testid="screen1-login-password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-500 text-white hover:bg-sky-600"
                data-testid="screen1-login-submit-button"
              >
                {loading ? "Signing in..." : "Continue"}
              </Button>
            </form>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3" data-testid="screen1-login-demo-box">
              <p className="text-xs text-slate-500" data-testid="screen1-login-demo-title">
                Demo users
              </p>
              <div className="mt-1 space-y-1 text-xs text-slate-600">
                <p data-testid="screen1-demo-super-admin">admin@fitsiomax.com / admin123</p>
                <p data-testid="screen1-demo-business-dev">businessdev@fitsiomax.com / bd123</p>
                <p data-testid="screen1-demo-pre-sales">presales@fitsiomax.com / presales123</p>
                <p data-testid="screen1-demo-branch-admin">branchadmin@fitsiomax.com / branch123</p>
                <p data-testid="screen1-demo-head-physio">headphysio@fitsiomax.com / head123</p>
                <p data-testid="screen1-demo-physio">physio@fitsiomax.com / physio123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
