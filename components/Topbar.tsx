"use client";

interface TopbarProps {
  crumb: string;
}

export default function Topbar({ crumb }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="crumb">
        SecureArch / <b>{crumb}</b>
      </div>
      <div className="search">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.3 8.9 5 5-1.4 1.4-5-5 1.4-1.4Z" />
        </svg>
        Search controls, findings, architectures…
      </div>
    </header>
  );
}
