/**
 * EvaluationReport.tsx - Detailed evaluation report page
 *
 * Shows metrics overview and per-item scores for a specific evaluation job
 */

"use client"
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { APIKey, STORAGE_KEY } from '../../keystore/page';
import { EvalJob, AssistantConfig, hasSummaryScores, isNewScoreObjectV2, getScoreObject, normalizeToIndividualScores, GroupedTraceItem, isGroupedFormat } from '../../components/types';
import { getStatusColor } from '../../components/utils';
import ConfigModal from '../../components/ConfigModal';
import Sidebar from '../../components/Sidebar';
import DetailedResultsTable from '../../components/DetailedResultsTable';
import { colors } from '@/app/lib/colors';
import { useToast } from '@/app/components/Toast';
import Loader from '@/app/components/Loader';

interface ConfigVersionInfo {
  name: string;
  version: number;
  model?: string;
  instructions?: string;
  temperature?: number;
  tools?: { type: string; [key: string]: unknown }[];
  provider?: string;
}

export default function EvaluationReport() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const jobId = params.id as string;

  const [job, setJob] = useState<EvalJob | null>(null);
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configVersionInfo, setConfigVersionInfo] = useState<ConfigVersionInfo | null>(null);
  const [exportFormat, setExportFormat] = useState<'row' | 'grouped'>('row');
  const [isResyncing, setIsResyncing] = useState(false);
  const [showNoTracesModal, setShowNoTracesModal] = useState(false);

  // CSV helper functions
  const escapeCSVValue = (value: string): string => {
    return value.replace(/"/g, '""').replace(/\n/g, ' ');
  };

  const sanitizeCSVCell = (value: string, preventFormulaInjection = false): string => {
    let sanitized = escapeCSVValue(value);
    // Prevent CSV formula injection by prepending space to values starting with =, +, -, @
    if (preventFormulaInjection && /^[=+\-@]/.test(sanitized)) {
      sanitized = ' ' + sanitized;
    }
    return `"${sanitized}"`;
  };

  // Load API keys from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        setApiKeys(keys);
        if (keys.length > 0) {
          setSelectedKeyId(keys[0].id);
        }
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  // Fetch job details
  const fetchJobDetails = useCallback(async () => {
    if (!selectedKeyId || !jobId) return;

    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/evaluations/${jobId}?export_format=${exportFormat}`, {
        method: 'GET',
        headers: { 'X-API-KEY': selectedKey.key },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to fetch evaluation: ${response.status}`);
      }

      const data = await response.json();

      if (data.success === false && data.error) {
        toast.error(data.error);
        setExportFormat('row');
        return;
      }

      const foundJob = data.data || data;
      if (!foundJob) throw new Error('Evaluation job not found');

      setJob(foundJob);

      if (foundJob.assistant_id) {
        fetchAssistantConfig(foundJob.assistant_id, selectedKey.key);
      }
      if (foundJob.config_id && foundJob.config_version) {
        fetchConfigInfo(foundJob.config_id, foundJob.config_version, selectedKey.key);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch evaluation job');
    } finally {
      setIsLoading(false);
    }
  }, [apiKeys, selectedKeyId, jobId, exportFormat]);

  const fetchAssistantConfig = async (assistantId: string, apiKey: string) => {
    try {
      const response = await fetch(`/api/assistant/${assistantId}`, {
        method: 'GET',
        headers: { 'X-API-KEY': apiKey },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.success && result.data) setAssistantConfig(result.data);
    } catch (err) {
      console.error(`Failed to fetch assistant config for ${assistantId}:`, err);
    }
  };

  const fetchConfigInfo = async (configId: string, configVersion: number, apiKey: string) => {
    try {
      const configResponse = await fetch(`/api/configs/${configId}`, {
        headers: { 'X-API-KEY': apiKey },
      });
      if (!configResponse.ok) return;
      const configData = await configResponse.json();
      const configName = configData.success && configData.data ? configData.data.name : null;

      const versionResponse = await fetch(
        `/api/configs/${configId}/versions/${configVersion}`,
        { headers: { 'X-API-KEY': apiKey } }
      );
      if (!versionResponse.ok) return;
      const versionData = await versionResponse.json();
      if (versionData.success && versionData.data) {
        const blob = versionData.data.config_blob;
        const params = blob?.completion?.params || {};
        setConfigVersionInfo({
          name: configName || 'Unknown Config',
          version: configVersion,
          model: params.model,
          instructions: params.instructions,
          temperature: params.temperature,
          tools: params.tools,
          provider: blob?.completion?.provider,
        });
      }
    } catch (error) {
      console.error('Error fetching config version info:', error);
    }
  };

  useEffect(() => {
    if (selectedKeyId && jobId) fetchJobDetails();
  }, [selectedKeyId, jobId, fetchJobDetails]);

  // Export grouped format CSV
  const exportGroupedCSV = (traces: GroupedTraceItem[]) => {
    if (!job) return;
    try {
      const maxAnswers = Math.max(...traces.map(g => g.llm_answers.length));
      const scoreNames = traces[0]?.scores[0]?.map(s => s.name) || [];
      let csvContent = 'Question ID,Question,Ground Truth';
      for (let i = 1; i <= maxAnswers; i++) {
        csvContent += `,LLM Answer ${i},Trace ID ${i}`;
        scoreNames.forEach(name => { csvContent += `,${name} (${i}),${sanitizeCSVCell(`${name} (${i}) Comment`)}`; });
      }
      csvContent += '\n';
      traces.forEach(group => {
        const row: string[] = [
          String(group.question_id),
          sanitizeCSVCell(group.question || ''),
          sanitizeCSVCell(group.ground_truth_answer || '')
        ];
        for (let i = 0; i < maxAnswers; i++) {
          row.push(`"${(group.llm_answers[i] || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`);
          row.push(group.trace_ids[i] || '');
          scoreNames.forEach(name => {
            const score = group.scores[i]?.find(s => s.name === name);
            row.push(score ? String(score.value) : '');
            row.push(score?.comment ? sanitizeCSVCell(score.comment, true) : '');
          });
        }
        csvContent += row.join(',') + '\n';
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `evaluation_${job.id}_${job.run_name.replace(/[^a-z0-9]/gi, '_')}_grouped.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Grouped CSV exported with ${traces.length} questions`);
    } catch (error) {
      toast.error('Failed to export grouped CSV');
    }
  };

  // Export row format CSV
  const exportRowCSV = () => {
    if (!job || !scoreObject) return;
    try {
      const individual_scores = normalizeToIndividualScores(scoreObject);
      if (!individual_scores || individual_scores.length === 0) {
        toast.error('No valid data available to export');
        return;
      }
      let csvContent = '';
      const firstItem = individual_scores[0];
      const scoreNames = firstItem?.trace_scores?.map(s => s.name) || [];
      csvContent += 'Counter,Trace ID,Job ID,Run Name,Dataset,Model,Status,Total Items,';
      csvContent += 'Question,Answer,Ground Truth,';
      csvContent += scoreNames.map(name => `${name},${name} (comment)`).join(',') + '\n';
      let rowCount = 0;
      individual_scores.forEach((item, index) => {
        const row = [
          index + 1, item.trace_id || 'N/A', job.id,
          `"${job.run_name.replace(/"/g, '""')}"`,
          `"${job.dataset_name.replace(/"/g, '""')}"`,
          assistantConfig?.model || job.config?.model || 'N/A',
          job.status, job.total_items,
          `"${(item.input?.question || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${(item.output?.answer || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${(item.metadata?.ground_truth || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          ...scoreNames.flatMap(name => {
            const score = item.trace_scores?.find(s => s.name === name);
            return [
              score ? score.value : 'N/A',
              score?.comment ? sanitizeCSVCell(score.comment, true) : ''
            ];
          })
        ].join(',');
        csvContent += row + '\n';
        rowCount++;
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `evaluation_${job.id}_${job.run_name.replace(/[^a-z0-9]/gi, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`CSV exported successfully with ${rowCount} rows`);
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportCSV = () => {
    if (!job || !scoreObject) {
      toast.error('No valid data available to export');
      return;
    }
    try {
      if (!isNewScoreObjectV2(scoreObject)) {
        toast.error('Export not available for this score format');
        return;
      }
      const traces = scoreObject.traces;
      if (!traces || traces.length === 0) {
        toast.error('No traces available to export');
        return;
      }
      if (isGroupedFormat(traces)) {
        exportGroupedCSV(traces);
      } else {
        exportRowCSV();
      }
    } catch (error) {
      toast.error('Failed to export CSV. Please check the console for details.');
    }
  };

  const handleResync = async () => {
    if (!selectedKeyId || !jobId) return;
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) return;

    setIsResyncing(true);
    try {
      const response = await fetch(`/api/evaluations/${jobId}?get_trace_info=true&resync_score=true&export_format=${exportFormat}`, {
        method: 'GET',
        headers: { 'X-API-KEY': selectedKey.key },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to resync: ${response.status}`);
      }
      const data = await response.json();
      const foundJob = data.data || data;
      if (!foundJob) throw new Error('Evaluation job not found');

      const newScoreObject = getScoreObject(foundJob);
      if (!newScoreObject || !isNewScoreObjectV2(newScoreObject)) {
        setShowNoTracesModal(true);
        setIsResyncing(false);
        return;
      }

      setJob(foundJob);
      if (foundJob.assistant_id) fetchAssistantConfig(foundJob.assistant_id, selectedKey.key);
      if (foundJob.config_id && foundJob.config_version) fetchConfigInfo(foundJob.config_id, foundJob.config_version, selectedKey.key);
      toast.success('Metrics resynced successfully');
    } catch (error: any) {
      toast.error(`Failed to resync metrics: ${error.message || 'Unknown error'}`);
    } finally {
      setIsResyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />
          <div className="flex-1 flex items-center justify-center">
            <Loader size="lg" message="Loading evaluation report..." />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: colors.status.error }}>
                {error || 'Evaluation job not found'}
              </p>
              <button
                onClick={() => router.push('/evaluations?tab=evaluations')}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: colors.accent.primary, color: '#ffffff' }}
              >
                Back to Evaluations
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scoreObject = getScoreObject(job);
  const hasScore = !!scoreObject;
  const statusColor = getStatusColor(job.status);
  const isNewFormat = hasSummaryScores(scoreObject);
  const summaryScores = (isNewFormat && scoreObject) ? scoreObject.summary_scores || [] : [];

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-md flex-shrink-0"
                style={{ color: colors.text.secondary }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => router.push('/evaluations?tab=evaluations')}
                className="p-1.5 rounded-md flex-shrink-0"
                style={{ color: colors.text.secondary }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0 flex items-center gap-3">
                <h1 className="text-base font-semibold truncate" style={{ color: colors.text.primary, letterSpacing: '-0.01em' }}>
                  {job.run_name}
                </h1>
                <span className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: colors.text.secondary }}>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 7c0 2 3.6 3 8 3s8-1 8-3M4 7c0-2 3.6-3 8-3s8 1 8 3M4 12c0 2 3.6 3 8 3s8-1 8-3" />
                  </svg>
                  {job.dataset_name}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div
                className="inline-flex rounded-lg p-0.5"
                style={{ backgroundColor: colors.bg.secondary }}
              >
                <button
                  onClick={() => setExportFormat('row')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
                  style={{
                    backgroundColor: exportFormat === 'row' ? colors.bg.primary : 'transparent',
                    color: exportFormat === 'row' ? colors.text.primary : colors.text.primary,
                    boxShadow: exportFormat === 'row' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    border: exportFormat === 'row' ? `1px solid ${colors.border}` : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (exportFormat !== 'row') {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                      e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (exportFormat !== 'row') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Individual Rows
                </button>
                <button
                  onClick={() => setExportFormat('grouped')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
                  style={{
                    backgroundColor: exportFormat === 'grouped' ? colors.bg.primary : 'transparent',
                    color: exportFormat === 'grouped' ? colors.text.primary : colors.text.primary,
                    boxShadow: exportFormat === 'grouped' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    border: exportFormat === 'grouped' ? `1px solid ${colors.border}` : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (exportFormat !== 'grouped') {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                      e.currentTarget.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (exportFormat !== 'grouped') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Group by Questions
                </button>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border"
                style={{ backgroundColor: 'transparent', borderColor: colors.border, color: colors.text.primary }}
              >
                View Config
              </button>
              <button
                onClick={handleExportCSV}
                disabled={!hasScore}
                className="px-3 py-1.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: hasScore ? colors.accent.primary : colors.bg.secondary,
                  color: hasScore ? '#fff' : colors.text.secondary,
                  cursor: hasScore ? 'pointer' : 'not-allowed',
                }}
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: colors.bg.secondary }}>
            <div className="max-w-7xl mx-auto space-y-6">

              {/* Metrics */}
              {hasScore && isNewFormat ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: colors.text.secondary }}>
                      Metrics Overview
                    </h3>
                    <button
                      onClick={handleResync}
                      disabled={isResyncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#171717] text-white disabled:opacity-50"
                    >
                      <svg
                        className={`w-3.5 h-3.5 ${isResyncing ? 'animate-spin' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {isResyncing ? 'Resyncing...' : 'Resync'}
                    </button>
                  </div>
                  {summaryScores.length > 0 ? (
                    <div className="flex gap-4 flex-wrap">
                      {summaryScores.filter(s => s.data_type === 'NUMERIC').map((summary) => (
                        <div
                          key={summary.name}
                          className="rounded-lg px-6 py-5 text-center flex-1 min-w-[180px]"
                          style={{ backgroundColor: colors.bg.primary, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)' }}
                        >
                          <div className="text-xs font-medium mb-2" style={{ color: colors.text.secondary }}>
                            {summary.name}
                          </div>
                          <div className="text-2xl font-bold" style={{ color: colors.text.primary }}>
                            {summary.avg !== undefined ? summary.avg.toFixed(3) : 'N/A'}
                          </div>
                          <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                            {summary.std !== undefined && `±${summary.std.toFixed(3)} · `}{summary.total_pairs} pairs
                          </div>
                        </div>
                      ))}
                      {summaryScores.filter(s => s.data_type === 'CATEGORICAL').map((summary) => (
                        <div
                          key={summary.name}
                          className="rounded-lg px-6 py-5 flex-1 min-w-[180px]"
                          style={{ backgroundColor: colors.bg.primary, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)' }}
                        >
                          <div className="text-xs font-medium mb-3 text-center" style={{ color: colors.text.secondary }}>
                            {summary.name}
                          </div>
                          <div className="space-y-1">
                            {summary.distribution && Object.entries(summary.distribution).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center px-3 py-1 rounded" style={{ backgroundColor: colors.bg.secondary }}>
                                <span className="text-xs font-medium" style={{ color: colors.text.primary }}>{key}</span>
                                <span className="text-xs font-bold" style={{ color: colors.text.primary }}>{value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs mt-2 text-center" style={{ color: colors.text.secondary }}>
                            {summary.total_pairs} pairs
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg p-8 text-center" style={{ backgroundColor: colors.bg.primary, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)' }}>
                      <p className="text-sm" style={{ color: colors.text.secondary }}>No summary scores available</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg p-6 text-center" style={{ backgroundColor: colors.bg.primary, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)' }}>
                  <p className="text-sm" style={{ color: job.error_message ? 'hsl(8, 86%, 40%)' : colors.text.secondary }}>
                    {job.error_message || 'No results available yet'}
                  </p>
                </div>
              )}

              {/* Detailed Results */}
              {hasScore && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: colors.text.secondary }}>
                      Detailed Results
                    </h3>
                    {isNewFormat && (
                      <span className="text-xs" style={{ color: colors.text.secondary }}>
                        ({normalizeToIndividualScores(scoreObject).length} items)
                      </span>
                    )}
                  </div>
                  <DetailedResultsTable job={job} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        job={job}
        assistantConfig={assistantConfig}
      />

      {/* No Traces Modal */}
      {showNoTracesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowNoTracesModal(false)}
        >
          <div
            className="rounded-lg shadow-lg p-6 max-w-md mx-4"
            style={{ backgroundColor: colors.bg.primary }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>
              No Langfuse Traces Available
            </h3>
            <p className="text-xs mb-4" style={{ color: colors.text.secondary }}>
              This evaluation does not have Langfuse traces.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowNoTracesModal(false)}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{ backgroundColor: colors.accent.primary, color: '#ffffff' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
