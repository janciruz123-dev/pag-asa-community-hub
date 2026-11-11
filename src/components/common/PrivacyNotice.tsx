export function PrivacyNoticeContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-foreground/85">
      <p>
        MyPag-asa collects and processes personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173),
        its Implementing Rules and Regulations, and issuances of the National Privacy Commission.
      </p>
      <div>
        <h3 className="font-semibold text-primary">What we collect</h3>
        <p>Your full name, email address, contact number, residential address, optional profile photo, and the details and files you submit with complaints and service requests.</p>
      </div>
      <div>
        <h3 className="font-semibold text-primary">Why we collect it</h3>
        <p>To verify that you are a resident, to process your complaints and service requests, to contact you about their status, and to send you community announcements.</p>
      </div>
      <div>
        <h3 className="font-semibold text-primary">Who can see it</h3>
        <p>Only you and authorized Barangay Pag-asa personnel with the appropriate permissions. Attachments are stored privately and are never public. We do not sell or share your data with third parties.</p>
      </div>
      <div>
        <h3 className="font-semibold text-primary">Your rights</h3>
        <p>You may access and correct your information in My Profile, and you may request deactivation of your account by visiting the barangay hall. Actions on records are logged to protect accountability.</p>
      </div>
    </div>
  );
}
