import Link from "next/link";
import { ArrowUpRight } from "../Icons";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="R1VLE home">
      <span className="brand-mark">R</span>
      R1VLE
    </Link>
  );
}

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Brand />
        <nav className="nav-links" aria-label="Main">
          <a href="/#departments">Departments</a>
          <a href="/#zifarmchain">ZiFarmChain</a>
          <a href="/#process">How it works</a>
          <a href="/#pricing">Pricing</a>
          <Link href="/track">Track project</Link>
        </nav>
        <div className="nav-cta">
          <Link href="/track" className="btn btn-light btn-plain hide-sm">Track</Link>
          <Link href="/order" className="btn btn-dark">
            <span>Start a project</span>
            <span className="arrow"><ArrowUpRight size={16} /></span>
          </Link>
        </div>
      </div>
    </header>
  );
}
