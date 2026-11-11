import { Link } from "@tanstack/react-router";
import { Clock, MapPin } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { CONTACT } from "@/lib/constants";

export function PublicFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo inverted />
          <p className="mt-4 max-w-md text-sm text-primary-foreground/75">
            MyPag-asa is a web-based barangay management system for residents of Barangay Pag-asa, Olongapo City.
            It is a community project and does not replace official barangay documents or in-person verification.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Quick links</h3>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
            <li><a href="/#services" className="hover:text-primary-foreground">Services</a></li>
            <li><Link to="/announcements" className="hover:text-primary-foreground">Announcements</Link></li>
            <li><Link to="/privacy" className="hover:text-primary-foreground">Privacy Notice</Link></li>
            <li><Link to="/auth" className="hover:text-primary-foreground">Login</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Visit us</h3>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{CONTACT.address}</li>
            <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{CONTACT.hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-primary-foreground/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} MyPag-asa · Barangay Pag-asa, Olongapo City</p>
          <p>Personal data is handled in line with the Data Privacy Act of 2012 (RA 10173).</p>
        </div>
      </div>
    </footer>
  );
}
