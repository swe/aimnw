type LogoProps = {
  className?: string
}

/** Inline mark so gradient stops can reverse on hover via CSS. */
export function Logo({ className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 2400 2799"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="brand-logo-gradient" x1="13.239%" y1="0%" x2="86.761%" y2="100%">
          <stop offset="0%" stopColor="#d4d4d4" />
          <stop offset="100%" stopColor="#a9a9a9" />
        </linearGradient>
      </defs>
      <path
        fill="url(#brand-logo-gradient)"
        d="M1800,1999 C1800,1667.62915 1531.37085,1399 1200,1399 C868.62915,1399 600,1667.62915 600,1999 L600,2699 C600,2754.22847 555.228475,2799 500,2799 L100,2799 C44.771525,2799 0,2754.22847 0,2699 L0,1200 C0,537.2583 537.2583,0 1200,0 C1862.7417,0 2400,537.2583 2400,1200 L2400,2699 C2400,2754.22847 2355.22847,2799 2300,2799 L1900,2799 C1844.77153,2799 1800,2754.22847 1800,2699 Z"
      />
    </svg>
  )
}
