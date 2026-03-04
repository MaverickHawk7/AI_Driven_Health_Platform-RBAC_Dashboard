import { useUsers, useCreateUser, useUpdateUserRole, useDeleteUser, useAuditLogs, useAlertThresholds, useUpsertAlertThreshold, useAssignments, useCreateAssignment, useDeleteAssignment, useCenters } from "@/hooks/use-resources";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Shield, UserPlus, Edit2, CheckCircle2, ScrollText, Bell, Settings, AlertTriangle, Link2, Trash2, Building2, Users, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: auditLogs } = useAuditLogs();
  const { data: thresholds } = useAlertThresholds();
  const { mutate: upsertThreshold } = useUpsertAlertThreshold();
  const { mutate: createUser, isPending: isCreatingUser } = useCreateUser();
  const { mutate: updateUserRole, isPending: isUpdatingRole } = useUpdateUserRole();
  const { mutate: deleteUser } = useDeleteUser();
  const { data: assignments } = useAssignments();
  const { mutate: createAssignment, isPending: isCreatingAssignment } = useCreateAssignment();
  const { mutate: deleteAssignment } = useDeleteAssignment();
  const { data: centers } = useCenters();
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [auditFilter, setAuditFilter] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [expandedSupervisors, setExpandedSupervisors] = useState<Set<number>>(new Set());

  // Group assignments by supervisor for the Assignments tab
  const supervisorGroups = useMemo(() => {
    if (!assignments || !users || !centers) return [];
    const supervisors = (users as any[]).filter((u: any) => u.role === "supervisor");
    return supervisors.map((sup: any) => {
      const supAssignments = (assignments as any[]).filter((a: any) => a.supervisorId === sup.id);
      const assignedCenters = supAssignments.map((a: any) => {
        const center = (centers as any[]).find((c: any) => c.id === a.centerId);
        const fieldWorkers = (users as any[]).filter((u: any) => u.role === "field_worker" && u.centerId === a.centerId);
        return { assignment: a, center, fieldWorkers };
      }).filter((item: any) => item.center);
      return { supervisor: sup, assignedCenters };
    }).filter((g: any) => g.assignedCenters.length > 0 || true); // show all supervisors
  }, [assignments, users, centers]);

  // Centers available for the selected supervisor (not already assigned)
  const availableCenters = useMemo(() => {
    if (!centers || !assignments || !selectedSupervisorId) return [];
    const assignedCenterIds = (assignments as any[])
      .filter((a: any) => a.supervisorId === Number(selectedSupervisorId))
      .map((a: any) => a.centerId);
    return (centers as any[]).filter((c: any) => !assignedCenterIds.includes(c.id));
  }, [centers, assignments, selectedSupervisorId]);

  const toggleSupervisor = (id: number) => {
    setExpandedSupervisors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const adminCount = (users || []).filter((u: any) => u.role === "admin").length;

  const form = useForm({
    defaultValues: {
      name: "",
      username: "",
      password: "",
      role: "field_worker",
    }
  });

  const onSubmit = (data: any) => {
    if (editingUser) {
      updateUserRole(
        { id: editingUser.id, role: data.role, name: data.name },
        {
          onSuccess: () => {
            setIsAddUserOpen(false);
            setEditingUser(null);
            form.reset();
          },
        }
      );
    } else {
      if (!data.username || !data.password || !data.name) {
        toast({ title: "Error", description: "All fields are required", variant: "destructive" });
        return;
      }
      createUser(
        { username: data.username, password: data.password, name: data.name, role: data.role },
        {
          onSuccess: () => {
            setIsAddUserOpen(false);
            setEditingUser(null);
            form.reset();
          },
        }
      );
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      username: user.username,
      role: user.role,
    });
    setIsAddUserOpen(true);
  };

  const isLastAdmin = editingUser?.role === "admin" && adminCount <= 1;

  if (isLoading) return <div className="p-8">Loading admin panel...</div>;

  const filteredUsers = userRoleFilter && userRoleFilter !== "all"
    ? (users || []).filter((u: any) => u.role === userRoleFilter)
    : (users || []);

  const filteredLogs = auditFilter
    ? (auditLogs || []).filter((log: any) => log.resourceType === auditFilter)
    : (auditLogs || []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">Manage users, audit logs, and system configuration.</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="gap-2">
            <Settings className="w-3.5 h-3.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <Link2 className="w-3.5 h-3.5" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <ScrollText className="w-3.5 h-3.5" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="gap-2">
            <Bell className="w-3.5 h-3.5" />
            Alert Thresholds
          </TabsTrigger>
        </TabsList>

        {/* ── Users Tab ── */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-3">
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Filter by role..." />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="field_worker">Field Worker</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="cdpo">CDPO</SelectItem>
                <SelectItem value="dwcweo">DWCWEO</SelectItem>
                <SelectItem value="higher_official">Higher Official</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <UploadCloud className="w-4 h-4" />
              Upload Offline Data
            </Button>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => { setEditingUser(null); form.reset(); }}>
                  <UserPlus className="w-4 h-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit User Role" : "Create New User"}</DialogTitle>
                  <DialogDescription>
                    {editingUser ? "Change the role or details for this user." : "Fill in the details to add a new user to the system."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {isLastAdmin && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>This is the only administrator. Their role cannot be changed to prevent locking out admin access.</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...form.register("name", { required: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" {...form.register("username", { required: true })} disabled={!!editingUser} />
                  </div>
                  {!editingUser && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" {...form.register("password", { required: !editingUser })} placeholder="Min 4 characters" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="role">System Role</Label>
                    <Select
                      defaultValue={form.getValues("role")}
                      onValueChange={(val) => form.setValue("role", val)}
                      disabled={isLastAdmin}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="field_worker">Field Worker</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="cdpo">CDPO</SelectItem>
                        <SelectItem value="dwcweo">DWCWEO</SelectItem>
                        <SelectItem value="higher_official">Higher Official</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isUpdatingRole || isCreatingUser}>
                      {(isUpdatingRole || isCreatingUser) ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all system users and their unique IDs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found for the selected role.
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground uppercase">
                        USR-{user.id.toString().padStart(4, '0')}
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${
                          user.role === 'field_worker' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          user.role === 'supervisor' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          user.role === 'cdpo' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          user.role === 'dwcweo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          user.role === 'higher_official' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {user.role === 'field_worker' ? 'Field Worker' :
                           user.role === 'supervisor' ? 'Supervisor' :
                           user.role === 'cdpo' ? 'CDPO' :
                           user.role === 'dwcweo' ? 'DWCWEO' :
                           user.role === 'higher_official' ? 'Higher Official' :
                           'Administrator'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {user.role !== "admin" && user.id !== currentUser?.id && (
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setUserToDelete(user)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Delete User Confirmation Dialog */}
          <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete <strong>{userToDelete?.name}</strong> ({userToDelete?.username})? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteUser(userToDelete.id, { onSuccess: () => setUserToDelete(null) });
                  }}
                >
                  Delete User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Assignments Tab ── */}
        <TabsContent value="assignments" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Assign centers to supervisors. Field workers in those centers are automatically supervised.</p>
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => { setSelectedSupervisorId(""); setSelectedCenterId(""); }}>
                  <Building2 className="w-4 h-4" />
                  Assign Center
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Center to Supervisor</DialogTitle>
                  <DialogDescription>Select a supervisor and a center. All field workers in the center will automatically fall under this supervisor.</DialogDescription>
                </DialogHeader>
                {(() => {
                  const supervisors = (users || []).filter((u: any) => u.role === "supervisor");
                  const noSupervisors = supervisors.length === 0;
                  const noCenters = !centers || (centers as any[]).length === 0;
                  return (
                    <>
                      {(noSupervisors || noCenters) && (
                        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>
                            {noSupervisors && noCenters
                              ? "No supervisors or centers found. Create them first."
                              : noSupervisors
                              ? "No supervisors found. Create a supervisor in the Users tab first."
                              : "No centers found in the system."}
                          </span>
                        </div>
                      )}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Supervisor</Label>
                          <Select value={selectedSupervisorId} onValueChange={(val) => { setSelectedSupervisorId(val); setSelectedCenterId(""); }}>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select supervisor..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                              {supervisors.map((u: any) => (
                                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Center</Label>
                          <Select value={selectedCenterId} onValueChange={setSelectedCenterId} disabled={!selectedSupervisorId}>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder={selectedSupervisorId ? "Select center..." : "Select a supervisor first"} />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                              {availableCenters.length === 0 ? (
                                <div className="px-2 py-3 text-sm text-muted-foreground text-center">All centers already assigned to this supervisor</div>
                              ) : (
                                availableCenters.map((c: any) => (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name} — {c.block}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedCenterId && (() => {
                          const workers = (users || []).filter((u: any) => u.role === "field_worker" && u.centerId === Number(selectedCenterId));
                          if (workers.length === 0) return null;
                          return (
                            <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Field workers that will be auto-assigned:</p>
                              {workers.map((w: any) => (
                                <div key={w.id} className="flex items-center gap-2 text-sm">
                                  <Users className="w-3 h-3 text-blue-500" />
                                  {w.name}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <DialogFooter>
                        <Button
                          disabled={!selectedSupervisorId || !selectedCenterId || isCreatingAssignment}
                          onClick={() => {
                            createAssignment(
                              { supervisorId: Number(selectedSupervisorId), centerId: Number(selectedCenterId) },
                              {
                                onSuccess: () => {
                                  setIsAssignOpen(false);
                                  // Auto-expand the supervisor to show new assignment
                                  setExpandedSupervisors(prev => new Set(prev).add(Number(selectedSupervisorId)));
                                },
                              }
                            );
                          }}
                        >
                          {isCreatingAssignment ? "Assigning..." : "Assign Center"}
                        </Button>
                      </DialogFooter>
                    </>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </div>

          {supervisorGroups.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No supervisors found. Create a supervisor in the Users tab, then assign centers here.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {supervisorGroups.map(({ supervisor, assignedCenters }: any) => {
                const isExpanded = expandedSupervisors.has(supervisor.id);
                const totalWorkers = assignedCenters.reduce((sum: number, ac: any) => sum + ac.fieldWorkers.length, 0);
                return (
                  <Card key={supervisor.id}>
                    <button
                      className="w-full text-left"
                      onClick={() => toggleSupervisor(supervisor.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <div>
                              <CardTitle className="text-base">{supervisor.name}</CardTitle>
                              <CardDescription className="mt-0.5">
                                {assignedCenters.length} center{assignedCenters.length !== 1 ? "s" : ""} · {totalWorkers} field worker{totalWorkers !== 1 ? "s" : ""}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Supervisor
                          </Badge>
                        </div>
                      </CardHeader>
                    </button>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        {assignedCenters.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">No centers assigned yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {assignedCenters.map(({ assignment, center, fieldWorkers }: any) => (
                              <div key={assignment.id} className="rounded-lg border p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3">
                                    <Building2 className="w-4 h-4 mt-0.5 text-primary" />
                                    <div>
                                      <p className="font-medium text-sm">{center.name}</p>
                                      <p className="text-xs text-muted-foreground">{center.block} · {center.district}</p>
                                      {assignment.createdAt && (
                                        <p className="text-xs text-muted-foreground mt-0.5">Assigned {format(new Date(assignment.createdAt), "PP")}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={(e) => { e.stopPropagation(); deleteAssignment(assignment.id); }}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                {fieldWorkers.length > 0 && (
                                  <div className="mt-3 ml-7 space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto-assigned Field Workers</p>
                                    {fieldWorkers.map((fw: any) => (
                                      <div key={fw.id} className="flex items-center gap-2 text-sm">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-medium">
                                          {fw.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <span>{fw.name}</span>
                                        <Badge variant="outline" className="text-[10px] h-4 bg-blue-50 text-blue-700 border-blue-200">Field Worker</Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {fieldWorkers.length === 0 && (
                                  <p className="mt-3 ml-7 text-xs text-muted-foreground italic">No field workers in this center yet.</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Audit Logs Tab ── */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <div className="flex gap-3 items-center">
            <Select value={auditFilter} onValueChange={setAuditFilter}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Filter by type..." />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="consent">Consent</SelectItem>
                <SelectItem value="photo_analysis">Photo Analysis</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
                <SelectItem value="report">Report</SelectItem>
              </SelectContent>
            </Select>
            {auditFilter && auditFilter !== "all" && (
              <Button variant="ghost" size="sm" onClick={() => setAuditFilter("")} className="text-xs">
                Clear filter
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>System-wide log of all recorded actions for governance and compliance.</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No audit log entries found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource Type</TableHead>
                        <TableHead>Resource ID</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.slice(0, 50).map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {log.createdAt ? format(new Date(log.createdAt), "PPp") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${
                              log.action === "blocked" ? "bg-red-50 text-red-700 border-red-200" :
                              log.action === "create" ? "bg-green-50 text-green-700 border-green-200" :
                              log.action === "revoke" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-gray-50 text-gray-700 border-gray-200"
                            }`}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.resourceType}</TableCell>
                          <TableCell className="font-mono text-xs">{log.resourceId || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                            {log.details ? JSON.stringify(log.details) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Alert Thresholds Tab ── */}
        <TabsContent value="thresholds" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Threshold Configuration</CardTitle>
              <CardDescription>Configure when system alerts are triggered. Changes take effect immediately.</CardDescription>
            </CardHeader>
            <CardContent>
              {!thresholds || (thresholds as any[]).length === 0 ? (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">No custom thresholds configured. Default values are in use.</p>
                  <div className="space-y-4">
                    {[
                      { alertType: "missed_followup", thresholdKey: "days_since_screening", thresholdValue: "90", label: "Missed Follow-up (days)" },
                      { alertType: "regional_risk_spike", thresholdKey: "high_risk_percentage", thresholdValue: "50", label: "Regional Risk Spike (%)" },
                      { alertType: "no_improvement", thresholdKey: "min_screenings", thresholdValue: "2", label: "No Improvement (min screenings)" },
                    ].map((defaultThreshold) => (
                      <div key={`${defaultThreshold.alertType}-${defaultThreshold.thresholdKey}`} className="flex items-center gap-4 p-3 rounded-lg border">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{defaultThreshold.label}</p>
                          <p className="text-xs text-muted-foreground">{defaultThreshold.alertType} / {defaultThreshold.thresholdKey}</p>
                        </div>
                        <Input
                          className="w-24 text-center"
                          defaultValue={defaultThreshold.thresholdValue}
                          onBlur={(e) => {
                            if (e.target.value !== defaultThreshold.thresholdValue) {
                              upsertThreshold({
                                alertType: defaultThreshold.alertType,
                                thresholdKey: defaultThreshold.thresholdKey,
                                thresholdValue: e.target.value,
                                isActive: true,
                              });
                            }
                          }}
                        />
                        <Switch
                          defaultChecked={true}
                          onCheckedChange={(checked) => {
                            upsertThreshold({
                              alertType: defaultThreshold.alertType,
                              thresholdKey: defaultThreshold.thresholdKey,
                              thresholdValue: defaultThreshold.thresholdValue,
                              isActive: checked,
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(thresholds as any[]).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{t.alertType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{t.thresholdKey}</p>
                      </div>
                      <Input
                        className="w-24 text-center"
                        defaultValue={t.thresholdValue}
                        onBlur={(e) => {
                          if (e.target.value !== t.thresholdValue) {
                            upsertThreshold({
                              alertType: t.alertType,
                              thresholdKey: t.thresholdKey,
                              thresholdValue: e.target.value,
                              isActive: t.isActive ?? true,
                            });
                          }
                        }}
                      />
                      <Switch
                        checked={t.isActive ?? true}
                        onCheckedChange={(checked) => {
                          upsertThreshold({
                            alertType: t.alertType,
                            thresholdKey: t.thresholdKey,
                            thresholdValue: t.thresholdValue,
                            isActive: checked,
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
