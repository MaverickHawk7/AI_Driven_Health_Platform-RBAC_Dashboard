import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface FieldWorker {
  id: number;
  name: string;
  username: string;
  role: string;
  createdAt: string | null;
  screeningsCount: number;
  patientsCount: number;
  avgRiskScore: number;
}

export default function FieldWorkersList() {
  const { data: workers, isLoading, error } = useQuery<FieldWorker[]>({
    queryKey: [api.fieldWorkers.list.path],
    queryFn: async () => {
      const res = await fetch(api.fieldWorkers.list.path);
      if (!res.ok) throw new Error("Failed to fetch field workers");
      return res.json();
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <Link href="/dashboard">
        <Button variant="ghost" className="gap-2 mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Field Worker Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor performance, attendance, and coverage of field workers in your assigned districts.
        </p>
      </div>

      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Active Field Workers
          </CardTitle>
          <CardDescription>
            Performance metrics and administrative details for field personnel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading field workers...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-destructive">
              Failed to load field workers. Please try again later.
            </div>
          )}

          {!isLoading && !error && workers && workers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No field workers found. Register users with the "field_worker" role to see them here.
            </div>
          )}

          {!isLoading && !error && workers && workers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Username</TableHead>
                  <TableHead className="font-semibold">Joined</TableHead>
                  <TableHead className="font-semibold text-center">Screenings</TableHead>
                  <TableHead className="font-semibold text-center">Patients</TableHead>
                  <TableHead className="font-semibold text-center">Avg Risk Score</TableHead>
                  <TableHead className="font-semibold text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {worker.name.charAt(0)}
                        </div>
                        {worker.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {worker.username}
                    </TableCell>
                    <TableCell>
                      {worker.createdAt
                        ? new Date(worker.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-primary">
                      {worker.screeningsCount}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {worker.patientsCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        worker.avgRiskScore >= 70 ? "destructive" :
                        worker.avgRiskScore >= 40 ? "secondary" : "outline"
                      }>
                        {worker.avgRiskScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
