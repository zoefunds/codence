"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { setTokens, setUser } from "@/lib/auth";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    password: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data: any = await api.signup(form);
      setTokens(data.tokens.access_token, data.tokens.refresh_token);
      setUser(data.user);
      toast.success("Account created! A wallet has been provisioned for you.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/40">
        <CardHeader className="text-center">
          <Link
            href="/"
            className="mb-4 inline-flex items-center justify-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Terminal className="h-4 w-4" />
            </div>
            <span className="font-mono text-2xl font-bold">Codence</span>
          </Link>
          <CardTitle className="font-mono text-lg">
            Create your account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-mono text-xs">
                Display name
              </Label>
              <Input
                id="name"
                placeholder="Jane Developer"
                value={form.display_name}
                onChange={(e) => update("display_name", e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-xs">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-mono text-xs">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground">
            A Genlayer wallet will be automatically created for your account.
          </p>
          <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
