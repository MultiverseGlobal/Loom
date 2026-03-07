export function HatchLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Interwoven threads forming an abstract "H" */}
            <path
                d="M8 4 L8 24 M24 4 L24 24 M8 14 L24 14"
                stroke="url(#hatch-gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* Gradients */}
            <defs>
                <linearGradient id="hatch-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
            </defs>
        </svg>
    );
}
