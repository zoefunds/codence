"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAccessToken, getUser, setUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Shield, Wallet, Mail, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const user = getUser();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState((user?.display_name as string) || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    try {
      const updated: any = await api.updateMe({ display_name: displayName }, token);
      setUser(updated);
      toast.success("Profile updated");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and wallet.
        </p>
      </div>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{(user?.email as string) || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Display Name</span>
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-8 w-48"
                />
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "..." : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDisplayName((user?.display_name as string) || ""); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{(user?.display_name as string) || "—"}</span>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 px-2">
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Email Verified</span>
            <Badge variant="outline">
              {user?.email_verified ? "Verified" : "Pending"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Genlayer Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Address</span>
            <code className="text-xs">
              {(user?.wallet_address as string) || "Not provisioned"}
            </code>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Network</span>
            <span className="text-sm">Genlayer StudioNet</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Gas Token</span>
            <Badge variant="outline">GEN</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Plan</span>
            <Badge className="bg-primary/10 text-primary" variant="outline">
              Free
            </Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Billing and plan upgrades coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
