'use client';

import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
    const router = useRouter();

    const handleCheckout = () => {
        router.push('/api/checkout');
    };

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-900">
            <h1 className="text-2xl font-bold">Polar Checkout Integration</h1>
            <p className="text-gray-600 dark:text-gray-400">Click below to test the checkout flow</p>
            <button
                onClick={handleCheckout}
                className="rounded-md bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Start Checkout
            </button>
        </div>
    );
}
