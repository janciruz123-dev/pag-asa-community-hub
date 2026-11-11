import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Bell, CheckCircle2, ClipboardList, Clock, Eye, FileCheck2, Mail, MapPin, Megaphone, MessageSquareWarning, ShieldCheck, Target, Users,
} from "lucide-react";
import heroImg from "@/assets/hero-community.jpg";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { activeServicesQuery, publishedAnnouncementsQuery } from "@/lib/api/announcements";
import { CONTACT } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyPag-asa — Your Barangay, Connected" },
      { name: "description", content: "Access Barangay Pag-asa services, submit concerns, request certificates and read community announcements online." },
      { property: "og:title", content: "MyPag-asa — Your Barangay, Connected" },
      { property: "og:description", content: "Barangay Pag-asa, Olongapo City online services portal for residents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: MessageSquareWarning, title: "Submit concerns", text: "Report noise, cleanliness, road and safety issues with photos and track every update." },
  { icon: FileCheck2, title: "Request services", text: "Apply for clearances and certificates online, then monitor processing until it's ready." },
  { icon: Bell, title: "Get notified", text: "Receive in-app updates when the barangay reviews your concern or request." },
  { icon: ShieldCheck, title: "Private & secure", text: "Your records are visible only to you and authorized barangay personnel." },
];

function Landing() {
  const { data: services, isLoading: loadingServices } = useQuery(activeServicesQuery);
  const { data: latest, isLoading: loadingNews } = useQuery(publishedAnnouncementsQuery({ page: 1, limit: 3 }));

  return (
    <PublicLayout>
      {/* Hero */}
      <section id="home" className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium tracking-wide">
              <MapPin className="h-3.5 w-3.5" /> Barangay Pag-asa · Olongapo City
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-[3.4rem]">Welcome to MyPag-asa</h1>
            <p className="mt-4 font-display text-xl text-sky sm:text-2xl">Your Barangay, Connected. Your Community, Empowered.</p>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/80">
              Access barangay services, submit concerns, request assistance, and stay updated with the latest community announcements through one convenient online platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="hero" asChild><Link to="/register">Get Started <ArrowRight /></Link></Button>
              <Button size="lg" variant="heroOutline" asChild><a href="#services">Explore Services</a></Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary-foreground/5 blur-2xl" />
            <img src={heroImg} alt="Residents of Barangay Pag-asa gathered near the barangay hall" width={1536} height={1024} className="relative w-full rounded-2xl border border-primary-foreground/15 shadow-elevated" />
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="border-b bg-surface">
        <div className="container-page grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-royal"><f.icon className="h-5 w-5" /></div>
              <div>
                <h3 className="text-sm font-semibold text-primary">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Announcements */}
      <section className="container-page py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-royal">Latest updates</p>
            <h2 className="mt-2 text-3xl font-semibold text-primary">Community announcements</h2>
          </div>
          <Button variant="outline" asChild><Link to="/announcements">View all <ArrowRight /></Link></Button>
        </div>
        {loadingNews ? (
          <div className="grid gap-5 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
        ) : latest && latest.rows.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">{latest.rows.map((a) => <AnnouncementCard key={a.id} a={a} linkTo="/announcements/$id" />)}</div>
        ) : (
          <div className="rounded-xl border border-dashed bg-surface p-10 text-center text-sm text-muted-foreground">
            <Megaphone className="mx-auto mb-3 h-8 w-8 text-royal/50" /> No announcements have been published yet. Check back soon.
          </div>
        )}
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-20 bg-soft py-16">
        <div className="container-page">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-royal">Online services</p>
          <h2 className="mt-2 text-3xl font-semibold text-primary">Available barangay services</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">Submit a request online. Barangay personnel review every application — final documents are released only after official approval.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loadingServices
              ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)
              : services?.map((s) => (
                  <div key={s.id} className="rounded-xl border bg-card p-6 shadow-card">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ClipboardList className="h-5 w-5" /></div>
                    <h3 className="mt-4 text-lg font-semibold text-primary">{s.name}</h3>
                    {s.description && <p className="mt-1.5 text-sm text-muted-foreground">{s.description}</p>}
                    {s.requirements && <p className="mt-3 text-xs text-foreground/70"><span className="font-semibold">Bring:</span> {s.requirements}</p>}
                  </div>
                ))}
            <div className="flex flex-col justify-between rounded-xl border border-royal/30 bg-royal p-6 text-royal-foreground shadow-card">
              <div>
                <MessageSquareWarning className="h-7 w-7" />
                <h3 className="mt-4 text-lg font-semibold">Have a community concern?</h3>
                <p className="mt-1.5 text-sm text-royal-foreground/80">File a complaint online and follow its status from submission to resolution.</p>
              </div>
              <Button variant="hero" className="mt-5 self-start" asChild><Link to="/register">Create an account</Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="container-page scroll-mt-20 py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-royal">About MyPag-asa</p>
            <h2 className="mt-2 text-3xl font-semibold text-primary">A digital front desk for Barangay Pag-asa</h2>
            <p className="mt-4 text-muted-foreground">
              MyPag-asa is a web-based barangay management system that brings selected barangay transactions online. Residents can raise concerns,
              apply for certificates and receive announcements without lining up, while barangay officials and staff manage records in one organized place.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Primary beneficiaries: residents of Barangay Pag-asa", "Secondary beneficiaries: barangay officials and administrative staff", "Every request is reviewed by authorized personnel"].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="grid gap-5">
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-royal"><Eye className="h-5 w-5" /></div><h3 className="text-lg font-semibold text-primary">Vision</h3></div>
              <p className="mt-3 text-sm text-muted-foreground">To establish a more accessible, organized, and digitally connected barangay community where residents can conveniently communicate with barangay officials and access essential services.</p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-royal"><Target className="h-5 w-5" /></div><h3 className="text-lg font-semibold text-primary">Mission</h3></div>
              <p className="mt-3 text-sm text-muted-foreground">To provide a web-based platform that simplifies selected barangay transactions, improves communication between residents and officials, and supports efficient management of community concerns through digital technology.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 border-t bg-surface py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-royal">Contact information</p>
            <h2 className="mt-2 text-3xl font-semibold text-primary">Visit or reach the barangay</h2>
            <p className="mt-3 text-muted-foreground">For urgent emergencies, call your local emergency hotline. For questions about your account, use Help and Support after signing in.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Users, label: "Office", value: CONTACT.office },
              { icon: MapPin, label: "Address", value: CONTACT.address },
              { icon: Clock, label: "Office hours", value: CONTACT.hours },
              { icon: Mail, label: "Online", value: "Sign in and open Help and Support to message the barangay" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border bg-background p-5">
                <c.icon className="h-5 w-5 text-royal" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-sm font-medium">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
