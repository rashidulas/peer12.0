"use client";
import { useState } from "react";
import { Mail, AlertTriangle } from "lucide-react";

export default function CompactAlertButton() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("High latency detected on network");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sendAlert = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(
        `${apiBase}/actions/send-alert?message=${encodeURIComponent(message)}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || res.statusText);
      } else {
        setResult(data);
        setTimeout(() => setShowModal(false), 2000);
      }
    } catch (e: any) {
      setError(e?.message || "Alert failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Compact Alert Button */}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
      >
        <AlertTriangle className="w-4 h-4" />
        Send Alert
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl border shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-foreground">Send Email Alert</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Alert Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Alert message..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={sendAlert}
                  disabled={loading || !message.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm font-medium"
                >
                  {loading ? "Sending..." : "Send Alert"}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {result && result.status === "sent" && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Alert sent to {result.to}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
