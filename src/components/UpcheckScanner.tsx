"use client";

import React, { useState } from "react";
import {
  FileCode,
  ArrowRight,
  Loader2,
  History,
  AlertCircle,
  Info,
  Activity,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { GithubIcon } from "@/components/GithubIcon";
import { RawPackageJson } from "@/types";
import { HistoryItem } from "@/lib/history";
import { useAppSettings } from "@/lib/settingsContext";

interface UpcheckScannerProps {
  onAnalyzeRepo: (repoUrl: string) => void;
  onAnalyzeCustomJson: (json: RawPackageJson, title: string) => void;
  isLoading: boolean;
  history?: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onOpenTokenModal: () => void;
  onOpenInfoModal: () => void;
  compact?: boolean;
}

export function UpcheckScanner({
  onAnalyzeRepo,
  onAnalyzeCustomJson,
  isLoading,
  history = [],
  onSelectHistoryItem,
  onOpenTokenModal,
  onOpenInfoModal,
  compact = false,
}: UpcheckScannerProps) {
  const { t } = useAppSettings();
  const [activeTab, setActiveTab] = useState<"url" | "paste">("url");
  const [inputUrl, setInputUrl] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Verified repositories from history
  const verifiedRepos = history
    .filter(
      (item) =>
        item.repoUrl &&
        !item.isCustomJson &&
        !item.fullName.toLowerCase().includes("demo"),
    )
    .slice(0, 8);

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

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    onAnalyzeRepo(inputUrl.trim());
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;
    processJsonString(pasteContent, "Custom package.json");
  };

  const handleDropdownSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const match = verifiedRepos.find((h) => h.repoUrl === val);
    if (match) onSelectHistoryItem(match);
    e.target.value = "";
  };

  return (
    <div
      className={`w-full max-w-4xl mx-auto flex flex-col items-center text-center ${compact ? "py-4" : "py-8 sm:py-14"}`}
    >
      {/* 1. Centered Upcheck Brand Header */}
      {!compact && (
        <div className='flex flex-col items-center space-y-3 mb-8'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-blue-500 flex items-center justify-center shadow-xl shadow-blue-500/20'>
              <Activity className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
            </div>
            <div className='flex items-center gap-2'>
              <h1 className='text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-sans'>
                upcheck<span className='text-blue-500'>.</span>
              </h1>
              <span className='text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20'>
                v1.2
              </span>
            </div>
          </div>

          <p className='text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed px-4'>
            {t("hero.description")}
          </p>
        </div>
      )}

      {/* 2. Main Centered Scanner Box */}
      <div className='w-full max-w-3xl rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-black/60 space-y-5 text-left'>
        {/* Top Controls Bar: 2 Tabs + Quick History Dropdown */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
          {/* Toggle Buttons */}
          <div className='flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start'>
            <button
              type='button'
              onClick={() => setActiveTab("url")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "url"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <GithubIcon className='w-3.5 h-3.5' />
              <span>{t("input.github_repo")}</span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab("paste")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "paste"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode className='w-3.5 h-3.5' />
              <span>{t("input.paste_json")}</span>
            </button>
          </div>

          {/* Quick select dropdown for verified repos */}
          {verifiedRepos.length > 0 && (
            <div className='flex items-center gap-2 min-w-0'>
              <select
                onChange={handleDropdownSelect}
                defaultValue=''
                disabled={isLoading}
                aria-label={t("input.recent_group")}
                className='w-full sm:w-auto min-w-[210px] px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-sans'
              >
                <option value='' disabled>
                  {t("input.recent_group")} ({verifiedRepos.length})
                </option>
                {verifiedRepos.map((h) => (
                  <option key={h.repoUrl} value={h.repoUrl}>
                    {h.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Input Form Body */}
        {activeTab === "url" ? (
          <form onSubmit={handleSubmitUrl} className='space-y-4'>
            {/* Input & Button in clean flex row — NO OVERLAP */}
            <div className='flex flex-col sm:flex-row gap-2.5'>
              <div className='relative flex-1 min-w-0'>
                <div className='absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400'>
                  <GithubIcon className='w-4 h-4' />
                </div>
                <input
                  type='text'
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder={t("input.placeholder")}
                  disabled={isLoading}
                  className='w-full pl-10 pr-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono transition-all'
                />
              </div>

              <button
                type='submit'
                disabled={isLoading || !inputUrl.trim()}
                className='px-6 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap'
              >
                {isLoading ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>{t("input.scanning")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("input.scan_button")}</span>
                    <ArrowRight className='w-4 h-4' />
                  </>
                )}
              </button>
            </div>

            {/* Already verified git repositories */}
            {verifiedRepos.length > 0 && (
              <div className='pt-3 border-t border-slate-800/80 space-y-2'>
                <div className='flex items-center justify-between text-xs text-slate-400'>
                  <span className='font-semibold flex items-center gap-1.5 text-slate-300'>
                    <History className='w-3.5 h-3.5 text-blue-400' />
                    {t("input.recent_group")}
                  </span>
                  <span className='text-[11px] text-slate-500 hidden sm:inline'>
                    Cliquez pour réanalyser
                  </span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
                  {verifiedRepos.map((item) => (
                    <button
                      key={item.repoUrl}
                      type='button'
                      onClick={() => onSelectHistoryItem(item)}
                      className='p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors text-left flex items-center gap-3 group cursor-pointer'
                    >
                      {/* Grade letter in colored box with "note" underneath */}
                      <div
                        className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 ${getGradeBadgeClass(item.grade)}`}
                      >
                        <span className='font-black text-sm leading-none'>
                          {item.grade}
                        </span>
                        <span className='text-[8px] font-bold uppercase tracking-wider leading-none mt-0.5 opacity-90'>
                          {t("overview.grade")}
                        </span>
                      </div>

                      {/* Repo Name and Package Count */}
                      <div className='min-w-0 flex-1'>
                        <div className='font-mono text-xs font-bold text-slate-200 group-hover:text-blue-400 truncate transition-colors'>
                          {item.fullName}
                        </div>
                        <div className='text-[10px] text-slate-500 mt-0.5'>
                          {item.totalPackages} paquets
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handlePasteSubmit} className='space-y-4'>
            {/* File Upload Drop Zone - no transition animation on layout */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-4 rounded-xl border border-dashed flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
              }`}
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0'>
                  <Upload className='w-4 h-4' />
                </div>
                <div>
                  <div className='text-xs font-semibold text-slate-200'>
                    {t("input.upload_file")}
                  </div>
                  <div className='text-[11px] text-slate-500'>
                    {t("input.drag_drop_hint")}
                  </div>
                </div>
              </div>

              <label className='px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0'>
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
            <div>
              <div className='text-[11px] text-slate-400 mb-1.5 font-medium'>
                {t("input.paste_placeholder")}
              </div>
              <textarea
                rows={5}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder={`{\n  "name": "my-project",\n  "dependencies": {\n    "next": "15.0.0",\n    "react": "19.0.0",\n    "lodash": "4.17.21"\n  }\n}`}
                disabled={isLoading}
                className='w-full p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono'
              />
            </div>

            {pasteError && (
              <div className='flex items-center gap-2 text-xs text-red-300 bg-red-950/50 border border-red-800/60 p-2.5 rounded-lg text-left'>
                <AlertCircle className='w-4 h-4 shrink-0 text-red-400' />
                <span>{pasteError}</span>
              </div>
            )}

            <div className='flex justify-end'>
              <button
                type='submit'
                disabled={isLoading || !pasteContent.trim()}
                className='px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer'
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
        )}
      </div>

      {/* 3. Subtle Privacy / Disclaimer Notice */}
      <div className='max-w-xl mx-auto mt-6 text-[11px] text-slate-500 leading-relaxed px-4'>
        <span>{t("home.disclaimer_pre")} </span>
        <button
          onClick={onOpenInfoModal}
          className='text-cyan-400 hover:text-cyan-300 font-medium underline cursor-pointer'
        >
          {t("home.learn_more")}
        </button>
      </div>

      {/* 4. Bottom GitHub Token Banner */}
      <div className='w-full max-w-3xl mt-5'>
        <button
          onClick={onOpenTokenModal}
          className='w-full p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer'
        >
          <Info className='w-3.5 h-3.5 text-blue-400 shrink-0' />
          <span>
            {t("home.banner_token")}{" "}
            <strong className='text-blue-400 underline font-semibold'>
              {t("home.banner_token_link")}
            </strong>
          </span>
        </button>
      </div>
    </div>
  );
}
