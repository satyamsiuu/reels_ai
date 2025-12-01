import { useState, useEffect } from "react";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(""), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const handleTranscribe = async () => {
    if (!url.trim()) {
      setError("Enter a Reel URL");
      return;
    }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() })
      });
      if (!res.ok) throw new Error((await res.text()) || "Transcription failed");
      const data = await res.json();
      setResult({
        transcript: data.transcript,
        subtitles: data.subtitles,
        meta: data.meta,
        vtt: data.vtt,
        originalUrl: url.trim(),
      });
    } catch (e) {
      setError(e.message || "Failed to transcribe.");
    } finally { setLoading(false); }
  };

  const handleRefine = async () => {
    if (!result?.transcript) return;
    setRefining(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.transcript })
      });
      if (!res.ok) throw new Error((await res.text()) || "Refine failed");
      const data = await res.json();
      setResult(r => ({ ...r, transcript: data.cleaned_transcript || data.transcript }));
    } catch (e) {
      setError(e.message || "Failed to refine.");
    } finally { setRefining(false); }
  };

  const formatTimestamp = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(Math.floor(seconds % 60)).padStart(2, "0");
    const ms = String(Math.floor((seconds % 1) * 1000)).padStart(3, "0");
    return `${h}:${m}:${s},${ms}`;
  };

  const srtContent = result?.subtitles?.map((s, i) => `${i + 1}\n${formatTimestamp(s.start)} --> ${formatTimestamp(s.end)}\n${s.text}\n`).join("\n") || "";

  const copyToClipboard = async (text, label) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); } catch { setError("Copy failed"); }
  };

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Ambient gradient overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-40 mix-blend-overlay" style={{background:"radial-gradient(circle at 30% 30%,rgba(59,130,246,0.25),transparent 60%),radial-gradient(circle at 70% 70%,rgba(168,85,247,0.25),transparent 65%)"}} />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold gradient-text tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">Reel Transcriber</h1>
          <p className="mt-3 text-gray-400 text-lg">Futuristic AI subtitle & transcript generation</p>
        </div>

        {/* Input Card */}
        <div className="glass p-8 mb-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.15]" style={{background:"linear-gradient(120deg,rgba(59,130,246,0.4),rgba(139,92,246,0.3),rgba(236,72,153,0.25))"}} />
          <div className="relative space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Instagram Reel or YouTube Short URL</label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/...  or  https://www.youtube.com/shorts/ID"
                disabled={loading}
                className="w-full px-4 py-3 glass-soft ring-focus text-white placeholder-gray-500 focus:ring-0 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleTranscribe}
              disabled={loading || !url.trim()}
              className="group relative w-full overflow-hidden rounded-xl font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 group-hover:from-blue-500 group-hover:via-indigo-500 group-hover:to-purple-500 transition" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-40 transition" style={{background:"radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3), transparent 70%)"}} />
              <span className="relative flex items-center justify-center gap-3 py-3.5">
                {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Processing..." : "Transcribe"}
              </span>
            </button>
            {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">{error}</div>}
          </div>
        </div>

        {/* Loader Orb */}
        {loading && !result && (
          <div className="flex justify-center mb-12"><div className="loading-orb" /></div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-10">
            {/* Metadata */}
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="glass-soft px-4 py-2 text-sm">
                <span className="text-gray-400">Source Lang: </span>
                <span className="text-white font-medium">{result.meta?.source_language || "Unknown"}</span>
              </div>
              <div className="glass-soft px-4 py-2 text-sm">
                <span className="text-gray-400">Model: </span>
                <span className="text-white font-medium">{result.meta?.model || "whisper"}</span>
              </div>
              {result.meta?.platform && (
                <div className="glass-soft px-4 py-2 text-sm">
                  <span className="text-gray-400">Platform: </span>
                  <span className="text-white font-medium capitalize">{result.meta.platform}</span>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Transcript */}
              <div className="glass p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Transcript</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleRefine}
                      disabled={refining}
                      className="relative px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:from-emerald-500 hover:to-green-500 transition"
                    >
                      {refining && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {refining ? "Refining" : "Fix Grammar (AI)"}
                    </button>
                    <button
                      onClick={() => copyToClipboard(result.transcript, "Transcript")}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-medium text-sm transition"
                    >Copy</button>
                  </div>
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-0 pointer-events-none opacity-10" style={{background:"linear-gradient(135deg,rgba(59,130,246,0.4),rgba(139,92,246,0.4))"}} />
                  <div className="relative bg-black/40 border border-white/10 rounded-xl p-4 max-h-80 overflow-y-auto">
                    <p className="whitespace-pre-wrap leading-relaxed text-gray-200">{result.transcript}</p>
                  </div>
                </div>
              </div>
              {/* SRT */}
              <div className="glass p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">SRT Output</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(srtContent, "SRT")}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-medium text-sm transition"
                    >Copy</button>
                    {result?.meta?.cache_key && (
                      <a
                        href={`${API_BASE}/api/subtitles.srt?url=${encodeURIComponent(result.originalUrl || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-medium text-sm text-white transition"
                      >Download SRT</a>
                    )}
                  </div>
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-0 pointer-events-none opacity-10" style={{background:"linear-gradient(135deg,rgba(236,72,153,0.35),rgba(59,130,246,0.35))"}} />
                  <pre className="relative mono-block bg-black/40 border border-white/10 rounded-xl p-4 max-h-80 overflow-y-auto text-xs leading-relaxed text-gray-300">
{srtContent}
                  </pre>
                </div>
              </div>
              {/* VTT */}
              <div className="glass p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">WebVTT</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(result?.vtt || "", "VTT")}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-medium text-sm transition"
                    >Copy</button>
                    {result?.meta?.cache_key && (
                      <a
                        href={`${API_BASE}/api/subtitles.vtt?url=${encodeURIComponent(result.originalUrl || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-medium text-sm text-white transition"
                      >Download VTT</a>
                    )}
                  </div>
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-0 pointer-events-none opacity-10" style={{background:"linear-gradient(135deg,rgba(59,130,246,0.35),rgba(139,92,246,0.35))"}} />
                  <pre className="relative mono-block bg-black/40 border border-white/10 rounded-xl p-4 max-h-80 overflow-y-auto text-xs leading-relaxed text-gray-300">
{result?.vtt || ''}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copy Toast */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 copy-toast-enter copy-toast-active">
          <div className="glass-soft px-5 py-3 text-sm font-medium flex items-center gap-2">
            <span className="text-emerald-400">✓</span> {copied} copied
          </div>
        </div>
      )}
    </div>
  );
}
