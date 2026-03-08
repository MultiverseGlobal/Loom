export function ShiftLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Abstract "S" formed by two shifting blocks */}
            <path
                d="M10 8C10 6.89543 10.8954 6 12 6H22C23.1046 6 24 6.89543 24 8V14C24 15.1046 23.1046 16 22 16H10"
                stroke="url(#shift-gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M22 24C22 25.1046 21.1046 26 20 26H10C8.89543 26 8 25.1046 8 24V18C8 16.8954 8.89543 16 10 16H22"
                stroke="url(#shift-gradient-alt)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Gradients */}
            <defs>
                <linearGradient id="shift-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <linearGradient id="shift-gradient-alt" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
            </defs>
        </svg>
    );
}
