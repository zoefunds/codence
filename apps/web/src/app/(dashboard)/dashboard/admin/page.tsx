"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAccessToken, getUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Users, CheckCircle, FileSearch, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const router = useRouter();
  const user = getUser();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) {
      router.replace("/dashboard");
      return;
    }
    loadData();
  }, [page]);

  async function loadData() {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [statsData, usersData]: any[] = await Promise.all([
        api.getAdminStats(token),
        api.getAdminUsers(page, token),
      ]);
      setStats(statsData);
      setUsers(usersData.users || []);
      setTotalPages(usersData.total_pages || 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.updateUserRole(userId, !currentIsAdmin, token);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u))
      );
      toast.success("Role updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to update role");
    }
  }

  if (!user?.is_admin) return null;

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Platform overview and user management.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_users ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified Users</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.verified_users ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_reviews ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_organizations ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="pb-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">Display Name</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">Verified</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">Admin</th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="pb-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/20">
                    <td className="py-3">{u.email}</td>
                    <td className="py-3">{u.display_name || "—"}</td>
                    <td className="py-3">
                      <Badge variant="outline">
                        {u.email_verified ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={u.is_admin ? "default" : "outline"}>
                        {u.is_admin ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant={u.is_admin ? "destructive" : "outline"}
                        onClick={() => toggleAdmin(u.id, u.is_admin)}
                      >
                        {u.is_admin ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
