import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AnimatedBackground from "@/components/animated-background";
import FileUpload from "@/components/file-upload";
import SafeVoyageLogo from "@/components/safe-voyage-logo";
import { Shield, User, IdCard, Route, Phone } from "lucide-react";

const registrationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  documentType: z.enum(['passport', 'aadhaar', 'driving_license'], {
    required_error: "Please select a document type",
  }),
  itinerary: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  emergencyName: z.string().min(2, "Emergency contact name is required"),
  emergencyPhone: z.string().min(10, "Emergency contact phone is required"),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function TouristRegistration() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      documentType: undefined,
      itinerary: "",
      startDate: "",
      endDate: "",
      emergencyName: "",
      emergencyPhone: "",
    },
  });

  // Pre-fill trip dates if coming from trip validation
  useEffect(() => {
    const tripData = localStorage.getItem("tripData");
    if (tripData) {
      const { startDate, endDate } = JSON.parse(tripData);
      form.setValue("startDate", startDate);
      form.setValue("endDate", endDate);
      // Clear the stored trip data
      localStorage.removeItem("tripData");
    }
  }, [form]);

  const onSubmit = async (data: RegistrationForm) => {
    const user = localStorage.getItem("user");
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please login again.",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }

    const userData = JSON.parse(user);
    setIsLoading(true);

    try {
      // Upload document if selected
      let documentUrl = null;
      if (selectedFile) {
        const uploadResponse = await apiRequest("POST", "/api/upload", { fileName: selectedFile.name });
        const uploadData = await uploadResponse.json();
        documentUrl = uploadData.url;
      }

      // Create tourist profile
      const touristData = {
        userId: userData.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        documentType: data.documentType,
        documentUrl,
        itinerary: data.itinerary,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
      };

      const response = await apiRequest("POST", "/api/tourists", touristData);
      const { tourist } = await response.json();

      // Store tourist data
      localStorage.setItem("tourist", JSON.stringify(tourist));
      
      toast({
        title: "Registration Successful",
        description: `Your Digital Tourist ID has been created! ID: ${tourist.digitalIdHash?.slice(-8)}`,
      });

      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Failed to create your digital ID. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <div className="min-h-screen py-8 px-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary rounded-xl flex items-center justify-center">
              <SafeVoyageLogo className="text-primary-foreground" size={40} />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Create Your Digital Tourist ID
            </h1>
            <p className="text-muted-foreground">Secure blockchain-based identity for your safety</p>
          </div>

          {/* Registration Form */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="mr-2 text-primary" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="First Name"
                                data-testid="input-first-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Last Name"
                                data-testid="input-last-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="Phone Number"
                                data-testid="input-phone"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* KYC Documents */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <IdCard className="mr-2 text-primary" />
                      Identity Verification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="documentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Document Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-document-type">
                                  <SelectValue placeholder="Select Document" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="passport">Passport</SelectItem>
                                <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                                <SelectItem value="driving_license">Driving License</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div>
                        <FormLabel>Document Upload</FormLabel>
                        <FileUpload
                          accept="image/*,.pdf"
                          onFileSelect={setSelectedFile}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trip Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Route className="mr-2 text-primary" />
                      Trip Details
                    </h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="itinerary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trip Itinerary (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your planned activities and destinations..."
                                rows={3}
                                data-testid="textarea-itinerary"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  data-testid="input-start-date"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  data-testid="input-end-date"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contacts */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Phone className="mr-2 text-primary" />
                      Emergency Contacts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="emergencyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Emergency Contact Name"
                                data-testid="input-emergency-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact Phone</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="Emergency Contact Phone"
                                data-testid="input-emergency-phone"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-200 flex items-center justify-center"
                    data-testid="button-create-id"
                  >
                    <SafeVoyageLogo className="mr-2" size={20} />
                    {isLoading ? "Creating Digital Tourist ID..." : "Create Digital Tourist ID"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
