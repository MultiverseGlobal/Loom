import { useState, useEffect } from "react";
import { authService } from "@/services/auth.service";
import { createClient } from "@/lib/supabase";

export function AccountSettings() {
    const [user, setUser] = useState<any>(null);
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const currentUser = await authService.getUser();
        if (currentUser) {
            setUser(currentUser);
            setFullName(currentUser.user_metadata?.full_name || "");
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage("");

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            if (error) throw error;
            setMessage("Profile updated successfully!");

            // Refresh user data
            await loadUser();
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const getInitials = () => {
        if (!user) return "??";
        const name = fullName || user.email || "";
        return name.slice(0, 2).toUpperCase();
    };

    if (loading) return <div className="text-[var(--text-secondary)]">Loading account details...</div>;

    return (
        <div className="space-y-6">
            {/* Profile Picture */}
            <div>
                <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-3">
                    Profile Picture
                </label>
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] text-xl font-semibold">
                        {getInitials()}
                    </div>
                </div>
            </div>

            {/* Full Name */}
            <div>
                <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-2">
                    Full Name
                </label>
                <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-root)] text-[14px] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                />
            </div>

            {/* Email */}
            <div>
                <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-2">
                    Email Address
                </label>
                <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-3 py-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[14px] text-[var(--text-secondary)] cursor-not-allowed"
                />
                <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                    Your primary email for account notifications (cannot be changed)
                </p>
            </div>

            {/* User ID */}
            <div>
                <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-2">
                    User ID
                </label>
                <code className="block w-full px-3 py-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[12px] font-mono text-[var(--text-secondary)]">
                    {user?.id}
                </code>
            </div>

            {message && (
                <div className={`p-3 rounded-md text-[13px] ${message.includes("Success") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {message}
                </div>
            )}

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-md bg-[var(--accent-primary)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
