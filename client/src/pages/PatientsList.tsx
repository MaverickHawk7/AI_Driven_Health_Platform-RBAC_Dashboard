import { useState, useEffect } from "react";
import { usePatients } from "@/hooks/use-resources";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/RiskBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Search, Filter, Plus, Trash2, Loader2 } from "lucide-react";

export default function PatientsList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"Low" | "Medium" | "High" | "All">("All");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canDelete = user?.role === "admin" || user?.role === "cdpo" || user?.role === "higher_official";

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: patients, isLoading } = usePatients({
    search: debouncedSearch || undefined,
    riskLevel: riskFilter === "All" ? undefined : riskFilter,
  });

  function openDeleteDialog(patientId: number, patientName: string) {
    setDeleteTarget({ id: patientId, name: patientName });
    setConfirmPassword("");
    setDeleteError("");
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
    setConfirmPassword("");
    setDeleteError("");
    setDeleteLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget || !confirmPassword) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/patients/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: confirmPassword }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(body.message);
      }

      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      toast({ title: "Patient Deleted", description: "Patient and all associated records have been removed." });
      closeDeleteDialog();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients Registry</h1>
          <p className="text-muted-foreground">Manage and view all registered patients.</p>
        </div>
        <Link href="/patients/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Register Patient
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter by Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Risks</SelectItem>
                  <SelectItem value="High">High Risk</SelectItem>
                  <SelectItem value="Medium">Medium Risk</SelectItem>
                  <SelectItem value="Low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading records...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Contact / Caregiver</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No patients found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
                {patients?.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{patient.id.toString().padStart(4, '0')}
                    </TableCell>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.ageMonths}m</TableCell>
                    <TableCell>{patient.caregiverName}</TableCell>
                    <TableCell className="text-muted-foreground">{patient.address || '-'}</TableCell>
                    <TableCell>
                      {(patient as any).latestRiskLevel
                        ? <RiskBadge level={(patient as any).latestRiskLevel} />
                        : <span className="text-xs text-muted-foreground">Not screened</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(patient.id, patient.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog with Password Re-entry */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient Record</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all associated records
              (screenings, interventions, consent records, alerts). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="confirm-password">Enter your password to confirm</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Your account password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setDeleteError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter" && confirmPassword) handleDelete(); }}
              autoFocus
            />
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmPassword || deleteLoading}
            >
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
