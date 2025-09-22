import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, AlertTriangle, Calendar, Shield } from "lucide-react";
import Squares from "@/components/Squares";

const tripValidationSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type TripValidationForm = z.infer<typeof tripValidationSchema>;

interface ValidationResult {
  isValid: boolean;
  tourist?: any;
  message: string;
}

export default function TripValidation() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const { toast } = useToast();

  const form = useForm<TripValidationForm>({
    resolver: zodResolver(tripValidationSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
    },
  });

  const onSubmit = async (data: TripValidationForm) => {
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
      const response = await apiRequest("POST", "/api/tourists/check-digital-id", {
        userId: userData.id,
        startDate: data.startDate,
        endDate: data.endDate
      });

      const result: ValidationResult = await response.json();
      setValidationResult(result);

      if (result.isValid && result.tourist) {
        // Store tourist data and redirect to dashboard
        localStorage.setItem("tourist", JSON.stringify(result.tourist));
        
        toast({
          title: "Digital ID Found",
          description: result.message,
        });

        setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Failed to validate digital ID. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToRegistration = () => {
    // Store trip dates for registration form
    const tripData = {
      startDate: form.getValues("startDate"),
      endDate: form.getValues("endDate")
    };
    localStorage.setItem("tripData", JSON.stringify(tripData));
    setLocation("/registration");
  };

  const handleExtendTrip = async () => {
    if (!validationResult?.tourist) return;

    setIsLoading(true);
    try {
      const response = await apiRequest("PUT", `/api/tourists/${validationResult.tourist.id}/trip-dates`, {
        startDate: form.getValues("startDate"),
        endDate: form.getValues("endDate")
      });

      const { tourist } = await response.json();
      localStorage.setItem("tourist", JSON.stringify(tourist));
      
      toast({
        title: "Trip Extended",
        description: `Your digital ID is now valid until ${new Date(tourist.endDate).toLocaleDateString()}.`,
      });

      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    } catch (error) {
      toast({
        title: "Extension Failed",
        description: "Failed to extend trip dates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div style={{ width: '100%', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}>
        <Squares 
          speed={0.5} 
          squareSize={40}
          direction='diagonal'
          borderColor='#333'
          hoverFillColor='#555'
        />
      </div>
      
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary rounded-xl flex items-center justify-center">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Check Digital Tourist ID
            </h1>
            <p className="text-muted-foreground">
              Enter your trip dates to check if you have a valid digital ID
            </p>
          </div>

          {/* Trip Validation Form */}
          <Card className="bg-card/90 backdrop-blur-sm border border-border shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 text-primary" />
                Trip Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
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
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-200"
                  >
                    {isLoading ? "Checking..." : "Check Digital ID"}
                  </Button>
                </form>
              </Form>

              {/* Validation Result */}
              {validationResult && (
                <div className="mt-6 p-4 rounded-lg border">
                  <div className="flex items-start space-x-3">
                    {validationResult.isValid ? (
                      <CheckCircle className="w-6 h-6 text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-yellow-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">
                        {validationResult.isValid ? "Valid Digital ID Found" : "Action Required"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {validationResult.message}
                      </p>
                      
                      {!validationResult.isValid && (
                        <div className="space-y-2">
                          {validationResult.tourist ? (
                            <Button
                              onClick={handleExtendTrip}
                              disabled={isLoading}
                              variant="outline"
                              className="w-full"
                            >
                              Extend Trip Dates
                            </Button>
                          ) : (
                            <Button
                              onClick={handleProceedToRegistration}
                              className="w-full"
                            >
                              Create New Digital ID
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}