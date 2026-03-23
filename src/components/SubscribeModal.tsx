"use client";

import React, { useState } from "react";

interface SubscribeCriteria {
  languages_in?: string[];
  frameworks_in?: string[];
  databases_in?: string[];
  cloud_in?: string[];
  devops_in?: string[];
  dataScience_in?: string[];
  cyberSecurity_in?: string[];
  softSkills_in?: string[];
  positions_in?: string[];
  locations_in?: string[];
  workMode_in?: string[];
  seniority_in?: string[];
}

interface SubscribeModalProps {
  open: boolean;
  onClose: () => void;
  criteria: SubscribeCriteria;
}

function criteriaLabel(criteria: SubscribeCriteria): string {
  const parts: string[] = [];
  const add = (values: string[] | undefined, label: string) => {
    if (values && values.length > 0) parts.push(`${label}: ${values.join(", ")}`);
  };
  add(criteria.languages_in, "Languages");
  add(criteria.frameworks_in, "Frameworks");
  add(criteria.databases_in, "Databases");
  add(criteria.cloud_in, "Cloud");
  add(criteria.devops_in, "DevOps");
  add(criteria.dataScience_in, "Data Science");
  add(criteria.cyberSecurity_in, "Cyber Security");
  add(criteria.positions_in, "Roles");
  add(criteria.locations_in, "Locations");
  add(criteria.workMode_in, "Work Mode");
  add(criteria.seniority_in, "Seniority");
  return parts.join(" · ") || "All jobs";
}

export function SubscribeModal({ open, onClose, criteria }: SubscribeModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const hasFilters = Object.values(criteria).some((v) => Array.isArray(v) && v.length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, criteria }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to subscribe");
      }
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMessage(e.message || "Something went wrong. Please try again.");
    }
  }

  function handleClose() {
    setEmail("");
    setStatus("idle");
    setErrorMessage("");
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-[#161b22] border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-3 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white !py-0 !text-base">Subscribe to job alerts</h2>
            <p className="text-sm text-gray-400 mt-1">
              Get notified by email when new jobs match your filters.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current filters preview */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-5 text-sm text-gray-300">
          <span className="font-medium text-gray-200">Matching: </span>
          {hasFilters ? criteriaLabel(criteria) : <span className="italic text-gray-500">No filters selected — you&#39;ll receive all new jobs</span>}
        </div>

        {status === "success" ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium text-white">Check your inbox!</p>
            <p className="text-sm text-gray-400 mt-1">
              We sent a confirmation email to <strong className="text-gray-200">{email}</strong>. Click the link inside to activate your alert.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-4 py-2 bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="subscribe-email">
              Email address
            </label>
            <input
              id="subscribe-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            />

            {errorMessage && (
              <p className="mt-2 text-sm text-red-400">{errorMessage}</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-white/10 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {status === "loading" ? "Subscribing..." : "Subscribe"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
