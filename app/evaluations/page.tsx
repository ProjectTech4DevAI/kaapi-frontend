/**
 * Text Evaluation Page
 *
 * Tab 1 - Datasets: Create QnA datasets with CSV upload
 * Tab 2 - Evaluations: Configure and run evaluations, view results
 */

"use client"
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { colors } from '@/app/lib/colors';
import { useRouter, useSearchParams } from 'next/navigation'
import { APIKey, STORAGE_KEY } from '../keystore/page';
import { Dataset } from '../datasets/page';
import { EvalJob, AssistantConfig, getScoreObject } from '../components/types';
import { getStatusColor } from '../components/utils';
import ConfigModal from '../components/ConfigModal';
import ScoreDisplay from '../components/ScoreDisplay';
import Sidebar from '../components/Sidebar';
import TabNavigation from '../components/TabNavigation';
import ConfigSelector from '../components/ConfigSelector';
import { useToast } from '../components/Toast';
import Loader from '../components/Loader';

type Tab = 'datasets' | 'evaluations';

const leftPanelWidth = 450;

function SimplifiedEvalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam === 'evaluations' || tabParam === 'datasets') ? tabParam as Tab : 'datasets';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  // Dataset creation state
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [duplicationFactor, setDuplicationFactor] = useState('1');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Stored datasets
  const [storedDatasets, setStoredDatasets] = useState<Dataset[]>([]);

  // Evaluation config state
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(() => {
    return searchParams.get('dataset') || '';
  });
  const [experimentName, setExperimentName] = useState<string>(() => {
    return searchParams.get('experiment') || '';
  });
  const [selectedConfigId, setSelectedConfigId] = useState<string>(() => {
    return searchParams.get('config') || '';
  });
  const [selectedConfigVersion, setSelectedConfigVersion] = useState<number>(() => {
    const version = searchParams.get('version');
    return version ? parseInt(version) : 0;
  });
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Load API keys
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

  // Fetch datasets from backend
  const loadStoredDatasets = useCallback(async () => {
    if (!apiKeys.length) return;
    try {
      const response = await fetch('/api/evaluations/datasets', {
        method: 'GET',
        headers: { 'X-API-KEY': apiKeys[0].key },
      });
      if (!response.ok) return;
      const data = await response.json();
      setStoredDatasets(Array.isArray(data) ? data : (data.data || []));
    } catch (e) {
      console.error('Failed to load datasets:', e);
    }
  }, [apiKeys]);

  useEffect(() => {
    if (apiKeys.length > 0) loadStoredDatasets();
  }, [apiKeys, loadStoredDatasets]);

  // File selection handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      event.target.value = '';
      return;
    }
    setUploadedFile(file);
    if (!datasetName) {
      setDatasetName(file.name.replace(/\.csv$/i, ''));
    }
  };

  // Create dataset
  const handleCreateDataset = async () => {
    if (!uploadedFile) {
      toast.error('Please select a CSV file');
      return;
    }
    if (!datasetName.trim()) {
      toast.error('Please enter a dataset name');
      return;
    }
    if (apiKeys.length === 0) {
      toast.error('No API key found. Add one in the Keystore.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('dataset_name', datasetName.trim());
      if (duplicationFactor && parseInt(duplicationFactor) > 1) {
        formData.append('duplication_factor', duplicationFactor);
      }

      const response = await fetch('/api/evaluations/datasets', {
        method: 'POST',
        body: formData,
        headers: { 'X-API-KEY': apiKeys[0].key },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      await loadStoredDatasets();

      if (data.dataset_id) {
        setSelectedDatasetId(data.dataset_id.toString());
      }

      // Reset form
      setUploadedFile(null);
      setDatasetName('');
      setDatasetDescription('');
      setDuplicationFactor('1');

      toast.success('Dataset created successfully!');
    } catch (error) {
      toast.error(`Failed to create dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Run evaluation
  const handleRunEvaluation = async () => {
    if (!selectedKeyId) {
      toast.error('Please select an API key first');
      return;
    }
    if (!selectedDatasetId) {
      toast.error('Please select a dataset first');
      return;
    }
    if (!experimentName.trim()) {
      toast.error('Please enter an evaluation name');
      return;
    }
    if (!selectedConfigId || !selectedConfigVersion) {
      toast.error('Please select a configuration before running evaluation');
      return;
    }

    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) {
      toast.error('Selected API key not found');
      return;
    }

    setIsEvaluating(true);
    try {
      const payload = {
        dataset_id: parseInt(selectedDatasetId),
        experiment_name: experimentName.trim(),
        config_id: selectedConfigId,
        config_version: selectedConfigVersion,
      };

      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'X-API-KEY': selectedKey.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Evaluation failed with status ${response.status}`);
      }

      const data = await response.json();
      const evalId = data.id || data.data?.id || data.eval_id || 'unknown';

      setIsEvaluating(false);
      toast.success(`Evaluation created! ${evalId !== 'unknown' ? `Job ID: ${evalId}` : ''}`);
    } catch (error: any) {
      toast.error(`Failed to run evaluation: ${error.message || 'Unknown error'}`);
      setIsEvaluating(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: colors.bg.secondary }}>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Section */}
          <div className="border-b px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-md"
                style={{ color: colors.text.secondary }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-base font-semibold" style={{ color: colors.text.primary, letterSpacing: '-0.01em' }}>Text Evaluation</h1>
                <p className="text-xs" style={{ color: colors.text.secondary }}>Compare model response quality on your datasets across different configs</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <TabNavigation
            tabs={[
              { id: 'datasets', label: 'Datasets' },
              { id: 'evaluations', label: 'Evaluations' }
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as Tab)}
          />

          {/* Tab Content */}
          {apiKeys.length === 0 ? (
            <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: colors.bg.secondary }}>
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.border }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>API key required</p>
                <p className="text-xs mb-4" style={{ color: colors.text.secondary }}>Add an API key in the Keystore to start creating datasets and running evaluations</p>
                <a href="/keystore" className="inline-block px-4 py-2 rounded-md text-sm font-medium" style={{ backgroundColor: colors.accent.primary, color: '#ffffff' }}>
                  Go to Keystore
                </a>
              </div>
            </div>
          ) : activeTab === 'datasets' ? (
            <DatasetsTab
              leftPanelWidth={leftPanelWidth}
              datasetName={datasetName}
              setDatasetName={setDatasetName}
              datasetDescription={datasetDescription}
              setDatasetDescription={setDatasetDescription}
              duplicationFactor={duplicationFactor}
              setDuplicationFactor={setDuplicationFactor}
              uploadedFile={uploadedFile}
              onFileSelect={handleFileSelect}
              onRemoveFile={() => setUploadedFile(null)}
              isUploading={isUploading}
              handleCreateDataset={handleCreateDataset}
              resetForm={() => {
                setDatasetName('');
                setDatasetDescription('');
                setDuplicationFactor('1');
                setUploadedFile(null);
              }}
              storedDatasets={storedDatasets}
              apiKeys={apiKeys}
              selectedKeyId={selectedKeyId}
              loadStoredDatasets={loadStoredDatasets}
              toast={toast}
            />
          ) : (
            <EvaluationsTab
              leftPanelWidth={leftPanelWidth}
              apiKeys={apiKeys}
              selectedKeyId={selectedKeyId}
              storedDatasets={storedDatasets}
              selectedDatasetId={selectedDatasetId}
              setSelectedDatasetId={setSelectedDatasetId}
              selectedConfigId={selectedConfigId}
              selectedConfigVersion={selectedConfigVersion}
              onConfigSelect={(configId, configVersion) => {
                setSelectedConfigId(configId);
                setSelectedConfigVersion(configVersion);
              }}
              experimentName={experimentName}
              setExperimentName={setExperimentName}
              isEvaluating={isEvaluating}
              handleRunEvaluation={handleRunEvaluation}
              setActiveTab={setActiveTab}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============ DATASETS TAB COMPONENT ============
interface DatasetsTabProps {
  leftPanelWidth: number;
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  duplicationFactor: string;
  setDuplicationFactor: (factor: string) => void;
  uploadedFile: File | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  isUploading: boolean;
  handleCreateDataset: () => void;
  resetForm: () => void;
  storedDatasets: Dataset[];
  apiKeys: APIKey[];
  selectedKeyId: string;
  loadStoredDatasets: () => void;
  toast: ReturnType<typeof useToast>;
}

function DatasetsTab({
  leftPanelWidth,
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  duplicationFactor,
  setDuplicationFactor,
  uploadedFile,
  onFileSelect,
  onRemoveFile,
  isUploading,
  handleCreateDataset,
  resetForm,
  storedDatasets,
  apiKeys,
  selectedKeyId,
  loadStoredDatasets,
  toast,
}: DatasetsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteDataset = async (datasetId: number) => {
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) return;

    setDeletingId(datasetId);
    try {
      const response = await fetch(`/api/evaluations/datasets/${datasetId}`, {
        method: 'DELETE',
        headers: { 'X-API-KEY': selectedKey.key },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete dataset');
      }
      toast.success('Dataset deleted');
      loadStoredDatasets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete dataset');
    } finally {
      setDeletingId(null);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewModalData, setViewModalData] = useState<{ name: string; headers: string[]; rows: string[][]; signedUrl: string } | null>(null);

  const handleViewDataset = async (datasetId: number, datasetName: string) => {
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) return;

    setViewingId(datasetId);
    try {
      const response = await fetch(`/api/evaluations/datasets/${datasetId}?include_signed_url=true&fetch_content=true`, {
        method: 'GET',
        headers: { 'X-API-KEY': selectedKey.key },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get dataset');
      }
      const data = await response.json();
      const signedUrl = data?.data?.signed_url || data?.signed_url;
      const csvText = data?.csv_content;
      if (!csvText) {
        toast.error('No data available for this dataset');
        return;
      }

      // Parse CSV
      const lines = csvText.split('\n').filter(l => l.trim());
      const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (line[i] === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += line[i];
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = lines.length > 0 ? parseRow(lines[0]) : [];
      const rows = lines.slice(1).map(parseRow);

      setViewModalData({ name: datasetName, headers, rows, signedUrl: signedUrl || '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to view dataset');
    } finally {
      setViewingId(null);
    }
  };

  const handleDownloadFromModal = () => {
    if (!viewModalData) return;
    // Reconstruct CSV from parsed data
    const csvLines = [viewModalData.headers.join(',')];
    viewModalData.rows.forEach(row => {
      csvLines.push(row.map(cell => cell.includes(',') || cell.includes('"') || cell.includes('\n') ? `"${cell.replace(/"/g, '""')}"` : cell).join(','));
    });
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${viewModalData.name}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Create Dataset Form */}
      <div
        className="flex-shrink-0 border-r flex flex-col overflow-hidden"
        style={{ width: `${leftPanelWidth}px`, backgroundColor: colors.bg.primary, borderColor: colors.border }}
      >
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Page Title */}
          <div>
            <h2 className="text-base font-semibold" style={{ color: colors.text.primary }}>
              Create New Dataset
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
              Upload a CSV with golden question-answer pairs
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
              Name *
            </label>
            <input
              type="text"
              value={datasetName}
              onChange={e => setDatasetName(e.target.value)}
              placeholder="e.g., QnA Dataset v1"
              className="w-full px-3 py-2 border rounded-md text-sm"
              style={{ backgroundColor: colors.bg.primary, borderColor: colors.border, color: colors.text.primary }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
              Description
            </label>
            <input
              type="text"
              value={datasetDescription}
              onChange={e => setDatasetDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 border rounded-md text-sm"
              style={{ backgroundColor: colors.bg.primary, borderColor: colors.border, color: colors.text.primary }}
            />
          </div>

          {/* Duplication Factor */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
              Duplication Factor
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={duplicationFactor}
              onChange={e => setDuplicationFactor(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              style={{ backgroundColor: colors.bg.primary, borderColor: colors.border, color: colors.text.primary }}
            />
          </div>

          {/* CSV Upload */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
              Upload CSV *
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={onFileSelect}
              className="hidden"
            />

            {uploadedFile ? (
              <div className="border rounded-lg p-3" style={{ borderColor: colors.status.success, backgroundColor: 'rgba(22, 163, 74, 0.02)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.status.success }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.text.primary }}>{uploadedFile.name}</p>
                      <p className="text-xs" style={{ color: colors.text.secondary }}>
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onRemoveFile();
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 rounded"
                    style={{ color: colors.text.secondary }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-400 bg-blue-50/30' : ''}`}
                style={{ borderColor: isDragging ? colors.accent.primary : colors.border }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.border }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>
                  Drop CSV here, or click to browse
                </p>
                <p className="text-xs" style={{ color: colors.text.secondary }}>
                  Format: <span className="font-mono" style={{ color: colors.text.primary }}>question,answer</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex-shrink-0 border-t px-4 py-3 flex items-center justify-end gap-3" style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}>
          <button
            onClick={resetForm}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: colors.text.secondary }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateDataset}
            disabled={!uploadedFile || !datasetName.trim() || isUploading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: (!uploadedFile || !datasetName.trim() || isUploading) ? colors.bg.secondary : colors.accent.primary,
              color: (!uploadedFile || !datasetName.trim() || isUploading) ? colors.text.secondary : '#fff',
              cursor: (!uploadedFile || !datasetName.trim() || isUploading) ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }} />
                Creating...
              </>
            ) : (
              'Create Dataset'
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Dataset List */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg.secondary }}>
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: colors.text.primary }}>
              Datasets
            </h3>
          </div>

          {storedDatasets.length === 0 ? (
            <div className="p-16 text-center">
              <svg className="w-12 h-12 mx-auto mb-3" style={{ color: colors.border }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 7c0 2 3.6 3 8 3s8-1 8-3M4 7c0-2 3.6-3 8-3s8 1 8 3M4 12c0 2 3.6 3 8 3s8-1 8-3" />
              </svg>
              <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>No datasets yet</p>
              <p className="text-xs" style={{ color: colors.text.secondary }}>Create your first dataset using the form on the left</p>
            </div>
          ) : (
            <div className="space-y-3">
              {storedDatasets.map((dataset) => (
                <div
                  key={dataset.dataset_id}
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: colors.bg.primary,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                        {dataset.dataset_name}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleViewDataset(dataset.dataset_id, dataset.dataset_name)}
                          disabled={viewingId === dataset.dataset_id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={{
                            backgroundColor: 'transparent',
                            borderColor: colors.border,
                            color: colors.text.primary,
                            opacity: viewingId === dataset.dataset_id ? 0.5 : 1,
                          }}
                        >
                          {viewingId === dataset.dataset_id ? 'Loading...' : 'View'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(dataset.dataset_id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={{ backgroundColor: 'transparent', borderColor: colors.border, color: 'hsl(8, 86%, 40%)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: colors.text.secondary }}>
                      <span>{dataset.total_items} items</span>
                      {dataset.duplication_factor > 1 && (
                        <>
                          <span style={{ color: colors.border }}>·</span>
                          <span>x{dataset.duplication_factor} duplication</span>
                        </>
                      )}
                      {dataset.original_items > 0 && dataset.original_items !== dataset.total_items && (
                        <>
                          <span style={{ color: colors.border }}>·</span>
                          <span>{dataset.original_items} original</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Dataset Modal */}
      {viewModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setViewModalData(null)}
        >
          <div
            className="rounded-lg shadow-xl flex flex-col"
            style={{ backgroundColor: colors.bg.primary, width: '80vw', maxWidth: '1000px', maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: colors.border }}>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                  {viewModalData.name}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                  {viewModalData.rows.length} rows · {viewModalData.headers.length} columns
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadFromModal}
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: colors.accent.primary, color: '#ffffff' }}
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setViewModalData(null)}
                  className="p-1.5 rounded"
                  style={{ color: colors.text.secondary }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body - Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: colors.bg.secondary, borderBottom: `1px solid ${colors.border}` }}>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-0" style={{ color: colors.text.secondary, backgroundColor: colors.bg.secondary, width: '40px' }}>
                    </th>
                    {viewModalData.headers.map((header, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-0" style={{ color: colors.text.secondary, backgroundColor: colors.bg.secondary }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewModalData.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td className="px-4 py-2.5 text-xs" style={{ color: colors.text.secondary }}>
                        {rowIdx + 1}
                      </td>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-2.5" style={{ color: colors.text.primary }}>
                          <div className="text-sm" style={{ maxHeight: '120px', overflow: 'auto', lineHeight: '1.5' }}>
                            {cell || <span style={{ color: colors.text.secondary }}>—</span>}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (() => {
        const dataset = storedDatasets.find(d => d.dataset_id === confirmDeleteId);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setConfirmDeleteId(null)}
          >
            <div
              className="rounded-lg shadow-xl w-full max-w-md"
              style={{ backgroundColor: colors.bg.primary }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)' }}>
                    <svg className="w-5 h-5" style={{ color: 'hsl(8, 86%, 40%)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                      Delete dataset
                    </h3>
                    <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>
                      Are you sure you want to delete <strong style={{ color: colors.text.primary }}>{dataset?.dataset_name}</strong>? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: colors.border }}>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border"
                  style={{ backgroundColor: 'transparent', borderColor: colors.border, color: colors.text.primary }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { handleDeleteDataset(confirmDeleteId); setConfirmDeleteId(null); }}
                  disabled={deletingId === confirmDeleteId}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'hsl(8, 86%, 40%)', color: '#ffffff', opacity: deletingId === confirmDeleteId ? 0.5 : 1 }}
                >
                  {deletingId === confirmDeleteId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ============ EVALUATIONS TAB COMPONENT ============
interface EvaluationsTabProps {
  leftPanelWidth: number;
  apiKeys: APIKey[];
  selectedKeyId: string;
  storedDatasets: Dataset[];
  selectedDatasetId: string;
  setSelectedDatasetId: (id: string) => void;
  selectedConfigId: string;
  selectedConfigVersion: number;
  onConfigSelect: (configId: string, configVersion: number) => void;
  experimentName: string;
  setExperimentName: (name: string) => void;
  isEvaluating: boolean;
  handleRunEvaluation: () => void;
  setActiveTab: (tab: Tab) => void;
}

function EvaluationsTab({
  leftPanelWidth,
  apiKeys,
  selectedKeyId,
  storedDatasets,
  selectedDatasetId,
  setSelectedDatasetId,
  selectedConfigId,
  selectedConfigVersion,
  onConfigSelect,
  experimentName,
  setExperimentName,
  isEvaluating,
  handleRunEvaluation,
  setActiveTab,
}: EvaluationsTabProps) {
  const router = useRouter();
  const [evalJobs, setEvalJobs] = useState<EvalJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantConfigs, setAssistantConfigs] = useState<Map<string, AssistantConfig>>(new Map());

  const selectedDataset = storedDatasets.find(d => d.dataset_id.toString() === selectedDatasetId);
  const canRun = experimentName.trim() && selectedDatasetId && selectedConfigId && selectedConfigVersion && !isEvaluating;

  // Fetch evaluation jobs
  const fetchEvaluations = useCallback(async () => {
    if (!selectedKeyId) {
      setError('Please select an API key first');
      return;
    }
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) {
      setError('Selected API key not found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/evaluations', {
        method: 'GET',
        headers: { 'X-API-KEY': selectedKey.key },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to fetch evaluations: ${response.status}`);
      }
      const data = await response.json();
      setEvalJobs(Array.isArray(data) ? data : (data.data || []));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch evaluation jobs');
    } finally {
      setIsLoading(false);
    }
  }, [apiKeys, selectedKeyId]);

  // Fetch assistant config
  const fetchAssistantConfig = useCallback(async (assistantId: string) => {
    if (!selectedKeyId) return;
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) return;

    try {
      const response = await fetch(`/api/assistant/${assistantId}`, {
        method: 'GET',
        headers: { 'X-API-KEY': selectedKey.key },
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.success && result.data) {
        setAssistantConfigs(prev => new Map(prev).set(assistantId, result.data));
      }
    } catch (err) {
      console.error(`Failed to fetch assistant config for ${assistantId}:`, err);
    }
  }, [apiKeys, selectedKeyId]);

  useEffect(() => {
    evalJobs.forEach(job => {
      if (job.assistant_id && !assistantConfigs.has(job.assistant_id)) {
        fetchAssistantConfig(job.assistant_id);
      }
    });
  }, [evalJobs, assistantConfigs, fetchAssistantConfig]);

  useEffect(() => {
    if (selectedKeyId) fetchEvaluations();
  }, [selectedKeyId, fetchEvaluations]);

  // Auto-refresh for processing jobs
  useEffect(() => {
    const hasProcessing = evalJobs.some(job =>
      ['processing', 'pending', 'queued', 'running'].includes(job.status?.toLowerCase())
    );
    if (hasProcessing) {
      const interval = setInterval(fetchEvaluations, 10000);
      return () => clearInterval(interval);
    }
  }, [evalJobs, fetchEvaluations]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Configuration */}
      <div
        className="flex-shrink-0 border-r flex flex-col overflow-hidden"
        style={{ width: `${leftPanelWidth}px`, backgroundColor: colors.bg.primary, borderColor: colors.border }}
      >
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Page Title */}
          <div>
            <h2 className="text-base font-semibold" style={{ color: colors.text.primary }}>
              Run New Evaluation
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
              Test model responses against your golden datasets
            </p>
          </div>

          {/* Evaluation Name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
              Name *
            </label>
            <input
              type="text"
              value={experimentName}
              onChange={e => setExperimentName(e.target.value)}
              placeholder="e.g., test_run_1"
              disabled={isEvaluating}
              className="w-full px-3 py-2 border rounded-md text-sm"
              style={{
                backgroundColor: isEvaluating ? colors.bg.secondary : colors.bg.primary,
                borderColor: colors.border,
                color: colors.text.primary,
              }}
            />
          </div>

          {/* Config Selector */}
          <ConfigSelector
            selectedConfigId={selectedConfigId}
            selectedVersion={selectedConfigVersion}
            onConfigSelect={onConfigSelect}
            disabled={isEvaluating}
            compact
            datasetId={selectedDatasetId}
            experimentName={experimentName}
          />

          {/* Dataset Selection */}
          <div className="pt-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.text.secondary }}>
              Select Dataset *
            </label>
            {storedDatasets.length === 0 ? (
              <div className="border rounded-md p-8 text-center" style={{ borderColor: colors.border }}>
                <p className="text-sm" style={{ color: colors.text.secondary }}>No datasets available</p>
                <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                  Create a dataset first in the Datasets tab
                </p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedDatasetId}
                  onChange={e => setSelectedDatasetId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm appearance-none pr-8"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                    color: selectedDatasetId ? colors.text.primary : colors.text.secondary,
                  }}
                >
                  <option value="">-- Select a dataset --</option>
                  {storedDatasets.map(dataset => (
                    <option key={dataset.dataset_id} value={dataset.dataset_id}>
                      {dataset.dataset_name} ({dataset.total_items} items)
                    </option>
                  ))}
                </select>
                <svg
                  className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: colors.text.secondary }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>

          {/* Selected Dataset Info */}
          {selectedDataset && (
            <div className="border rounded-lg p-3" style={{ borderColor: colors.status.success, backgroundColor: 'rgba(22, 163, 74, 0.02)' }}>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.status.success }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: colors.text.primary }}>
                    {selectedDataset.dataset_name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                    {selectedDataset.total_items} items · x{selectedDataset.duplication_factor} duplication
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Run Evaluation Button */}
        <div className="flex-shrink-0 border-t px-4 py-3" style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}>
          <button
            onClick={handleRunEvaluation}
            disabled={!canRun}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: canRun ? colors.accent.primary : colors.bg.secondary,
              color: canRun ? '#fff' : colors.text.secondary,
              cursor: canRun ? 'pointer' : 'not-allowed',
            }}
          >
            {isEvaluating ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }} />
                Running Evaluation...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run Evaluation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Evaluation Runs */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg.secondary }}>
        <div className="flex-1 overflow-auto p-4">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold" style={{ color: colors.text.primary }}>
              Evaluation Runs
            </h2>
            <button
              onClick={fetchEvaluations}
              disabled={isLoading}
              className="p-1.5 rounded"
              style={{ color: colors.text.secondary }}
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="rounded-lg overflow-visible" style={{ backgroundColor: colors.bg.primary, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            {/* Loading */}
            {isLoading && evalJobs.length === 0 && (
              <div className="p-16">
                <Loader size="md" message="Loading evaluation runs..." />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4">
                <div className="rounded-lg p-3" style={{ backgroundColor: 'hsl(8, 86%, 95%)' }}>
                  <p className="text-sm" style={{ color: 'hsl(8, 86%, 40%)' }}>Error: {error}</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && evalJobs.length === 0 && !error && (
              <div className="p-16 text-center">
                <svg className="w-12 h-12 mx-auto mb-3" style={{ color: colors.border }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>No evaluation runs yet</p>
                <p className="text-xs" style={{ color: colors.text.secondary }}>Select a dataset and configuration, then run your first evaluation</p>
              </div>
            )}

            {/* Runs List */}
            {evalJobs.length > 0 && (
              <div className="p-4 space-y-3">
                {evalJobs.map((job) => (
                  <EvalRunCard
                    key={job.id}
                    job={job}
                    assistantConfig={job.assistant_id ? assistantConfigs.get(job.assistant_id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ EVAL RUN CARD COMPONENT ============
interface EvalRunCardProps {
  job: EvalJob;
  assistantConfig?: AssistantConfig;
}

function EvalRunCard({ job, assistantConfig }: EvalRunCardProps) {
  const router = useRouter();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const isCompleted = job.status?.toLowerCase() === 'completed';
  const scoreObj = getScoreObject(job);
  const statusColor = getStatusColor(job.status || '');

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: colors.bg.primary,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        borderLeft: `3px solid ${statusColor.border}`,
      }}
    >
      <div className="px-5 py-4">
        {/* Row 1: Run Name (left) | Status (right) */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
            {job.run_name}
          </div>
          <span
            className="px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide flex-shrink-0"
            style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
          >
            {job.status}
          </span>
        </div>

        {/* Row 2: Scores */}
        {scoreObj && (
          <div className="mt-3">
            <ScoreDisplay score={scoreObj} errorMessage={job.error_message} />
          </div>
        )}

        {/* Error message (if failed) */}
        {job.error_message && (
          <div className="mt-3 text-xs" style={{ color: 'hsl(8, 86%, 40%)' }}>
            {job.error_message}
          </div>
        )}

        {/* Row 3: Dataset + Config (left) | Actions (right) */}
        <div className="flex items-center justify-between gap-4 mt-3">
          <div className="flex items-center gap-3 text-xs" style={{ color: colors.text.secondary }}>
            {job.dataset_name && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 7c0 2 3.6 3 8 3s8-1 8-3M4 7c0-2 3.6-3 8-3s8 1 8 3M4 12c0 2 3.6 3 8 3s8-1 8-3" />
                </svg>
                {job.dataset_name}
              </span>
            )}
            {job.assistant_id && assistantConfig?.name && (
              <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bg.secondary }}>
                {assistantConfig.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border"
              style={{
                backgroundColor: 'transparent',
                borderColor: colors.border,
                color: colors.text.primary,
              }}
            >
              View Config
            </button>
            <button
              onClick={() => router.push(`/evaluations/${job.id}`)}
              disabled={!isCompleted}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border"
              style={{
                backgroundColor: 'transparent',
                borderColor: colors.border,
                color: isCompleted ? colors.text.primary : colors.text.secondary,
                cursor: isCompleted ? 'pointer' : 'not-allowed',
                opacity: isCompleted ? 1 : 0.5,
              }}
            >
              View Results
            </button>
          </div>
        </div>
      </div>

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        job={job}
        assistantConfig={assistantConfig}
      />
    </div>
  );
}

// Wrapper component with Suspense
export default function SimplifiedEval() {
  return (
    <Suspense fallback={<Loader size="lg" message="Loading..." fullScreen />}>
      <SimplifiedEvalContent />
    </Suspense>
  );
}
