import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth, DEMO_EMAIL, DEMO_PASSWORD } from "./AuthProvider";
import { AmbientScene } from "@/components/layout/AmbientScene";
import { LoginBackdrop } from "./LoginBackdrop";

export function LoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);

  React.useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  async function submit(e: React.FormEvent, demo = false) {
    e.preventDefault();
    setError(null);

    const emailValue = demo ? DEMO_EMAIL : email;
    const passwordValue = demo ? DEMO_PASSWORD : password;

    if (!emailValue.trim()) return setError("Enter your work email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim()))
      return setError("That does not look like a valid email address.");
    if (!passwordValue) return setError("Enter your password.");

    setBusy(true);
    const { error: signInError } = await signIn(emailValue, passwordValue, remember);
    setBusy(false);

    if (signInError) setError(signInError);
    else navigate("/dashboard", { replace: true });
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AmbientScene />
      {/* Brand panel — deliberately minimal: logo, product name, one line. */}
      <section className="relative z-10 hidden overflow-hidden bg-navy-900 lg:flex lg:flex-col lg:items-center lg:justify-between lg:p-10">
        <LoginBackdrop />

        <div className="relative z-10 flex animate-fade-up items-center gap-3">
          <span className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 shadow-lg">
            <img src="/brand/daikin-logo.png" alt="Daikin" className="h-7 w-auto" />
          </span>
        </div>

        {/* Centred hero. Type is a step larger than the form side so the panel
            leads the page rather than competing with it. */}
        <div className="relative z-10 flex max-w-2xl flex-col items-center px-4 text-center">
          <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.22em] text-white [animation-delay:80ms] [text-shadow:0_1px_14px_rgba(0,0,0,0.5)]">
            Competitive Marketing Intelligence
          </p>
          <h1 className="mt-4 animate-fade-up text-balance text-3xl font-bold leading-[1.15] text-white [animation-delay:180ms] [text-shadow:0_2px_20px_rgba(0,0,0,0.55)] xl:text-4xl">
            Turn verified product intelligence into market momentum.
          </h1>
          <p className="mt-4 animate-fade-up text-xl font-medium text-white/95 [animation-delay:300ms] [text-shadow:0_1px_14px_rgba(0,0,0,0.5)]">
            Compare. Position. Win.
          </p>
          {/* Accent rule expands out from the centre */}
          <div className="mt-7 h-px w-40 animate-[scale-in_0.7s_cubic-bezier(0.16,1,0.3,1)_440ms_backwards] bg-gradient-to-r from-transparent via-daikin-200 to-transparent" />
        </div>

        <p className="relative z-10 animate-fade-up text-center text-xs text-white/80 [animation-delay:520ms]">
          © Daikin — internal sales enablement
        </p>
      </section>

      {/* Form panel */}
      <section className="relative flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="surface w-full max-w-md animate-fade-up p-7 sm:p-9">
          <img src="/brand/daikin-logo.png" alt="Daikin" className="mb-8 h-8 w-auto lg:hidden" />

          <h2 className="text-3xl font-bold text-navy-900">Sign in</h2>
          <p className="mt-2 text-base text-navy-500">
            Access the competitive intelligence workspace for Daikin sales and product marketing.
          </p>

          <form className="stagger mt-8 space-y-5" onSubmit={(e) => submit(e)} noValidate>
            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-risk-500/25 bg-risk-50 px-4 py-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-risk-600" aria-hidden />
                <p className="text-sm font-medium text-risk-700">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@daikin.com"
                aria-invalid={Boolean(error)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  aria-invalid={Boolean(error)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-100 hover:text-navy-700"
                >
                  {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  aria-label="Remember me on this device"
                />
                <span className="text-sm font-medium text-navy-700">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="min-h-[44px] text-sm font-semibold text-daikin-700 hover:text-daikin-800 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Sign in
            </Button>
          </form>

          <div className={cn("mt-8 rounded-xl border border-edge bg-navy-50/70 p-4")}>
            <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Demo credentials</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-navy-500">Email</dt>
              <dd className="font-mono font-medium text-navy-800">{DEMO_EMAIL}</dd>
              <dt className="text-navy-500">Password</dt>
              <dd className="font-mono font-medium text-navy-800">{DEMO_PASSWORD}</dd>
            </dl>
          </div>
        </div>
      </section>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            Password resets for the competitive intelligence workspace are handled by Daikin IT through
            your normal single sign-on support channel. This demo environment does not send email.
          </DialogDescription>
          <p className="mt-4 rounded-xl bg-navy-50 p-4 text-sm text-navy-600">
            To explore the application now, use <strong>Use competition demo</strong> on the sign-in form.
          </p>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setForgotOpen(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
