"use client";

import React, { useState } from "react";
import {
  FileCode,
  ArrowRight,
  Loader2,
  History,
  Clock,
  AlertCircle,
  Info,
  Layers,
  Upload,
} from "lucide-react";
import { GithubIcon } from "@/components/GithubIcon";
import { GitHubScanForm } from "@/components/GitHubScanForm";
import { RawPackageJson } from "@/types";
import { HistoryItem } from "@/lib/history";
import { useAppSettings } from "@/lib/settingsContext";

interface UpcheckScannerProps {
  onAnalyzeRepo: (repoUrl: string) => void;
  onAnalyzeRepos: (repoUrls: string[]) => void;
  onAnalyzeCustomJson: (json: RawPackageJson, title: string) => void;
  isLoading: boolean;
  githubToken?: string;
  history?: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onOpenTokenModal: () => void;
  compact?: boolean;
}

export function UpcheckScanner({
  onAnalyzeRepo,
  onAnalyzeRepos,
  onAnalyzeCustomJson,
  isLoading,
  githubToken,
  history = [],
  onSelectHistoryItem,
  onOpenTokenModal,
  compact = false,
}: UpcheckScannerProps) {
  const { t, locale } = useAppSettings();
  const [pasteContent, setPasteContent] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const recentScans = history
    .filter(
      (item) =>
        (item.repoUrl || item.isMultiScan) &&
        !item.isCustomJson &&
        !item.fullName.toLowerCase().includes("demo"),
    )
    .slice(0, 10);

  const formatCheckedAt = (timestamp: string) => {
    const checkedAt = new Date(timestamp);
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(checkedAt);
  };

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-emerald-600 text-white ring-1 ring-emerald-500/40 shadow-sm shadow-emerald-900/30";
      case "B":
        return "bg-sky-600 text-white ring-1 ring-sky-500/40 shadow-sm shadow-sky-900/30";
      case "C":
        return "bg-amber-600 text-white ring-1 ring-amber-500/40 shadow-sm shadow-amber-900/30";
      case "D":
        return "bg-orange-600 text-white ring-1 ring-orange-500/40 shadow-sm shadow-orange-900/30";
      default:
        return "bg-red-600 text-white ring-1 ring-red-500/40 shadow-sm shadow-red-900/30";
    }
  };

  const processJsonString = (rawJson: string, fallbackTitle: string) => {
    setPasteError(null);
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed.dependencies && !parsed.devDependencies) {
        setPasteError(t("input.err_no_deps"));
        return;
      }
      onAnalyzeCustomJson(
        parsed,
        parsed.name ? `${parsed.name} (Custom)` : fallbackTitle,
      );
    } catch {
      setPasteError(t("input.err_invalid_json"));
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPasteContent(content);
        processJsonString(content, file.name || "package.json");
      }
    };
    reader.onerror = () => {
      setPasteError("Erreur de lecture du fichier.");
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;
    processJsonString(pasteContent, "Custom package.json");
  };

  return (
    <div
      className={`w-full max-w-6xl mx-auto flex flex-col items-center text-center ${compact ? "py-3" : "h-full flex-1 py-8 sm:py-12 lg:min-h-0 lg:py-0"}`}
    >
      {/* 1. Centered Upcheck Brand Header */}
      {!compact && (
        <div className='home-scanner-hero mb-8 flex shrink-0 flex-col items-center gap-4 lg:mb-6 lg:gap-3'>
          <div className='flex items-center gap-3'>
            <img src='/icon.svg' alt='' aria-hidden='true' className='h-10 w-10 shrink-0 sm:h-12 sm:w-12' />
            <h1 className='text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-sans'>
              upcheck<span className='text-blue-500'>.</span>
            </h1>
          </div>

          <p className='text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed px-4'>
            {t("hero.description")}
          </p>
        </div>
      )}

      {/* Both scan methods stay visible, with each card sized by its content. */}
      <div className='grid w-full grid-cols-1 items-stretch gap-5 text-left lg:min-h-0 lg:max-h-[760px] lg:flex-1 lg:grid-cols-2 lg:gap-6'>
        <section className='home-scanner-card flex min-w-0 flex-col gap-6 border border-emerald-500/25 bg-slate-900/80 p-5 shadow-xl shadow-black/20 sm:p-6 lg:min-h-0 lg:gap-[clamp(0.75rem,2vh,2rem)] lg:overflow-hidden lg:p-[clamp(1rem,2vh,2rem)]'>
          <h2 className='flex items-center gap-2 border-b border-slate-800 pb-4 text-base font-bold text-white lg:pb-5'>
            <GithubIcon className='h-5 w-5 text-emerald-400' />
            {t("input.github_repo")}
          </h2>
          <div className='flex flex-1 flex-col gap-6 lg:min-h-0 lg:gap-[clamp(0.75rem,2vh,2rem)]'>
            <GitHubScanForm
              githubToken={githubToken}
              isLoading={isLoading}
              onAnalyzeRepo={onAnalyzeRepo}
              onAnalyzeRepos={onAnalyzeRepos}
            >
              {/* Already verified git repositories */}
              {recentScans.length > 0 && (
                <div className='home-recent-history space-y-3 lg:shrink-0'>
                  <div className='flex items-center justify-between gap-3 text-xs text-slate-400'>
                    <span className='font-semibold flex items-center gap-1.5 text-slate-300'>
                      <History className='w-3.5 h-3.5 text-blue-400' />
                      {t("input.recent_group")}
                    </span>
                    <span className='text-[11px] text-slate-500 hidden sm:inline'>
                      {t("input.recent_hint")}
                    </span>
                  </div>

                  <div className='grid min-h-60 grid-cols-1 gap-2.5 sm:grid-cols-2'>
                    {recentScans.map((item) => {
                      const checkedAt = formatCheckedAt(item.timestamp);

                      return (
                      <button
                        key={item.analysisKey || item.repoUrl}
                        type='button'
                        onClick={() => onSelectHistoryItem(item)}
                        className='group flex min-h-16 min-w-0 items-center gap-3 border border-slate-800 bg-slate-950/70 p-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-900 lg:min-h-18 cursor-pointer'
                      >
                        {item.isMultiScan ? (
                          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-200'>
                            <Layers className='h-4 w-4' />
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 ${getGradeBadgeClass(item.grade)}`}>
                            <span className='font-black text-sm leading-none'>{item.grade}</span>
                            <span className='text-[8px] font-bold uppercase tracking-wider leading-none mt-0.5 opacity-90'>{t("overview.grade")}</span>
                          </div>
                        )}

                        <div className='min-w-0 flex-1'>
                          <div className='font-mono text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate transition-colors'>
                            {item.isMultiScan ? t("input.multi_scan") : item.fullName}
                          </div>
                          <div className='text-[10px] text-slate-500 mt-0.5'>
                            {item.isMultiScan
                              ? `${item.repositoryCount || 0} ${t("input.repositories")} · ${item.totalPackages} ${t("owner_scan.packages")}`
                              : `${item.totalPackages} ${t("owner_scan.packages")}`}
                          </div>
                          <time
                            dateTime={item.timestamp}
                            className='mt-1 flex items-center gap-1 text-[10px] text-slate-500'
                            title={checkedAt}
                          >
                            <Clock className='h-3 w-3 shrink-0 text-emerald-400' aria-hidden='true' />
                            <span className='truncate'>{checkedAt}</span>
                          </time>
                        </div>
                      </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </GitHubScanForm>
          </div>
        </section>
        <section className='home-scanner-card flex min-w-0 flex-col gap-6 border border-slate-700/70 bg-slate-900/80 p-5 shadow-xl shadow-black/20 sm:p-6 lg:min-h-0 lg:gap-[clamp(0.75rem,2vh,2rem)] lg:overflow-hidden lg:p-[clamp(1rem,2vh,2rem)]'>
          <h2 className='flex items-center gap-2 border-b border-slate-800 pb-4 text-base font-bold text-white lg:pb-5'>
            <FileCode className='h-5 w-5 text-emerald-400' />
            {t("input.paste_json")}
          </h2>
          <form onSubmit={handlePasteSubmit} className='flex flex-1 flex-col gap-6 lg:min-h-0 lg:gap-[clamp(0.75rem,2vh,1.75rem)] lg:overflow-y-auto'>
            {/* File Upload Drop Zone - no transition animation on layout */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`home-json-upload flex flex-col items-stretch justify-center gap-4 border border-dashed p-5 sm:min-h-28 sm:flex-row sm:items-center sm:justify-between lg:min-h-[clamp(5.5rem,12vh,8rem)] lg:shrink-0 ${
                isDragging
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-slate-700 bg-slate-950/50 hover:border-emerald-500/50"
              }`}
            >
              <div className='flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left'>
                <div className='flex h-11 w-11 shrink-0 items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'>
                  <Upload className='w-4 h-4' />
                </div>
                <div>
                  <div className='text-xs font-semibold leading-relaxed text-slate-200'>
                    {t("input.upload_file")}
                  </div>
                  <div className='mt-1 hidden text-[11px] leading-relaxed text-slate-400 sm:block'>
                    {t("input.drag_drop_hint")}
                  </div>
                </div>
              </div>

              <label className='w-full shrink-0 cursor-pointer border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-center text-xs font-medium text-slate-200 transition-colors hover:border-emerald-500/50 hover:bg-slate-700 sm:w-auto'>
                <span>{t("input.browse_files")}</span>
                <input
                  type='file'
                  accept='.json,application/json'
                  onChange={handleFileChange}
                  className='hidden'
                />
              </label>
            </div>

            {/* Direct JSON Pasting Textarea */}
            <div className='lg:flex lg:min-h-24 lg:flex-1 lg:flex-col'>
              <div className='mb-2.5 text-xs font-medium leading-relaxed text-slate-300'>
                {t("input.paste_placeholder")}
              </div>
              <textarea
                rows={9}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder={`{\n  "name": "my-project",\n  "dependencies": {\n    "next": "15.0.0",\n    "react": "19.0.0",\n    "lodash": "4.17.21"\n  }\n}`}
                disabled={isLoading}
                className='block min-h-52 w-full resize-y border border-slate-700 bg-slate-950/80 p-4 font-mono text-xs leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 lg:h-full lg:min-h-16 lg:flex-1 lg:resize-none'
              />
            </div>

            {pasteError && (
              <div className='flex items-center gap-2 text-xs text-red-300 bg-red-950/50 border border-red-800/60 p-2.5 rounded-lg text-left' role='alert'>
                <AlertCircle className='w-4 h-4 shrink-0 text-red-400' />
                <span>{pasteError}</span>
              </div>
            )}

            <div className='mt-auto pt-1 lg:shrink-0'>
              <button
                type='submit'
                disabled={isLoading || !pasteContent.trim()}
                className='flex w-full items-center justify-center gap-2 bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
              >
                {isLoading ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>{t("input.scanning")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("input.analyze_custom")}</span>
                    <ArrowRight className='w-4 h-4' />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* The token shortcut stays visible; data-handling details live in the info dialog. */}
      <div className='home-scanner-token mt-auto w-full max-w-6xl shrink-0 pt-6 lg:mt-4 lg:pt-0'>
        <button
          onClick={onOpenTokenModal}
          className='w-full border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400 transition-colors hover:border-emerald-500/40 hover:bg-slate-900 hover:text-slate-200 flex items-center justify-center gap-2 cursor-pointer'
        >
          <Info className='w-3.5 h-3.5 text-emerald-400 shrink-0' />
          <span>
            {t("home.banner_token")}{" "}
            <strong className='text-emerald-400 underline font-semibold'>
              {t("home.banner_token_link")}
            </strong>
          </span>
        </button>
      </div>
    </div>
  );
}
