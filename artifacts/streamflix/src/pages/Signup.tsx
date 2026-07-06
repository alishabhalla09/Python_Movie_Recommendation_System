import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSignup } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tv } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const signup = useSignup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signup.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        localStorage.setItem("streamflix_token", data.token);
        setLocation("/");
      },
      onError: (err: any) => {
        toast({
          title: "Signup failed",
          description: err.response?.data?.error || "An error occurred",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-black to-black opacity-60"></div>
        <div className="absolute inset-0 bg-black/80"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8 md:p-10 bg-black/50 border border-white/10 backdrop-blur-md rounded-xl shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3 text-primary font-bold text-3xl tracking-tighter uppercase">
            <Tv className="w-8 h-8" />
            StreamFlix
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-6">Create Account</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 py-6"
              required
            />
          </div>
          <div className="space-y-2">
            <Input 
              type="password" 
              placeholder="Password (min 6 characters)" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 py-6"
              minLength={6}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full py-6 text-lg font-semibold mt-4" 
            disabled={signup.isPending}
          >
            {signup.isPending ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="mt-8 text-zinc-500 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:underline">
            Sign in
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
