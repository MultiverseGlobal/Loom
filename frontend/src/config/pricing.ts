export const PRICING_PLANS = [
    {
        id: "starter",
        name: "Starter",
        price: "$7",
        period: "per month",
        description: "Perfect for hobbyists and side projects",
        polarPriceId: "", // User to fill
        features: [
            { text: "10 project imports/month", included: true },
            { text: "5 GitHub repos", included: true },
            { text: "Basic AI analysis", included: true },
        ],
        href: "/auth/signup?plan=starter",
    },
    {
        id: "pro",
        name: "Pro",
        price: "$24",
        period: "per month",
        description: "For professional developers",
        polarPriceId: process.env.NEXT_PUBLIC_POLAR_PRICE_ID_PRO || "",
        popular: true,
        features: [
            { text: "Unlimited imports", included: true },
            { text: "Unlimited GitHub repos", included: true },
            { text: "Advanced AI analysis", included: true },
            { text: "VS Code extension", included: true },
        ],
        href: "/auth/signup?plan=pro",
    },
    {
        id: "creator",
        name: "Creator",
        price: "$49",
        period: "per month",
        description: "For power users and content creators",
        polarPriceId: process.env.NEXT_PUBLIC_POLAR_PRICE_ID_CREATOR || "",
        features: [
            { text: "Everything in Pro", included: true },
            { text: "Priority support", included: true },
            { text: "Early access features", included: true },
        ],
        href: "/auth/signup?plan=creator",
    }
];
