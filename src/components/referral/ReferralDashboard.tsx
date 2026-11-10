"use client";

import { useState } from "react";
import { AlertCircle, Gift, RefreshCw } from "lucide-react";

interface Referral {
  id: string;
  friendName: string;
  courseName: string;
  rewardAmount: number;
  payoutStatus: "PENDING" | "PAID" | "PROCESSING";
}

interface ReferralStats {
  sent: number;
  enrolled: number;
  rewardsEarned: number;
}

interface Props {
  referralCode: string;
  stats: ReferralStats;
  referrals: Referral[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const statusStyles = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-green-50 text-green-700",
  PROCESSING: "bg-blue-50 text-blue-700",
};

export default function ReferralDashboard({
  referralCode,
  stats,
  referrals,
  isLoading = false,
  error = null,
  onRetry,
}: Props) {
  const [copied, setCopied] = useState(false);

  const referralLink = `https://sorobanlard.com/ref/${referralCode}`;

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading referral dashboard"
        data-testid="referral-dashboard-loading"
        className="space-y-6"
      >
        <div className="h-8 w-48 rounded-lg bg-ink-100 animate-pulse" />
        <div className="h-36 w-full rounded-xl bg-ink-50 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-xl bg-ink-50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        data-testid="referral-dashboard-error"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3"
      >
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <div>
          <p className="text-sm font-semibold text-red-900">
            Unable to load referral dashboard
          </p>
          <p className="text-xs text-red-700 mt-1">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shareEmail = () => {
    const subject = encodeURIComponent("Join me on SorobanLard");
    const body = encodeURIComponent(
      `Hey! Join me on SorobanLard and start learning today: ${referralLink}`,
    );

    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent(
      `Hey! Join me on SorobanLard and start learning today: ${referralLink}`,
    );

    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const shareLinkedIn = () => {
    const url = encodeURIComponent(referralLink);

    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Refer & Earn</h1>
        <p className="text-sm text-ink-500 mt-1">
          Invite your friends to SorobanLard and earn rewards when they enroll.
        </p>
      </div>

      {/* Referral link */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Your referral link</h2>
        <p className="text-sm text-ink-500 mt-1">
          Share this link with your friends to invite them to SorobanLard.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="flex-1 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm truncate">
            {referralLink}
          </div>

          <button
            type="button"
            onClick={copyLink}
            className="btn-primary whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" onClick={shareEmail} className="btn-secondary">
            Email
          </button>

          <button
            type="button"
            onClick={shareWhatsApp}
            className="btn-secondary"
          >
            WhatsApp
          </button>

          <button
            type="button"
            onClick={shareLinkedIn}
            className="btn-secondary"
          >
            LinkedIn
          </button>
        </div>
      </section>

      {/* Stats */}
      <section>
        <h2 className="section-heading">Referral stats</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-sm text-ink-500">Referrals sent</p>
            <p className="text-2xl font-semibold mt-2">{stats.sent}</p>
          </div>

          <div className="card p-5">
            <p className="text-sm text-ink-500">Referrals enrolled</p>
            <p className="text-2xl font-semibold mt-2">{stats.enrolled}</p>
          </div>

          <div className="card p-5">
            <p className="text-sm text-ink-500">Rewards earned</p>
            <p className="text-2xl font-semibold mt-2">
              {stats.rewardsEarned.toLocaleString()} XLM
            </p>
          </div>
        </div>
      </section>

      {/* Rewards */}
      <section>
        <h2 className="section-heading">Referral rewards</h2>

        <div className="card overflow-hidden">
          {referrals.length === 0 ? (
            <div
              data-testid="referral-dashboard-empty"
              className="p-8 text-center space-y-2"
            >
              <Gift className="h-8 w-8 text-ink-300 mx-auto" />
              <p className="text-sm font-medium text-ink-700">
                You haven&apos;t earned any referral rewards yet.
              </p>
              <p className="text-xs text-ink-400">
                Share your referral link above with friends to start earning XLM rewards.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100">
                    <th className="text-left font-medium px-5 py-4">Friend</th>
                    <th className="text-left font-medium px-5 py-4">Course</th>
                    <th className="text-left font-medium px-5 py-4">Reward</th>
                    <th className="text-left font-medium px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {referrals.map((referral) => (
                    <tr
                      key={referral.id}
                      className="border-b border-ink-100 last:border-0"
                    >
                      <td className="px-5 py-4">{referral.friendName}</td>
                      <td className="px-5 py-4">{referral.courseName}</td>
                      <td className="px-5 py-4">
                        {referral.rewardAmount.toLocaleString()} XLM
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            statusStyles[referral.payoutStatus]
                          }`}
                        >
                          {referral.payoutStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="section-heading">How it works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Share your link",
              description: "Send your unique referral link to friends.",
            },
            {
              step: "2",
              title: "Friend enrolls",
              description: "Your friend signs up and enrolls in a paid course.",
            },
            {
              step: "3",
              title: "Earn rewards",
              description: "You receive a reward when the referral qualifies.",
            },
          ].map((item) => (
            <div key={item.step} className="card p-5">
              <div className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center font-semibold">
                {item.step}
              </div>

              <h3 className="font-semibold mt-4">{item.title}</h3>
              <p className="text-sm text-ink-500 mt-2">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
