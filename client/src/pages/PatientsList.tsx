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
import { Search, Filter, Plus, Trash2, Loader2, UserPlus } from "lucide-react";
import { T, useLanguage } from "@/hooks/use-language";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientsList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"Low" | "Medium" | "High" | "All">("All");
  const { user } = useAuth();
  const { t } = useLanguage();
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
      toast({ title: t("Patient Deleted"), description: t("Patient and all associated records have been removed.") });
      closeDeleteDialog();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight"><T>Patient Registry</T></h1>
          <p className="text-muted-foreground"><T>Manage and view all registered patients.</T></p>
        </div>
        <Link href="/patients/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <T>Register Patient</T>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search patients by name...")}
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder={t("Filter by Risk")} />
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
            <div className="space-y-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-8 w-14 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead><T>Patient Name</T></TableHead>
                  <TableHead><T>Age</T></TableHead>
                  <TableHead><T>Contact / Caregiver</T></TableHead>
                  <TableHead><T>Location</T></TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-center"><T>Action</T></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <UserPlus className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground"><T>No patients found matching your criteria.</T></p>
                          <p className="text-sm text-muted-foreground mt-1">{debouncedSearch || riskFilter !== "All" ? t("Try adjusting your search or filters.") : t("Register your first patient to get started.")}</p>
                        </div>
                        {!debouncedSearch && riskFilter === "All" && (
                          <Link href="/patients/new">
                            <Button size="sm" className="mt-1 gap-1.5"><Plus className="w-3.5 h-3.5" /><T>Register Patient</T></Button>
                          </Link>
                        )}
                      </div>
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
                        : <span className="text-xs text-muted-foreground"><T>Not screened</T></span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm"><T>View</T></Button>
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
            <DialogTitle><T>Delete Patient Record</T></DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all associated records
              (screenings, interventions, consent records, alerts). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="confirm-password"><T>Enter your password to confirm</T></Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder={t("Your account password")}
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
              <T>Cancel</T>
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmPassword || deleteLoading}
            >
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <T>Delete Patient</T>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
