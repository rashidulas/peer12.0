"use client";
import { useState } from "react";

export default function AlertPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("High latency detected on network");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sendAlert = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(
        `${apiBase}/actions/send-alert?message=${encodeURIComponent(message)}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || res.statusText);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e?.message || "Alert failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 p-4 border rounded-xl bg-background">
      <h3 className="font-semibold text-foreground mb-3">Send Email Alert</h3>

      <div className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Alert message..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />

        <button
          onClick={sendAlert}
          disabled={loading || !message.trim()}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
        >
          {loading ? "Sending..." : "Send Gmail Alert"}
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {result && result.status === "sent" && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">Alert sent to {result.to}</p>
        </div>
      )}
    </div>
  );
}
