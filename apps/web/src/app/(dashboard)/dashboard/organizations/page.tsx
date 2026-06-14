"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAccessToken, getUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Building2, Plus, Users, UserPlus, Trash2, Terminal } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function OrganizationsPage() {
  const user = getUser();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);

  async function loadOrgs() {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data: any = await api.listOrgs(token);
      setOrgs(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setCreating(true);
    try {
      await api.createOrg({ name, slug }, token);
      toast.success("Organization created!");
      setShowCreate(false);
      setName("");
      setSlug("");
      loadOrgs();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function loadMembers(orgId: string) {
    const token = getAccessToken();
    if (!token) return;
    setMembersLoading(true);
    try {
      const data: any = await api.listMembers(orgId, token);
      setMembers(data);
    } catch {
      // silent
    } finally {
      setMembersLoading(false);
    }
  }

  function handleOrgClick(org: any) {
    if (selectedOrg?.id === org.id) {
      setSelectedOrg(null);
      setMembers([]);
    } else {
      setSelectedOrg(org);
      loadMembers(org.id);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token || !selectedOrg) return;
    setInviting(true);
    try {
      await api.inviteMember(selectedOrg.id, { email: inviteEmail, role: inviteRole }, token);
      toast.success("Member invited!");
      setInviteEmail("");
      setInviteRole("viewer");
      loadMembers(selectedOrg.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    const token = getAccessToken();
    if (!token || !selectedOrg) return;
    try {
      await api.updateMemberRole(selectedOrg.id, memberId, newRole, token);
      toast.success("Role updated");
      loadMembers(selectedOrg.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to update role");
    }
  }

  async function handleRemove(memberId: string) {
    const token = getAccessToken();
    if (!token || !selectedOrg) return;
    if (!confirm("Remove this member?")) return;
    try {
      await api.removeMember(selectedOrg.id, memberId, token);
      toast.success("Member removed");
      loadMembers(selectedOrg.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to remove");
    }
  }

  const isOrgAdmin = selectedOrg && members.some(
    (m: any) => m.user_id === user?.id && (m.role === "owner" || m.role === "admin")
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold">Organizations</h1>
          <p className="font-mono text-sm text-muted-foreground">
            Manage your teams and workspaces.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Organization
        </Button>
      </div>

      {showCreate && (
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="font-mono text-base">Create Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")
                    );
                  }}
                  placeholder="Acme Corp"
                  className="font-mono text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs">Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="acme-corp"
                  className="font-mono text-sm"
                  required
                />
              </div>
              <Button type="submit" disabled={creating} className="font-mono text-sm">
                {creating ? "Creating..." : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="font-mono text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-4">
          {orgs.map((org: any) => (
            <div key={org.id}>
              <Card
                className={`cursor-pointer border-border/40 transition-colors hover:bg-muted/50 ${selectedOrg?.id === org.id ? "ring-2 ring-primary/20" : ""}`}
                onClick={() => handleOrgClick(org)}
              >
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium">{org.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      /{org.slug} &middot; {formatDate(org.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">{org.type}</Badge>
                </CardContent>
              </Card>

              {selectedOrg?.id === org.id && (
                <Card className="mt-2 border-border/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-mono text-base">
                      <Users className="h-4 w-4 text-primary" />
                      Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {membersLoading ? (
                      <p className="font-mono text-sm text-muted-foreground">Loading members...</p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {members.map((member: any) => (
                            <div key={member.id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                              <div>
                                <p className="font-mono text-sm font-medium">{member.display_name}</p>
                                <p className="font-mono text-xs text-muted-foreground">{member.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isOrgAdmin && member.role !== "owner" ? (
                                  <>
                                    <select
                                      value={member.role}
                                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                      className="h-8 rounded-md border border-border/40 bg-background px-2 font-mono text-xs"
                                    >
                                      <option value="admin">Admin</option>
                                      <option value="reviewer">Reviewer</option>
                                      <option value="viewer">Viewer</option>
                                    </select>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-red-600 hover:text-red-700"
                                      onClick={(e) => { e.stopPropagation(); handleRemove(member.id); }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <Badge variant="outline">{member.role}</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {isOrgAdmin && (
                          <form onSubmit={handleInvite} className="flex items-end gap-2 border-t border-border/40 pt-4">
                            <div className="flex-1 space-y-1">
                              <Label className="font-mono text-xs">Invite by email</Label>
                              <Input
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="user@example.com"
                                type="email"
                                required
                                className="h-9 font-mono text-sm"
                              />
                            </div>
                            <select
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value)}
                              className="h-9 rounded-md border border-border/40 bg-background px-2 font-mono text-sm"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="reviewer">Reviewer</option>
                              <option value="admin">Admin</option>
                            </select>
                            <Button type="submit" size="sm" className="h-9 font-mono text-xs" disabled={inviting}>
                              <UserPlus className="mr-1 h-3 w-3" />
                              {inviting ? "..." : "Invite"}
                            </Button>
                          </form>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
