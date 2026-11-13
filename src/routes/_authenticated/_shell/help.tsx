import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, FileText, MapPin, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Section";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/_shell/help")({
  head: () => ({ meta: [{ title: "Help and Support — MyPag-asa" }, { name: "description", content: "Answers to common questions about MyPag-asa." }] }),
  component: Help,
});

const faqs = [
  { q: "How do I track my complaint?", a: "Open My Complaints and select a complaint. The status history shows every update from the barangay, with remarks when available. You also get a notification whenever the status changes." },
  { q: "What do the complaint statuses mean?", a: "Pending: received, not yet reviewed. Under Review: being evaluated. In Progress: action is ongoing. Resolved: the concern has been addressed. Closed: the case is finished. Rejected: the complaint could not be acted on — check the remarks for the reason." },
  { q: "How long does a service request take?", a: "Processing depends on the service and on office workload. Once your request is Approved, visit the barangay hall with a valid ID to claim the official document." },
  { q: "Is the online status an official document?", a: "No. MyPag-asa only tracks your request. Official certificates and clearances are signed and released by authorized barangay personnel at the barangay hall." },
  { q: "Who can see my information?", a: "Only you and authorized barangay personnel. Attachments are stored privately. See the Privacy Notice for details." },
  { q: "I forgot my password. What should I do?", a: "Sign out and use 'Forgot password?' on the login page. A reset link will be sent to your registered email." },
];

function Help() {
  return (
    <div>
      <PageHeader title="Help and Support" description="Find answers or reach the barangay office." />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Frequently asked questions">
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={String(i)}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Panel>
        <div className="space-y-6">
          <Panel title="Need to talk to the barangay?">
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-royal" />{CONTACT.office}, {CONTACT.address}</li>
              <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-royal" />{CONTACT.hours}</li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">For emergencies, call your local emergency hotline right away — do not use the online form.</p>
          </Panel>
          <Panel title="Quick actions">
            <div className="flex flex-col gap-2">
              <Button variant="outline" asChild className="justify-start"><Link to="/complaints/new"><MessageSquareWarning /> Submit a complaint</Link></Button>
              <Button variant="outline" asChild className="justify-start"><Link to="/requests/new"><FileText /> Request a service</Link></Button>
              <Button variant="outline" asChild className="justify-start"><Link to="/privacy"><ShieldCheck /> Read the Privacy Notice</Link></Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
