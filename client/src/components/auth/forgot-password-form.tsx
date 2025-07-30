import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email non valida"),
});

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      forgotPasswordSchema.parse({ email });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Inserisci un'email valida",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEmailSent(true);
        toast({
          title: "Email inviata",
          description: data.message,
        });
        
        // In development, show the reset token
        if (data.resetToken) {
          console.log("Reset token per test:", data.resetToken);
          toast({
            title: "Token di sviluppo",
            description: `Token per test: ${data.resetToken}`,
            duration: 10000,
          });
        }
      } else {
        throw new Error(data.message || "Errore durante l'invio");
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante l'invio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email inviata</CardTitle>
          <CardDescription>
            Controlla la tua casella email per le istruzioni di recupero password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna al login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Recupera password</CardTitle>
        <CardDescription>
          Inserisci la tua email per ricevere le istruzioni di recupero
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="la-tua-email@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Invio in corso..." : "Invia istruzioni"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna al login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}