import { useAuth } from "@/hooks/use-auth";
import { useUpdateUserRole } from "@/hooks/use-update-user-role";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Users, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

interface User {
  id: number;
  email: string;
  name: string;
  role: "Employee" | "Manager" | "Head Authority";
  department: string;
}

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({});
  const updateRole = useUpdateUserRole();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/users", { credentials: "include" });
        if (!response.ok) {
          if (response.status === 403) {
            setError("You don't have permission to view users");
          } else {
            throw new Error("Failed to fetch users");
          }
          return;
        }
        const data = await response.json();
        setUsers(data);
        // Initialize selected roles with current roles
        const rolesMap: Record<number, string> = {};
        data.forEach((u: User) => {
          rolesMap[u.id] = u.role;
        });
        setSelectedRoles(rolesMap);
      } catch (err) {
        console.error("Failed to fetch users", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.role === "Head Authority") {
      fetchUsers();
    }
  }, [user]);

  const handleRoleChange = (userId: number, newRole: string) => {
    if (userId === user?.id) {
      alert("You cannot change your own role");
      return;
    }
    setSelectedRoles({ ...selectedRoles, [userId]: newRole });
  };

  const handleSaveRole = (userId: number) => {
    const newRole = selectedRoles[userId];
    const originalRole = users.find(u => u.id === userId)?.role;
    if (newRole === originalRole) {
      return;
    }
    updateRole.mutate({ userId, role: newRole }, {
      onSuccess: () => {
        // Update the local users list
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      }
    });
  };

  if (user?.role !== "Head Authority") {
    return (
      <LayoutShell>
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to manage users. Only Head Authority users can perform this action.
            </AlertDescription>
          </Alert>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8" /> User Management
          </h2>
          <p className="text-muted-foreground">Manage user roles and permissions across the system.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Change user roles to Employee, Manager, or Head Authority. You cannot change your own role for security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found in the system.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>New Role</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const isCurrentUser = u.id === user?.id;
                      const roleChanged = selectedRoles[u.id] !== u.role;
                      return (
                        <TableRow key={u.id} className={isCurrentUser ? "bg-slate-50 dark:bg-slate-800/50" : ""}>
                          <TableCell className="font-medium">
                            {u.name}
                            {isCurrentUser && <Badge variant="outline" className="ml-2">You</Badge>}
                          </TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell className="text-sm">{u.department || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{u.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={selectedRoles[u.id] || u.role}
                              onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                              disabled={isCurrentUser}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Employee">Employee</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                                <SelectItem value="Head Authority">Head Authority</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleSaveRole(u.id)}
                              disabled={
                                isCurrentUser ||
                                !roleChanged ||
                                updateRole.isPending
                              }
                              className="gap-2"
                            >
                              {updateRole.isPending && u.id === (updateRole as any).variables?.userId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              Save
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Role Descriptions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-3">
            <div>
              <p className="font-semibold">👤 Employee</p>
              <p>Can create, edit, and submit drafts for approval. Cannot approve or access admin features.</p>
            </div>
            <div>
              <p className="font-semibold">👔 Manager</p>
              <p>Can approve/reject pending drafts and view activity logs and user management.</p>
            </div>
            <div>
              <p className="font-semibold">🔐 Head Authority</p>
              <p>Full system access. Can approve drafts, manage users, and view all audit logs. Submissions are auto-approved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
