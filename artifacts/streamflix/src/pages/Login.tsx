import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tv } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        localStorage.setItem("streamflix_token", data.token);
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Login failed",
          description: "Please check your email and password",
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

        <h1 className="text-2xl font-bold text-white mb-6">Sign In</h1>
        
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
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-500 py-6"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full py-6 text-lg font-semibold mt-4" 
            disabled={login.isPending}
          >
            {login.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-8 text-zinc-500 text-sm">
          New to StreamFlix?{" "}
          <Link href="/signup" className="text-white hover:underline">
            Sign up now
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
