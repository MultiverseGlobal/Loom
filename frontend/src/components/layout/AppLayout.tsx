import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-[var(--bg-root)]">
            <Sidebar />
            <div className="ml-[60px] transition-all duration-300">
                <Header />
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
