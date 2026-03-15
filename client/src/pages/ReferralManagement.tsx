import { useReferrals, useUpdateReferral } from "@/hooks/use-resources";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { T, useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Under_Evaluation: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
};

const TYPE_COLORS: Record<string, string> = {
  PHC: "bg-purple-100 text-purple-700",
  NRC: "bg-orange-100 text-orange-700",
  DEIC: "bg-indigo-100 text-indigo-700",
  RBSK: "bg-cyan-100 text-cyan-700",
  AWW_Intervention: "bg-teal-100 text-teal-700",
  Parent_Intervention: "bg-pink-100 text-pink-700",
};

export default function ReferralManagement() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: referrals, isLoading } = useReferrals(
    undefined,
    statusFilter !== "all" ? statusFilter : undefined
  );
  const { mutate: updateReferral } = useUpdateReferral();

  const filtered = (referrals || []).filter((r: any) => {
    if (typeFilter !== "all" && r.referralType !== typeFilter) return false;
    return true;
  });

  const canModify = user && ["supervisor", "cdpo", "admin"].includes(user.role);

  if (isLoading) return <div className="p-8">Loading referrals...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight"><T>Referral Management</T></h1>
        <p className="text-muted-foreground mt-1"><T>Track and manage patient referrals</T></p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("Filter by status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"><T>All Statuses</T></SelectItem>
            <SelectItem value="Pending"><T>Pending</T></SelectItem>
            <SelectItem value="Under_Evaluation"><T>Under Evaluation</T></SelectItem>
            <SelectItem value="Completed"><T>Completed</T></SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("Filter by type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"><T>All Types</T></SelectItem>
            <SelectItem value="PHC">PHC</SelectItem>
            <SelectItem value="NRC">NRC</SelectItem>
            <SelectItem value="DEIC">DEIC</SelectItem>
            <SelectItem value="RBSK">RBSK</SelectItem>
            <SelectItem value="AWW_Intervention">AWW</SelectItem>
            <SelectItem value="Parent_Intervention">Parent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <T>No referrals found.</T>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ref: any) => (
            <Card key={ref.id} className="overflow-hidden">
              <div className={`h-1 w-full ${ref.referralStatus === "Completed" ? "bg-green-500" : (ref.referralStatus === "Under_Treatment" || ref.referralStatus === "Under_Evaluation") ? "bg-blue-500" : "bg-amber-500"}`} />
              <CardContent className="pt-4 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={TYPE_COLORS[ref.referralType] || ""}>{ref.referralType}</Badge>
                      <Badge variant="outline">{ref.referralReason?.replace("_", " ")}</Badge>
                      <Badge className={STATUS_COLORS[ref.referralStatus] || ""}>{ref.referralStatus?.replace("_", " ")}</Badge>
                      {ref.referralTriggered && <Badge variant="outline" className="text-xs">Auto</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Patient #{ref.patientId} | {ref.referredAt ? format(new Date(ref.referredAt), 'PPP') : "Unknown"}
                    </p>
                    {ref.notes && <p className="text-xs text-muted-foreground">{ref.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setLocation(`/patients/${ref.patientId}`)}>
                      View Patient <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                    {canModify && ref.referralStatus === "Pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateReferral({ id: ref.id, referralStatus: "Under_Evaluation" })}>
                        <T>Refer for Evaluation</T>
                      </Button>
                    )}
                    {canModify && (ref.referralStatus === "Under_Treatment" || ref.referralStatus === "Under_Evaluation") && (
                      <Button size="sm" onClick={() => updateReferral({ id: ref.id, referralStatus: "Completed" })}>
                        <T>Mark Complete</T>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
