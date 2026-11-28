import Link from "next/link";

export const TERMS_REQUIRED = "Please accept the Terms and Conditions to continue.";

/** "I agree" box for checkout and ticket forms; the server refuses the request without it. */
export function TermsCheckbox({ id, checked, onChange, isDark = false }: { id: string; checked: boolean; onChange: (v: boolean) => void; isDark?: boolean }) {
  return (
    <label htmlFor={id} className={`terms-check${isDark ? " dark" : ""}`}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} required />
      <span>
        I agree to the <Link href="/legal/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</Link> and{" "}
        <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
      </span>
    </label>
  );
}
