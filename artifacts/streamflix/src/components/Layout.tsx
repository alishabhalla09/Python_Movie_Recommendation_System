import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Bell, Menu, User as UserIcon } from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logout = useLogout();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("streamflix_token");
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header
        className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
          isScrolled ? "bg-background/95 backdrop-blur-md shadow-sm" : "bg-gradient-to-b from-black/80 to-transparent"
        }`}
      >
        <div className="flex items-center justify-between px-4 md:px-12 h-16 md:h-20">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-primary font-bold text-2xl md:text-3xl tracking-tighter uppercase cursor-pointer">
              StreamFlix
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/" className={`hover:text-white transition-colors ${location === '/' ? 'text-white' : ''}`}>Home</Link>
              <Link href="/watchlist" className={`hover:text-white transition-colors ${location === '/watchlist' ? 'text-white' : ''}`}>My List</Link>
              <Link href="/history" className={`hover:text-white transition-colors ${location === '/history' ? 'text-white' : ''}`}>History</Link>
              {user?.isAdmin && (
                <Link href="/admin" className={`hover:text-white transition-colors ${location === '/admin' ? 'text-white' : ''}`}>Admin</Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/search" className="text-white hover:text-gray-300 transition-colors cursor-pointer">
              <Search className="w-5 h-5" />
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 bg-secondary hover:bg-secondary/80">
                  <UserIcon className="w-4 h-4 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-card-border">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={() => setLocation("/watchlist")} className="cursor-pointer focus:bg-secondary focus:text-white">My List</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/history")} className="cursor-pointer focus:bg-secondary focus:text-white">Viewing History</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer focus:bg-secondary focus:text-white">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border mt-auto bg-background">
        <p>© {new Date().getFullYear()} StreamFlix. All rights reserved.</p>
      </footer>
    </div>
  );
}
