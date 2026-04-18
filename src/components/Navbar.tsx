import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Code2, LogIn, LogOut, Shield, UserPlus, Moon, Sun, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDark(true);
    }
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex min-w-0 items-center gap-2 text-primary font-bold text-lg sm:text-xl">
            <Code2 className="h-6 w-6" />
            <span className="truncate">CodeLib</span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDark(!dark)}
              className="h-9 w-9"
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              title={dark ? "Light theme" : "Dark theme"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin" aria-label="Admin" title="Admin" className="px-2 sm:px-3">
                  <Shield className="h-4 w-4 mr-0 sm:mr-1" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/playground" aria-label="Playground" title="Playground" className="px-2 sm:px-3">
                <Terminal className="h-4 w-4 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Playground</span>
              </Link>
            </Button>
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sign out"
                title="Sign out"
                className="px-2 sm:px-3"
              >
                <LogOut className="h-4 w-4 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">{signingOut ? "Signing Out" : "Sign Out"}</span>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login" aria-label="Login" title="Login" className="px-2 sm:px-3">
                    <LogIn className="h-4 w-4 mr-0 sm:mr-1" />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                </Button>
                {/* <Button size="sm" asChild>
                  <Link to="/signup" aria-label="Sign up" title="Sign up" className="px-2 sm:px-3">
                    <UserPlus className="h-4 w-4 mr-0 sm:mr-1" />
                    <span className="hidden sm:inline">Sign Up</span>
                  </Link>
                </Button> */}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
