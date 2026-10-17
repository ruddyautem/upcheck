'use client';

import React, { useState } from 'react';
import { ArrowRight, Check, Layers, Loader2, Search } from 'lucide-react';
import { useAppSettings } from '@/lib/settingsContext';
import { GithubIcon } from '@/components/GithubIcon';

interface RepositoryOption {
  fullName: string;
  name: string;
}

interface GitHubScanFormProps {
  githubToken?: string;
  isLoading: boolean;
  onAnalyzeRepo: (repoUrl: string) => void;
  onAnalyzeRepos: (repoUrls: string[]) => void;
  children?: React.ReactNode;
}

const ANONYMOUS_REPOSITORY_LIMIT = 10;

export function GitHubScanForm({
  githubToken,
  isLoading,
  onAnalyzeRepo,
  onAnalyzeRepos,
  children,
}: GitHubScanFormProps) {
  const { t } = useAppSettings();
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [input, setInput] = useState('');
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasToken = Boolean(githubToken);
  const selectionLimit = hasToken ? Infinity : ANONYMOUS_REPOSITORY_LIMIT;

  const switchMode = (nextMode: 'single' | 'multiple') => {
    setMode(nextMode);
    setInput('');
    setRepositories([]);
    setSelected([]);
    setError(null);
  };

  const discoverRepositories = async () => {
    if (!input.trim()) return;
    setIsDiscovering(true);
    setError(null);
    setRepositories([]);
    setSelected([]);

    try {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: input.trim(), githubToken: githubToken || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to list repositories.');
      }
      setRepositories(data.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to list repositories.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const toggleRepository = (fullName: string) => {
    setSelected((current) => {
      if (current.includes(fullName)) return current.filter((repository) => repository !== fullName);
      if (current.length >= selectionLimit) return current;
      return [...current, fullName];
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'single') {
      if (!input.trim()) return;
      if (!input.trim().includes('/')) {
        setError(t('input.single_repo_error'));
        return;
      }
      onAnalyzeRepo(input.trim());
      return;
    }
    if (repositories.length === 0) {
      void discoverRepositories();
    } else if (selected.length > 0) {
      onAnalyzeRepos(selected);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='home-github-form flex h-full flex-1 flex-col gap-4 lg:gap-5'>
      <div className='home-github-tabs grid w-full grid-cols-2 gap-1 border border-slate-800 bg-slate-950 p-1'>
        {(['single', 'multiple'] as const).map((option) => {
          const active = mode === option;
          return (
            <button
              key={option}
              type='button'
              onClick={() => switchMode(option)}
              className={`inline-flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-xs font-semibold transition-colors lg:py-3.5 cursor-pointer ${
                active
                  ? 'bg-slate-100 text-slate-950'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {option === 'single' ? <GithubIcon className='w-3.5 h-3.5' /> : <Layers className='w-3.5 h-3.5' />}
              {t(`input.${option === 'single' ? 'single_repo' : 'multiple_repos'}`)}
            </button>
          );
        })}
      </div>

      <div className='flex min-w-0 overflow-hidden border border-emerald-500/30 bg-emerald-950/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/70 transition-all'>
          <span className='flex items-center shrink-0 bg-emerald-500/20 px-3.5 text-xs sm:text-sm font-medium text-emerald-100 border-r border-emerald-500/30'>github.com</span>
          <span className='flex items-center shrink-0 pl-3.5 text-sm font-mono text-emerald-300 select-none'>/</span>
          <input
            type='text'
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (repositories.length > 0) {
                setRepositories([]);
                setSelected([]);
              }
            }}
            placeholder={t(mode === 'single' ? 'input.single_placeholder' : 'input.multiple_placeholder')}
            disabled={isLoading || isDiscovering}
            className='min-w-0 flex-1 bg-transparent pr-3.5 py-3.5 text-xs sm:text-sm text-white placeholder:text-emerald-100/40 focus:outline-none font-mono lg:py-4'
            aria-label={t(mode === 'single' ? 'input.single_placeholder' : 'input.multiple_placeholder')}
          />
      </div>

      {mode === 'multiple' && repositories.length > 0 && (
        <div className='rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden text-left'>
          <div className='p-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5'>
            <div className='text-xs font-semibold text-slate-200'>{t('input.select_repos')}</div>
            <div className='text-[11px] text-slate-400'>
              {selected.length}{Number.isFinite(selectionLimit) ? ` / ${selectionLimit}` : ''} {t('input.selected')}
              {!hasToken && <span className='text-amber-300'> · {t('input.no_token_limit')}</span>}
            </div>
          </div>
          <div className='max-h-64 overflow-y-auto divide-y divide-slate-800/80'>
            {repositories.map((repository) => {
              const isSelected = selected.includes(repository.fullName);
              const isDisabled = !isSelected && selected.length >= selectionLimit;
              return (
                <label key={repository.fullName} className={`flex items-center gap-3 px-3 py-2.5 text-xs ${isDisabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-900/60'}`}>
                  <input type='checkbox' checked={isSelected} disabled={isDisabled} onChange={() => toggleRepository(repository.fullName)} className='sr-only' />
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-600 bg-slate-900'}`}>
                    {isSelected && <Check className='w-3 h-3' />}
                  </span>
                  <span className='font-mono text-slate-200 truncate'>{repository.fullName}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className='text-xs text-red-300' role="alert">{error}</p>}

      {children}

      <button
        type='submit'
        disabled={isLoading || isDiscovering || !input.trim() || (mode === 'multiple' && repositories.length > 0 && selected.length === 0)}
        className='mt-auto flex w-full shrink-0 items-center justify-center gap-2 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 lg:py-3.5 cursor-pointer whitespace-nowrap'
      >
        {isLoading || isDiscovering ? <Loader2 className='w-4 h-4 animate-spin' /> : mode === 'multiple' && repositories.length === 0 ? <Search className='w-4 h-4' /> : <ArrowRight className='w-4 h-4' />}
        <span>{isLoading ? t('input.scanning') : isDiscovering ? t('input.finding_repos') : mode === 'multiple' && repositories.length === 0 ? t('input.find_repos') : t('input.scan_button')}</span>
      </button>
    </form>
  );
}
