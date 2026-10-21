'use client';

import React from 'react';
import { X, Sparkles, Database, HelpCircle, ShieldCheck } from 'lucide-react';
import { useAppSettings } from '@/lib/settingsContext';

interface InfoModalProps {
  onClose: () => void;
}

export function InfoModal({ onClose }: InfoModalProps) {
  const { t } = useAppSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('info.title')}</h3>
              <p className="text-xs text-slate-400">{t('info.subtitle')}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300 leading-relaxed">
          {/* Section 1: Data Sources */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>{t('info.sources_title')}</span>
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
              <li>
                <strong className="text-slate-200">{t('info.npm_registry_title')}</strong>: {t('info.npm_registry_desc')}
              </li>
              <li>
                <strong className="text-slate-200">{t('info.deprecation_title')}</strong>: {t('info.deprecation_desc')}
              </li>
              <li>
                <strong className="text-slate-200">{t('info.osv_title')}</strong>: {t('info.osv_desc')}
              </li>
            </ul>
          </div>

          <div className="border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>{t('info.privacy_title')}</span>
            </div>
            <p className="text-slate-300">{t('home.disclaimer_pre')}</p>
          </div>

          {/* Section 2: Color Coding Categories */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t('info.hierarchy_title')}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-1">
                <span className="font-bold text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  🔴 {t('info.cat_critical')}
                </span>
                <p className="text-[0.6875rem] text-slate-400">
                  {t('info.cat_critical_desc')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-orange-950/30 border border-orange-500/30 space-y-1">
                <span className="font-bold text-orange-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  🟠 {t('info.cat_security')}
                </span>
                <p className="text-[0.6875rem] text-slate-400">
                  {t('info.cat_security_desc')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  ⚠️ {t('info.cat_deprecated')}
                </span>
                <p className="text-[0.6875rem] text-slate-400">
                  {t('info.cat_deprecated_desc')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-1">
                <span className="font-bold text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  🔵 {t('info.cat_major')}
                </span>
                <p className="text-[0.6875rem] text-slate-400">
                  {t('info.cat_major_desc')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-1">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  🔵 {t('info.cat_minor')}
                </span>
                <p className="text-[0.6875rem] text-slate-400">
                  {t('info.cat_minor_desc')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/60 space-y-1">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  ⚪ {t('info.cat_patch')}
                </span>
                <p className="text-[0.6875rem] text-slate-400">
                  {t('info.cat_patch_desc')}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 sm:col-span-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  🟢 {t('info.cat_up_to_date')}
                </span>
                <p className="text-[0.6875rem] text-slate-400">
                  {t('info.cat_up_to_date_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
