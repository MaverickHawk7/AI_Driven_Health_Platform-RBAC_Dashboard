import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema } from "@shared/schema";
import { useCreatePatient } from "@/hooks/use-resources";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useLocation } from "wouter";
import { useState } from "react";
import ConductScreening from "./ConductScreening";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import { T, useLanguage } from "@/hooks/use-language";

const formSchema = insertPatientSchema.extend({
  ageMonths: z.coerce.number().min(1, "Age in months is required (must be at least 1)").max(72, "Age must be 72 months or less"),
  contactNumber: z.string().optional(),
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  caregiverName: z.string().min(1, "Caregiver name is required").max(255, "Name is too long"),
});

type FormValues = z.infer<typeof formSchema>;

export default function RegisterPatient() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mutate, isPending } = useCreatePatient();
  const [, setLocation] = useLocation();
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      caregiverName: "",
      ageMonths: 0,
      contactNumber: "",
      address: "",
      registeredByUserId: user?.id,
    },
  });

  function onSubmit(values: FormValues) {
    mutate({
      ...values,
      registeredByUserId: user?.id,
    }, {
      onSuccess: (data) => {
        setAssessmentId(data.id.toString());
        setAnalysisComplete(true);
      }
    });
  }

  const [isConductingScreening, setIsConductingScreening] = useState(false);

  if (analysisComplete) {
    if (!isConductingScreening) {
      return (
        <div className="h-[80vh] flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold"><T>Patient Registered Successfully</T></h2>
            <p className="text-muted-foreground"><T>The basic patient record has been created.</T></p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setLocation("/field-worker/home")}>
              <T>Back to Home</T>
            </Button>
            <Button onClick={() => setIsConductingScreening(true)}>
              <T>Proceed to Questionnaire</T>
            </Button>
          </div>
        </div>
      );
    }
    return <ConductScreening patientId={assessmentId ? Number.parseInt(assessmentId, 10) || undefined : undefined} />;
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground"><T>Register New Patient</T></h1>
        <p className="text-muted-foreground mt-2">
          <T>Create a new patient record to begin tracking and screening.</T>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><T>Patient Details</T></CardTitle>
          <CardDescription>
            <T>Enter the basic information for the patient and their emergency contact.</T>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider"><T>Patient Information</T></h3>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><T>Patient's Full Name</T></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ageMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><T>Age (Months)</T></FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g. 12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider"><T>Emergency Contact & Caregiver</T></h3>
                <Separator />

                <FormField
                  control={form.control}
                  name="caregiverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><T>Primary Contact / Caregiver Name</T></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><T>Contact Number</T></FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 8900" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><T>Address / Village</T></FormLabel>
                        <FormControl>
                          <Input placeholder="Village, District" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  <T>Reset</T>
                </Button>
                <Button type="submit" disabled={isPending} className="min-w-[150px]">
                  {isPending ? t("Registering...") : t("Register & Continue")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
