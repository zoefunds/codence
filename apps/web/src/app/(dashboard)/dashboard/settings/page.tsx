"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAccessToken, getUser, setUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Terminal, Wallet, Mail, Pencil, Key, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const user = getUser();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState((user?.display_name as string) || "");
  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exporting, setExporting] = useState(false);
  const [privateKey, setPrivateKey] = useState("");

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

  async function handleExportWallet(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setExporting(true);
    try {
      const data: any = await api.exportWallet(exportPassword, token);
      setPrivateKey(data.private_key);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to export wallet");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-2xl font-bold">Settings</h1>
        <p className="font-mono text-sm text-muted-foreground">
          Manage your account and wallet.
        </p>
      </div>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <Mail className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Email</span>
            <span className="font-mono text-sm">{(user?.email as string) || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Display Name</span>
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-8 w-48 font-mono text-sm"
                />
                <Button size="sm" onClick={handleSave} disabled={saving} className="font-mono text-xs">
                  {saving ? "..." : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDisplayName((user?.display_name as string) || ""); }} className="font-mono text-xs">
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{(user?.display_name as string) || "—"}</span>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 px-2">
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Verified</span>
            <Badge variant="outline" className="font-mono text-xs">
              {user?.email_verified ? "Verified" : "Pending"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <Wallet className="h-5 w-5 text-primary" />
            Genlayer Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Address</span>
            <code className="font-mono text-xs">
              {(user?.wallet_address as string) || "Not provisioned"}
            </code>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Network</span>
            <span className="font-mono text-sm">Genlayer StudioNet</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Gas Token</span>
            <Badge variant="outline" className="font-mono text-xs">GEN</Badge>
          </div>
          <div className="border-t border-border/40 pt-3">
            {!showExport ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowExport(true); setPrivateKey(""); setExportPassword(""); }}
                className="w-full font-mono text-xs"
              >
                <Key className="mr-2 h-3 w-3" />
                Export Private Key
              </Button>
            ) : privateKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={privateKey}
                    className="font-mono text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => { navigator.clipboard.writeText(privateKey); toast.success("Copied!"); }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive shrink-0" />
                  <p className="font-mono text-xs text-destructive">Never share your private key. Anyone with it can access your wallet.</p>
                </div>
                <Button variant="ghost" size="sm" className="w-full font-mono text-xs" onClick={() => { setShowExport(false); setPrivateKey(""); }}>
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleExportWallet} className="space-y-3">
                <Input
                  type="password"
                  placeholder="Enter your account password"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  className="font-mono text-sm"
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={exporting} className="flex-1 font-mono text-xs">
                    {exporting ? "Exporting..." : "Confirm"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowExport(false)} className="font-mono text-xs">
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <Terminal className="h-5 w-5" />
            Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Current Plan</span>
            <Badge className="bg-primary/10 text-primary font-mono text-xs" variant="outline">
              Free
            </Badge>
          </div>
          <p className="mt-4 font-mono text-sm text-muted-foreground">
            Billing and plan upgrades coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
