"use client";

import { useEffect, useState } from "react";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Bell,
  BellOff,
  RefreshCw,
  Unlink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  getTelegramStatus,
  generateTelegramLinkCode,
  updateTelegramPreferences,
  sendTelegramTest,
  unlinkTelegram,
} from "@/lib/api";
import type { TelegramStatus, TelegramLinkCodeResponse } from "@/types";

interface TelegramConnectPanelProps {
  ownerId?: string;
  className?: string;
}

export function TelegramConnectPanel({
  ownerId = "default_user",
  className = "",
}: TelegramConnectPanelProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeData, setCodeData] = useState<TelegramLinkCodeResponse | null>(null);
  const [testingSend, setTestingSend] = useState(false);
  const [updatingPref, setUpdatingPref] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getTelegramStatus(ownerId);
      setStatus(res);
    } catch {
      toast("Could not reach backend to load Telegram status.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [ownerId]);

  const handleGenerateCode = async () => {
    try {
      setGeneratingCode(true);
      const res = await generateTelegramLinkCode(ownerId);
      if (res) {
        setCodeData(res);
        toast("New link code generated! Send it to the bot or click Open in Telegram.", "success");
      } else {
        toast("Failed to generate link code. Ensure backend is running.", "error");
      }
    } catch {
      toast("Network error generating link code.", "error");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (!codeData) return;
    navigator.clipboard.writeText(codeData.code);
    toast(`Copied code: ${codeData.code}`, "info");
  };

  const handleToggleNotifications = async () => {
    if (!status) return;
    const nextState = !status.notifications_enabled;
    try {
      setUpdatingPref(true);
      const res = await updateTelegramPreferences(nextState, ownerId);
      if (res.success) {
        setStatus((prev) => (prev ? { ...prev, notifications_enabled: nextState } : null));
        toast(res.message, "success");
      } else {
        toast(res.message || "Failed to update notification preferences.", "error");
      }
    } catch {
      toast("Network error updating preferences.", "error");
    } finally {
      setUpdatingPref(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setTestingSend(true);
      const res = await sendTelegramTest(
        ownerId,
        "🎉 Test from ODYSSEIO Web App! Your Telegram connection is live and verified."
      );
      if (res.success) {
        toast("Test notification delivered to your Telegram chat!", "success");
      } else {
        toast(res.message || "Could not deliver Telegram notification.", "error");
      }
    } catch {
      toast("Network error testing Telegram notification.", "error");
    } finally {
      setTestingSend(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Are you sure you want to disconnect this Telegram chat?")) return;
    try {
      setLoading(true);
      const res = await unlinkTelegram(ownerId);
      if (res.success) {
        toast(res.message, "info");
        setCodeData(null);
        await fetchStatus();
      } else {
        toast(res.message, "error");
      }
    } catch {
      toast("Error disconnecting Telegram chat.", "error");
    } finally {
      setLoading(false);
    }
  };

  const botName = status?.bot_username || "odysseioBot";

  return (
    <section
      className={`bg-white rounded-[20px] border border-border-theme p-6 space-y-5 shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center font-bold">
              <Send size={16} className="-ml-0.5" />
            </div>
            <h2 className="font-semibold text-text text-base">Telegram Updates</h2>
            {status?.linked ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 size={12} />
                Connected
              </Badge>
            ) : (
              <Badge variant="default" className="text-text-muted bg-neutral-100">
                Not Connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Receive itinerary summaries, replan alerts, and timeline updates directly in your
            Telegram chat.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStatus}
          disabled={loading}
          title="Refresh Telegram status"
          className="p-2 text-text-muted hover:text-forest hover:bg-sage/20 rounded-full transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Bot Info Banner */}
      <div className="bg-[#0088cc]/5 border border-[#0088cc]/20 rounded-[14px] p-3.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-text">
          <span className="font-medium">Official Bot:</span>
          <span className="font-mono text-[#0088cc] font-semibold">@{botName}</span>
        </div>
        <a
          href={`https://t.me/${botName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-[#0088cc] hover:underline"
        >
          Open Bot <ExternalLink size={12} />
        </a>
      </div>

      {/* Content based on Linked State */}
      {status?.linked ? (
        <div className="space-y-4 pt-1">
          {/* Linked Details Box */}
          <div className="p-4 rounded-[14px] bg-sage/10 border border-forest/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Chat ID</span>
              <span className="font-mono font-medium text-text">
                {status.chat_id ? `${status.chat_id.slice(0, 4)}...${status.chat_id.slice(-4)}` : "Configured"}
              </span>
            </div>
            {status.username && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Telegram Handle</span>
                <span className="font-medium text-text">@{status.username}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Notification Status</span>
              <span className="font-medium text-forest">
                {status.notifications_enabled ? "Opted In (Active)" : "Paused"}
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={updatingPref}
              onClick={handleToggleNotifications}
              className="w-full text-xs"
            >
              {status.notifications_enabled ? (
                <>
                  <BellOff size={14} />
                  Pause Notifications
                </>
              ) : (
                <>
                  <Bell size={14} />
                  Enable Notifications
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={testingSend}
              onClick={handleSendTest}
              className="w-full text-xs"
            >
              <Send size={14} />
              {testingSend ? "Sending test..." : "Send Test Message"}
            </Button>
          </div>

          {/* Unlink Row */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleUnlink}
              className="text-xs text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1.5"
            >
              <Unlink size={13} />
              Disconnect Telegram Chat
            </button>
          </div>
        </div>
      ) : (
        /* Not linked yet */
        <div className="space-y-4 pt-1">
          {!codeData ? (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">
                To link your chat, generate a single-use verification code and send it to the bot.
              </p>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={generatingCode}
                onClick={handleGenerateCode}
                className="w-full sm:w-auto text-xs"
              >
                <Sparkles size={14} />
                {generatingCode ? "Generating..." : "Generate Link Code"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-[14px] bg-[#F8F3E9] dark:bg-forest/10 border border-forest/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text">Your Single-Use Link Code:</span>
                <span className="text-[11px] text-text-muted">Expires in 15 min</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3.5 py-2 rounded-[10px] bg-white border border-forest/30 font-mono font-bold text-base tracking-wider text-forest flex-1">
                  {codeData.code}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyCode}
                  title="Copy Code"
                >
                  <Copy size={14} />
                </Button>
              </div>

              <p className="text-[11px] text-text-muted leading-relaxed">
                Send <code className="bg-white px-1 py-0.5 rounded border font-mono">/link {codeData.code}</code> in Telegram to <span className="font-semibold">@{botName}</span>, or click below:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={codeData.deep_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[#0088cc] text-white text-xs font-medium hover:bg-[#0077b5] transition-all"
                >
                  <Send size={13} />
                  Open in Telegram (@{botName})
                </a>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchStatus}
                  className="text-xs"
                >
                  <RefreshCw size={12} />
                  Verify Connection
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
