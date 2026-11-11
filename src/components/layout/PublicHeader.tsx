import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Menu } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-current-user";

const links = [
  { label: "Home", href: "/#home" },
  { label: "About Us", href: "/#about" },
  { label: "Services", href: "/#services" },
  { label: "Announcements", href: "/announcements" },
  { label: "Contact", href: "/#contact" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { data: me } = useCurrentUser();
  const home = me?.isOfficial ? "/admin" : "/dashboard";
  return (
    <header className="sticky top-0 z-40 border-b bg-surface/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="MyPag-asa home"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-primary">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {me ? (
            <Button asChild><Link to={home}><LayoutDashboard /> My Dashboard</Link></Button>
          ) : (
            <>
              <Button variant="ghost" asChild><Link to="/auth">Login</Link></Button>
              <Button variant="royal" asChild><Link to="/register">Register</Link></Button>
            </>
          )}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu"><Menu className="!h-5 !w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-6 flex flex-col gap-1">
              {links.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                  {l.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                {me ? (
                  <Button asChild><Link to={home}>My Dashboard</Link></Button>
                ) : (
                  <>
                    <Button variant="outline" asChild><Link to="/auth">Login</Link></Button>
                    <Button variant="royal" asChild><Link to="/register">Register</Link></Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
