import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema } from "@shared/schema";
import { DISTRICTS, BLOCKS_BY_DISTRICT } from "@shared/constants";
import { useCreatePatient } from "@/hooks/use-resources";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import ConductScreening from "./ConductScreening";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, MapPin, ArrowRight, ArrowLeft, Baby } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { T, useLanguage } from "@/hooks/use-language";

const preRegSchema = z.object({
  district: z.string().min(1, "District is required"),
  block: z.string().min(1, "Block is required"),
  patientIdNumber: z.string().min(1, "Patient ID number is required"),
});

type PreRegValues = z.infer<typeof preRegSchema>;

const formSchema = insertPatientSchema.extend({
  ageMonths: z.coerce.number().min(0, "Age cannot be negative").max(80, "Age must be 80 months or less"),
  contactNumber: z.string().optional().refine(v => !v || /^[+\d\s\-()]*$/.test(v), "Only numbers, +, -, spaces and () allowed"),
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  caregiverName: z.string().min(1, "Caregiver name is required").max(255, "Name is too long"),
  dob: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  modeDelivery: z.enum(["vaginal", "c_section"]).optional(),
  modeConception: z.enum(["natural", "art"]).optional(),
  birthStatus: z.enum(["term", "preterm", "post_term"]).optional(),
  consanguinity: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function RegisterPatient() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mutate, isPending } = useCreatePatient();
  const [, setLocation] = useLocation();
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [step, setStep] = useState<"pre-reg" | "details" | "birth-history">("pre-reg");
  const [preRegData, setPreRegData] = useState<PreRegValues | null>(null);

  const uniqueDistricts = DISTRICTS;

  const preRegForm = useForm<PreRegValues>({
    resolver: zodResolver(preRegSchema),
    defaultValues: { district: "", block: "", patientIdNumber: "" },
  });

  const selectedDistrict = preRegForm.watch("district");

  const blocksForDistrict = useMemo(() => {
    if (!selectedDistrict) return [];
    return BLOCKS_BY_DISTRICT[selectedDistrict] || [];
  }, [selectedDistrict]);

  function onPreRegSubmit(values: PreRegValues) {
    setPreRegData(values);
    setStep("details");
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      caregiverName: "",
      ageMonths: 0,
      dob: "",
      gender: undefined,
      contactNumber: "",
      address: "",
      registeredByUserId: user?.id,
      modeDelivery: undefined,
      modeConception: undefined,
      birthStatus: undefined,
      consanguinity: false,
    },
  });

  // Auto-calculate age from DOB
  const dobValue = form.watch("dob");
  const computedAge = useMemo(() => {
    if (!dobValue) return null;
    const birth = new Date(dobValue);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return Math.max(0, months);
  }, [dobValue]);

  // Sync computed age to form when DOB changes
  useEffect(() => {
    if (computedAge !== null) {
      form.setValue("ageMonths", computedAge);
    }
  }, [computedAge, form]);

  function onSubmit(values: FormValues) {
    // Clean up empty strings for optional fields before sending to API
    const cleaned = {
      ...values,
      ageMonths: Number(values.ageMonths),
      dob: values.dob || undefined,
      gender: values.gender || undefined,
      contactNumber: values.contactNumber || undefined,
      address: values.address || undefined,
      modeDelivery: values.modeDelivery || undefined,
      modeConception: values.modeConception || undefined,
      birthStatus: values.birthStatus || undefined,
      registeredByUserId: user?.id,
      district: preRegData?.district,
      block: preRegData?.block,
      patientIdNumber: preRegData?.patientIdNumber,
    };
    mutate(cleaned, {
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

  // Step 1: Pre-Registration (District, Block, Patient ID)
  if (step === "pre-reg") {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground"><T>Register New Patient</T></h1>
          <p className="text-muted-foreground mt-2">
            <T>Select location and enter the patient ID to begin registration.</T>
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-500" />
              <CardTitle><T>Location & Identification</T></CardTitle>
            </div>
            <CardDescription>
              <T>Step 1 of 3 - Select the district, block, and enter the patient ID number.</T>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...preRegForm}>
              <form onSubmit={preRegForm.handleSubmit(onPreRegSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider"><T>Location</T></h3>
                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={preRegForm.control}
                      name="district"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel><T>District</T></FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              preRegForm.setValue("block", "");
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("Select district")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {uniqueDistricts.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={preRegForm.control}
                      name="block"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel><T>Block</T></FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedDistrict}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedDistrict ? t("Select block") : t("Select district first")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {blocksForDistrict.map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider"><T>Patient Identification</T></h3>
                  <Separator />

                  <FormField
                    control={preRegForm.control}
                    name="patientIdNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><T>Patient ID Number</T></FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. AWC-001-2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setLocation("/field-worker/home")}>
                    <T>Cancel</T>
                  </Button>
                  <Button type="submit" className="min-w-[150px]">
                    <T>Next</T>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Birth History (optional) — must be checked before step 2 falls through
  if (step === "birth-history") return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground"><T>Register New Patient</T></h1>
        <p className="text-muted-foreground mt-2">
          <T>Birth history helps with risk assessment. All fields are optional.</T>
        </p>
      </div>

      {preRegData && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-3 text-sm">
          <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
          <span>
            <span className="font-medium">{preRegData.district}</span>
            {" / "}
            <span className="font-medium">{preRegData.block}</span>
            {" — "}
            <span className="font-medium">{form.getValues("name") || "Patient"}</span>
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Baby className="w-5 h-5 text-pink-500" />
            <CardTitle><T>Birth History</T></CardTitle>
          </div>
          <CardDescription>
            <T>Step 3 of 3 - Optional birth details for comprehensive risk assessment.</T>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="modeDelivery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><T>Mode of Delivery</T></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("Select")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vaginal"><T>Vaginal</T></SelectItem>
                          <SelectItem value="c_section"><T>C-Section</T></SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modeConception"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><T>Mode of Conception</T></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("Select")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="natural"><T>Natural</T></SelectItem>
                          <SelectItem value="art"><T>ART (IVF/Assisted)</T></SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><T>Birth Status</T></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("Select")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="term"><T>Full Term</T></SelectItem>
                          <SelectItem value="preterm"><T>Pre-term</T></SelectItem>
                          <SelectItem value="post_term"><T>Post-term</T></SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="consanguinity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><T>Consanguinity (Related Parents)</T></FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(v) => field.onChange(v === "yes")}
                          value={field.value ? "yes" : "no"}
                          className="flex gap-4 pt-2"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="no" id="consang-no" />
                            <Label htmlFor="consang-no"><T>No</T></Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="yes" id="consang-yes" />
                            <Label htmlFor="consang-yes"><T>Yes</T></Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep("details")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <T>Back</T>
                </Button>
                <div className="flex gap-4">
                  <Button type="button" variant="ghost" onClick={() => {
                    form.setValue("modeDelivery", undefined);
                    form.setValue("modeConception", undefined);
                    form.setValue("birthStatus", undefined);
                    form.setValue("consanguinity", false);
                    form.handleSubmit(onSubmit)();
                  }}>
                    <T>Skip & Register</T>
                  </Button>
                  <Button type="submit" disabled={isPending} className="min-w-[150px]">
                    {isPending ? t("Registering...") : t("Register & Continue")}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  // Step 2: Patient Details
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground"><T>Register New Patient</T></h1>
        <p className="text-muted-foreground mt-2">
          <T>Create a new patient record to begin tracking and screening.</T>
        </p>
      </div>

      {preRegData && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-3 text-sm">
          <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
          <span>
            <span className="font-medium">{preRegData.district}</span>
            {" / "}
            <span className="font-medium">{preRegData.block}</span>
            {" — "}
            <T>ID</T>: <span className="font-mono">{preRegData.patientIdNumber}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs"
            onClick={() => setStep("pre-reg")}
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            <T>Change</T>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle><T>Patient Details</T></CardTitle>
          <CardDescription>
            <T>Step 2 of 3 - Enter the basic information for the patient and their emergency contact.</T>
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
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><T>Gender</T></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("Select gender")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male"><T>Male</T></SelectItem>
                            <SelectItem value="female"><T>Female</T></SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel><T>Date of Birth</T></FormLabel>
                        <FormControl>
                          <Input type="date" max={new Date().toISOString().split('T')[0]} {...field} value={field.value || ''} />
                        </FormControl>
                        {computedAge !== null && (
                          <p className="text-xs text-muted-foreground"><T>Calculated age</T>: {computedAge} <T>months</T></p>
                        )}
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
                          <Input type="number" placeholder="e.g. 12" min={0} max={80} {...field} disabled={computedAge !== null} />
                        </FormControl>
                        {computedAge !== null && (
                          <p className="text-xs text-muted-foreground"><T>Auto-calculated from DOB</T></p>
                        )}
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
                          <Input placeholder="+91 98765 43210" inputMode="tel" {...field} value={field.value || ''} />
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

              <div className="flex justify-between gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep("pre-reg")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <T>Back</T>
                </Button>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    <T>Reset</T>
                  </Button>
                  <Button type="button" onClick={() => {
                    form.trigger(["name", "ageMonths", "caregiverName"]).then(valid => {
                      if (valid) setStep("birth-history");
                    });
                  }} className="min-w-[150px]">
                    <T>Next</T>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
