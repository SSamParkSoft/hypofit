import { businessInfo } from "../../shared/config/business";
import { supportEmail } from "../../shared/config/support";

interface LandingBusinessDetailsProps {
  className?: string;
}

export function LandingBusinessDetails({ className = "" }: LandingBusinessDetailsProps) {
  return (
    <div className={className}>
      <address className="not-italic">
        <strong className="block font-black text-white/85">{businessInfo.legalName}</strong>
        <span className="mt-1 block">
          문의{" "}
          <a
            className="transition-colors hover:text-white hover:underline"
            href={`mailto:${supportEmail}`}
          >
            {supportEmail}
          </a>
        </span>
      </address>
      <p className="mt-3 text-[11px] font-bold">
        © 2026 {businessInfo.legalName}. All rights reserved.
      </p>
    </div>
  );
}
