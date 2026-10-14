'use client';

import React, { useState } from 'react';
import { Loader2, FileCode, AlertCircle, ArrowRight } from 'lucide-react';
import { GithubIcon } from '@/components/GithubIcon';
import { RawPackageJson } from '@/types';
import { HistoryItem } from '@/lib/history';
import { useAppSettings } from '@/lib/settingsContext';

interface RepoInputProps {
  onAnalyzeRepo: (repoUrl: string) => void;
  onAnalyzeCustomJson: (json: RawPackageJson, title: string) => void;
  isLoading: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  history?: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
}

export function RepoInput({
  onAnalyzeRepo,
  onAnalyzeCustomJson,
  isLoading,
  inputRef,
  history = [],
  onSelectHistoryItem,
}: RepoInputProps) {
  const { t } = useAppSettings();
  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url');
  const [inputUrl, setInputUrl] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const recentRepos = history.filter((item) => item.repoUrl && !item.isCustomJson && !item.fullName.toLowerCase().includes('demo')).slice(0, 5);

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    onAnalyzeRepo(inputUrl.trim());
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasteError(null);
    if (!pasteContent.trim()) return;

    try {
      const parsed = JSON.parse(pasteContent);
      if (!parsed.dependencies && !parsed.devDependencies) {
        setPasteError(t('input.err_no_deps'));
        return;
      }
      onAnalyzeCustomJson(parsed, parsed.name ? `${parsed.name} (Custom)` : 'Custom package.json');
    } catch {
      setPasteError(t('input.err_invalid_json'));
    }
  };

  const handleDropdownSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const match = recentRepos.find((h) => h.repoUrl === val);
    if (match) onSelectHistoryItem(match);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Top clean controls bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* URL vs Paste toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GithubIcon className="w-3.5 h-3.5" />
            {t('input.github_repo')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            {t('input.paste_json')}
          </button>
        </div>

        {/* Compact recent repositories selector */}
        {recentRepos.length > 0 && <div className="flex items-center gap-2 min-w-0">
          <select
            onChange={handleDropdownSelect}
            defaultValue=""
            disabled={isLoading}
            aria-label={t('input.recent_group')}
            className="w-full min-w-0 xl:max-w-[230px] px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-sans"
          >
            <option value="" disabled>
              {t('input.recent_group')}
            </option>
            {recentRepos.map((h) => (
              <option key={h.repoUrl} value={h.repoUrl}>
                {h.fullName} ({h.grade} • {h.score}/100)
              </option>
            ))}
          </select>
        </div>}
      </div>

      {/* Main Scan Card */}
      <div className="scan-input-surface rounded-2xl p-3 sm:p-4">
        {activeTab === 'url' ? (
          <form onSubmit={handleSubmitUrl} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <GithubIcon className="w-4 h-4" />
                </div>
                <input
                  ref={inputRef as any}
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder={t('input.placeholder')}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isLoading || !inputUrl.trim()}
                  className="flex-1 sm:flex-initial px-6 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('input.scanning')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('input.scan_button')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasteSubmit} className="space-y-3">
            <textarea
              rows={5}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder={`{\n  "name": "my-project",\n  "dependencies": {\n    "next": "14.2.0",\n    "react": "18.2.0",\n    "lodash": "4.17.15"\n  }\n}`}
              disabled={isLoading}
              className="w-full p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />

            {pasteError && (
              <div className="flex items-center gap-2 text-xs text-red-300 bg-red-950/50 border border-red-800/60 p-2.5 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{pasteError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !pasteContent.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('input.scanning')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('input.analyze_custom')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
