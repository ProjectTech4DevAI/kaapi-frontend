/**
 * SimplifiedEval.tsx - Simplified One-Click Evaluation Flow
 *
 * Two-tab structure:
 * 1. Upload Tab: Upload QnA dataset → Run evaluation
 * 2. Results Tab: View evaluation results with metrics and detailed logs
 */

"use client"
import { useState, useEffect, useCallback, Suspense } from 'react';
import {format, toZonedTime} from "date-fns-tz"
import { useRouter, useSearchParams } from 'next/navigation'
import { APIKey } from '../keystore/page';
import { STORAGE_KEY } from '../keystore/page';
import { Dataset, DATASETS_STORAGE_KEY, UploadDatasetModal } from '../datasets/page';
import { EvalJob, AssistantConfig, ScoreObject } from '../components/types';
import { formatDate, getStatusColor } from '../components/utils';
import ConfigModal from '../components/ConfigModal';
import StatusBadge from '../components/StatusBadge';
import ScoreDisplay from '../components/ScoreDisplay';
import Sidebar from '../components/Sidebar';
import TabNavigation from '../components/TabNavigation';
import SimplifiedConfigEditor from '../components/SimplifiedConfigEditor';
import { useToast } from '../components/Toast';
import Loader, { LoaderBox } from '../components/Loader';

type Tab = 'upload' | 'results';

function SimplifiedEvalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Initialize activeTab from URL query parameter, default to 'upload'
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam === 'results' || tabParam === 'upload') ? tabParam as Tab : 'upload';
  });

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  // Dataset selection
  const [storedDatasets, setStoredDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState<string>('');
  const [duplicationFactor, setDuplicationFactor] = useState<string>('1');
  const [isUploading, setIsUploading] = useState(false);

  // Evaluation fields
  const [experimentName, setExperimentName] = useState<string>('');
  const [modelName, setModelName] = useState<string>('gpt-4');
  const [instructions, setInstructions] = useState<string>('You are a helpful FAQ assistant.');
  // const [temperature, setTemperature] = useState<string>('0.000001'); // TODO: Implement temperature feature later
  const [vectorStoreIds, setVectorStoreIds] = useState<string>('');
  const [maxNumResults, setMaxNumResults] = useState<string>('3');

  // Config reference fields
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [selectedConfigVersion, setSelectedConfigVersion] = useState<number>(0);

  // Load API keys from localStorage and auto-select if only one exists
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        setApiKeys(keys);
        // Auto-select the first (and only) API key
        if (keys.length > 0) {
          setSelectedKeyId(keys[0].id);
        }
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  // Fetch datasets from backend
  const loadStoredDatasets = async () => {
    if (!apiKeys.length) return;

    try {
      const response = await fetch('/api/evaluations/datasets', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKeys[0].key,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch datasets:', response.status);
        return;
      }

      const data = await response.json();
      const datasetList = Array.isArray(data) ? data : (data.data || []);
      setStoredDatasets(datasetList);
    } catch (e) {
      console.error('Failed to load datasets:', e);
    }
  };

  useEffect(() => {
    if (apiKeys.length > 0) {
      loadStoredDatasets();
    }
  }, [apiKeys]);

  const handleStoredDatasetSelect = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
  };

  // Upload modal handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      event.target.value = '';
      return;
    }

    setUploadedFile(file);
    const nameFromFile = file.name.replace(/\.csv$/i, '');
    setDatasetName(nameFromFile);
  };

  const handleUploadFromModal = async () => {
    if (!uploadedFile) {
      toast.error('Please select a file first');
      return;
    }

    if (!datasetName.trim()) {
      toast.error('Please enter a dataset name');
      return;
    }

    if (apiKeys.length === 0) {
      toast.error('No API key found');
      return;
    }

    setIsUploading(true);

    try {
      // Prepare FormData for upload
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('dataset_name', datasetName.trim());

      if (duplicationFactor && parseInt(duplicationFactor) > 1) {
        formData.append('duplication_factor', duplicationFactor);
      }

      // Upload to backend
      const response = await fetch('/api/evaluations/datasets', {
        method: 'POST',
        body: formData,
        headers: {
          'X-API-KEY': apiKeys[0].key,
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Dataset uploaded successfully:', data);

      // Refresh the datasets list
      await loadStoredDatasets();

      // Auto-select the newly uploaded dataset
      if (data.dataset_id) {
        setSelectedDatasetId(data.dataset_id.toString());
      }

      // Reset form and close modal
      setUploadedFile(null);
      setDatasetName('');
      setDuplicationFactor('1');
      setIsUploadModalOpen(false);

      toast.success('Dataset uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunEvaluation = async() => {
    if (!selectedKeyId) {
      toast.error('Please select an API key first');
      return;
    }

    if (!selectedDatasetId) {
      toast.error('Please select a dataset first');
      return;
    }

    if (!experimentName.trim()) {
      toast.error('Please enter an experiment name');
      return;
    }

    if (!selectedConfigId || !selectedConfigVersion) {
      toast.error('Please select and save a configuration before running evaluation');
      return;
    }

    // Get the selected API key
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) {
      toast.error('Selected API key not found');
      return;
    }

    setIsEvaluating(true);

    // Create the evaluation job using the selected dataset_id
    try {
      // Build the request payload with config reference
      const payload: any = {
        dataset_id: parseInt(selectedDatasetId),
        experiment_name: experimentName.trim(),
        config_id: selectedConfigId,
        config_version: selectedConfigVersion,
      };

      // Call evaluation endpoint via proxy
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
      console.log('Evaluation job created:', data);

      // Extract the evaluation ID from response (could be data.id or data.data.id or data.eval_id)
      const evalId = data.id || data.data?.id || data.eval_id || 'unknown';

      // Redirect to results tab to view evaluation status
      setIsEvaluating(false);
      setActiveTab('results');

      // Show success message
      toast.success(`Evaluation job created successfully! ${evalId !== 'unknown' ? `Job ID: ${evalId}` : ''}`);
    } catch(error: any) {
      console.error('Error:', error);
      toast.error(`Failed to run evaluation: ${error.message || 'Unknown error'}`);
      setIsEvaluating(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: '#fafafa' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Full Height */}
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Section with Collapse Button */}
          <div className="border-b px-6 py-4" style={{ backgroundColor: '#ffffff', borderColor: '#e5e5e5' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded flex-shrink-0"
                style={{
                  borderWidth: '1px',
                  borderColor: '#e5e5e5',
                  backgroundColor: '#ffffff',
                  color: '#737373',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fafafa';
                  e.currentTarget.style.color = '#171717';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.color = '#737373';
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {sidebarCollapsed ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  )}
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-semibold" style={{ color: '#171717', letterSpacing: '-0.01em' }}>Evaluations</h1>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <TabNavigation
            tabs={[
              { id: 'upload', label: '1. Upload & Run' },
              { id: 'results', label: '2. Results' }
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as Tab)}
          />

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: '#fafafa' }}>
            <div className="max-w-7xl mx-auto space-y-6 page-transition">
              {activeTab === 'upload' ? (
                <UploadTab
                  isEvaluating={isEvaluating}
                  apiKeys={apiKeys}
                  selectedKeyId={selectedKeyId}
                  storedDatasets={storedDatasets}
                  selectedDatasetId={selectedDatasetId}
                  experimentName={experimentName}
                  modelName={modelName}
                  instructions={instructions}
                  // temperature={temperature} // TODO: Implement temperature feature later
                  vectorStoreIds={vectorStoreIds}
                  maxNumResults={maxNumResults}
                  onKeySelect={setSelectedKeyId}
                  onStoredDatasetSelect={handleStoredDatasetSelect}
                  onOpenUploadModal={() => setIsUploadModalOpen(true)}
                  onExperimentNameChange={setExperimentName}
                  onModelNameChange={setModelName}
                  onInstructionsChange={setInstructions}
                  // onTemperatureChange={setTemperature} // TODO: Implement temperature feature later
                  onVectorStoreIdsChange={setVectorStoreIds}
                  onMaxNumResultsChange={setMaxNumResults}
                  onRunEvaluation={handleRunEvaluation}
                  onConfigSelect={(configId, configVersion) => {
                    setSelectedConfigId(configId);
                    setSelectedConfigVersion(configVersion);
                  }}
                />
              ) : (
                <ResultsTab apiKeys={apiKeys} selectedKeyId={selectedKeyId} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dataset Modal */}
      {isUploadModalOpen && (
        <UploadDatasetModal
          selectedFile={uploadedFile}
          datasetName={datasetName}
          duplicationFactor={duplicationFactor}
          isUploading={isUploading}
          onFileSelect={handleFileSelect}
          onDatasetNameChange={setDatasetName}
          onDuplicationFactorChange={setDuplicationFactor}
          onUpload={handleUploadFromModal}
          onClose={() => {
            setIsUploadModalOpen(false);
            setUploadedFile(null);
            setDatasetName('');
            setDuplicationFactor('1');
          }}
        />
      )}
    </div>
  );
}

// ============ UPLOAD TAB COMPONENT ============
interface UploadTabProps {
  isEvaluating: boolean;
  apiKeys: APIKey[];
  selectedKeyId: string;
  storedDatasets: Dataset[];
  selectedDatasetId: string;
  experimentName: string;
  modelName: string;
  instructions: string;
  // temperature: string; // TODO: Implement temperature feature later
  vectorStoreIds: string;
  maxNumResults: string;
  onKeySelect: (keyId: string) => void;
  onStoredDatasetSelect: (datasetId: string) => void;
  onOpenUploadModal: () => void;
  onExperimentNameChange: (value: string) => void;
  onModelNameChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
  // onTemperatureChange: (value: string) => void; // TODO: Implement temperature feature later
  onVectorStoreIdsChange: (value: string) => void;
  onMaxNumResultsChange: (value: string) => void;
  onRunEvaluation: () => void;
  onConfigSelect: (configId: string, configVersion: number) => void;
}

function UploadTab({
  isEvaluating,
  apiKeys,
  selectedKeyId,
  storedDatasets,
  selectedDatasetId,
  experimentName,
  modelName,
  instructions,
  // temperature, // TODO: Implement temperature feature later
  vectorStoreIds,
  maxNumResults,
  onKeySelect,
  onStoredDatasetSelect,
  onOpenUploadModal,
  onExperimentNameChange,
  onModelNameChange,
  onInstructionsChange,
  onVectorStoreIdsChange,
  onMaxNumResultsChange,
  onRunEvaluation,
  onConfigSelect,
}: UploadTabProps) {
  const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
  const selectedDataset = storedDatasets.find(d => d.dataset_id.toString() === selectedDatasetId);

  const [showHowItWorksTooltip, setShowHowItWorksTooltip] = useState(false);
  const [showCsvFormatTooltip, setShowCsvFormatTooltip] = useState(false);

  return (
    <div className="space-y-6">
      {/* API Key Selection Card */}
      <div className="border rounded-lg p-6" style={{
        backgroundColor: '#ffffff',
        borderColor: '#e5e5e5'
      }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold" style={{ color: '#171717' }}>Select API Key</h2>
          <div className="relative">
            <button
              onMouseEnter={() => setShowHowItWorksTooltip(true)}
              onMouseLeave={() => setShowHowItWorksTooltip(false)}
              className="p-1 rounded-full"
              style={{
                color: '#737373',
                backgroundColor: showHowItWorksTooltip ? '#fafafa' : 'transparent',
                transition: 'all 0.15s ease'
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showHowItWorksTooltip && (
              <div
                className="absolute left-0 top-full mt-2 w-96 border rounded-lg p-4 z-50 animate-fadeIn"
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e5e5e5'
                }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#171717' }}>How it works</h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs" style={{ color: '#737373' }}>
                  <li>Select an API key from your keystore</li>
                  <li>Select a stored dataset or upload a new CSV file (format: question,answer columns)</li>
                  <li>Configure evaluation settings (experiment name required, other fields optional)</li>
                  <li>Click <blockquote>Run Evaluation </blockquote> to start the evaluation process</li>
                  <li>Wait for processing to complete (automatic redirect to results)</li>
                  <li>View detailed results and metrics in the Results tab</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {apiKeys.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: '#e5e5e5' }}>
            <div style={{ color: '#737373' }}>
              <svg
                className="mx-auto h-12 w-12 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <p className="font-medium mb-2" style={{ color: '#171717' }}>No API key found</p>
              <p className="text-sm mb-4">You need to add an API key before running evaluations</p>
              <a
                href="/keystore"
                className="inline-block px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: '#171717',
                  color: '#ffffff',
                  transition: 'all 0.15s ease',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#404040';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#171717';
                }}
              >
                Go to Keystore
              </a>
            </div>
          </div>
        ) : selectedKey ? (
          <div className="border rounded-lg p-6" style={{
            backgroundColor: '#f0fdf4',
            borderColor: '#86efac',
            transition: 'all 0.15s ease'
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#16a34a' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#16a34a' }}>
                    <span className="font-semibold">{selectedKey.provider} - {selectedKey.label}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#16a34a' }}>
                    Key: {selectedKey.key.substring(0, 8)}...{selectedKey.key.substring(selectedKey.key.length - 4)}
                  </p>
                </div>
              </div>
              <a
                href="/keystore"
                className="px-3 py-2 rounded-md text-xs font-medium"
                style={{
                  borderWidth: '1px',
                  borderColor: '#86efac',
                  backgroundColor: 'transparent',
                  color: '#16a34a',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dcfce7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Manage
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* Dataset Selection Card */}
      <div className="border rounded-lg p-8" style={{
        backgroundColor: '#ffffff',
        borderColor: '#e5e5e5'
      }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold" style={{ color: '#171717' }}>Select QnA Dataset</h2>
          <div className="relative">
            <button
              onMouseEnter={() => setShowCsvFormatTooltip(true)}
              onMouseLeave={() => setShowCsvFormatTooltip(false)}
              className="p-1 rounded-full"
              style={{
                color: '#737373',
                backgroundColor: showCsvFormatTooltip ? '#fafafa' : 'transparent',
                transition: 'all 0.15s ease'
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showCsvFormatTooltip && (
              <div
                className="absolute left-0 top-full mt-2 w-80 border rounded-lg p-4 z-50 animate-fadeIn"
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e5e5e5'
                }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#171717' }}>Expected CSV Format</h3>
                <pre className="text-xs p-3 rounded-md border overflow-x-auto font-mono" style={{
                  backgroundColor: '#fafafa',
                  borderColor: '#e5e5e5',
                  color: '#171717'
                }}>
{`question,answer
"What is X?","Answer Y"
"Explain Z","Description of Z"`}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={selectedDatasetId}
              onChange={(e) => onStoredDatasetSelect(e.target.value)}
              className="flex-1 px-4 py-3 rounded-md border focus:outline-none text-sm"
              style={{
                borderColor: selectedDatasetId ? '#171717' : '#e5e5e5',
                backgroundColor: '#ffffff',
                color: '#171717',
                transition: 'all 0.15s ease'
              }}
            >
              <option value="">-- Select a Dataset --</option>
              {storedDatasets.map((dataset) => (
                <option key={dataset.dataset_id} value={dataset.dataset_id}>
                  {dataset.dataset_name} ({dataset.total_items} items)
                </option>
              ))}
            </select>
            <button
              onClick={onOpenUploadModal}
              className="px-4 py-3 rounded-md text-sm font-medium flex items-center gap-2"
              style={{
                backgroundColor: '#171717',
                color: '#ffffff',
                border: 'none',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#404040';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#171717';
              }}
              title="Upload New Dataset"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {storedDatasets.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: '#e5e5e5' }}>
              <div style={{ color: '#737373' }}>
                <svg
                  className="mx-auto h-8 w-8 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <p className="text-sm font-medium" style={{ color: '#171717' }}>No datasets found</p>
                <p className="text-xs mt-1">Click the + button above to upload your first dataset</p>
              </div>
            </div>
          )}

          {selectedDataset && (
            <div className="border rounded-lg p-6" style={{
              backgroundColor: 'hsl(142, 76%, 96%)',
              borderColor: 'hsl(142, 76%, 75%)',
              transition: 'all 0.15s ease'
            }}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#16a34a' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#16a34a' }}>
                    Selected: <span className="font-semibold">{selectedDataset.dataset_name}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#16a34a' }}>
                    Dataset ID: {selectedDataset.dataset_id} | Total Items: {selectedDataset.total_items} | Duplication: ×{selectedDataset.duplication_factor}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simplified Config Editor */}
      {selectedDatasetId && (
        <SimplifiedConfigEditor
          experimentName={experimentName}
          instructions={instructions}
          modelName={modelName}
          vectorStoreIds={vectorStoreIds}
          isEvaluating={isEvaluating}
          onExperimentNameChange={onExperimentNameChange}
          onInstructionsChange={onInstructionsChange}
          onModelNameChange={onModelNameChange}
          onVectorStoreIdsChange={onVectorStoreIdsChange}
          onRunEvaluation={onRunEvaluation}
          onConfigSelect={onConfigSelect}
        />
      )}
    </div>
  );
}

// ============ TYPES ============
// Types are now imported from '../components/types'

// ============ RESULTS TAB COMPONENT ============
interface ResultsTabProps {
  apiKeys: APIKey[];
  selectedKeyId: string;
}

function ResultsTab({ apiKeys, selectedKeyId }: ResultsTabProps) {
  const [evalJobs, setEvalJobs] = useState<EvalJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantConfigs, setAssistantConfigs] = useState<Map<string, AssistantConfig>>(new Map());

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
        headers: {
          'X-API-KEY': selectedKey.key,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to fetch evaluations: ${response.status}`);
      }

      const data = await response.json();

      // API may return an array or an object with data property
      const jobs = Array.isArray(data) ? data : (data.data || []);
      setEvalJobs(jobs);
    } catch (err: any) {
      console.error('Failed to fetch evaluations:', err);
      setError(err.message || 'Failed to fetch evaluation jobs');
    } finally {
      setIsLoading(false);
    }
  }, [apiKeys, selectedKeyId]);

  // Fetch assistant config for a given assistant_id
  const fetchAssistantConfig = useCallback(async (assistantId: string) => {
    if (!selectedKeyId) return;

    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) return;

    try {
      const response = await fetch(`/api/assistant/${assistantId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': selectedKey.key,
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch assistant config for ${assistantId}:`, response.status);
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        setAssistantConfigs(prev => new Map(prev).set(assistantId, result.data));
      }
    } catch (err: any) {
      console.error(`Failed to fetch assistant config for ${assistantId}:`, err);
    }
  }, [apiKeys, selectedKeyId]);

  // Fetch assistant configs for jobs with assistant_id
  useEffect(() => {
    const jobsWithAssistantId = evalJobs.filter(job => job.assistant_id);

    jobsWithAssistantId.forEach(job => {
      if (job.assistant_id && !assistantConfigs.has(job.assistant_id)) {
        fetchAssistantConfig(job.assistant_id);
      }
    });
  }, [evalJobs, assistantConfigs, fetchAssistantConfig]);

  // Fetch on mount and when API key changes
  useEffect(() => {
    if (selectedKeyId) {
      fetchEvaluations();
    }
  }, [selectedKeyId, fetchEvaluations]);

  // Auto-refresh every 10 seconds if there are processing jobs
  useEffect(() => {
    const hasProcessingJobs = evalJobs.some(job =>
      job.status === 'processing' || job.status === 'pending' || job.status === 'queued'
    );

    if (hasProcessingJobs) {
      const interval = setInterval(() => {
        fetchEvaluations();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [evalJobs, fetchEvaluations]);

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold" style={{ color: '#171717' }}>
          Evaluation Jobs
        </h2>
        <button
          onClick={fetchEvaluations}
          disabled={isLoading}
          className="px-4 py-2 rounded-md text-sm font-medium"
          style={{
            background: isLoading ? '#fafafa' : '#171717',
            color: isLoading ? '#737373' : '#ffffff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            border: 'none'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#404040';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#171717';
            }
          }}
        >
          {isLoading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && evalJobs.length === 0 && (
        <LoaderBox message="Loading evaluation jobs..." size="md" />
      )}

      {/* Error State */}
      {error && (
        <div className="border rounded-lg p-6" style={{
          backgroundColor: 'hsl(0, 84%, 96%)',
          borderColor: 'hsl(0, 84%, 80%)'
        }}>
          <p className="text-sm font-medium" style={{ color: 'hsl(0, 84%, 50%)' }}>
            Error: {error}
          </p>
        </div>
      )}

      {/* No Jobs Yet */}
      {!isLoading && evalJobs.length === 0 && !error && (
        <div className="border rounded-lg p-8 text-center" style={{
          backgroundColor: '#ffffff',
          borderColor: '#e5e5e5',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          <p style={{ color: '#737373' }}>No evaluation jobs found. Create one from the Upload tab!</p>
        </div>
      )}

      {/* Evaluation Job Cards */}
      {evalJobs.length > 0 && (
        <div className="space-y-4">
          {evalJobs.map((job) => (
            <EvalJobCard
              key={job.id}
              job={job}
              assistantConfig={job.assistant_id ? assistantConfigs.get(job.assistant_id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ EVAL JOB CARD COMPONENT ============
interface EvalJobCardProps {
  job: EvalJob;
  assistantConfig?: AssistantConfig;
}

function EvalJobCard({ job, assistantConfig }: EvalJobCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Using imported utility functions
  const statusColors = getStatusColor(job.status);
  return (
    <div className="border rounded-lg" style={{
      backgroundColor: '#ffffff',
      borderColor: '#e5e5e5',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.15s ease'
    }}>
      {/* Header - Always Visible (Clickable) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between"
        style={{
          backgroundColor: isExpanded ? '#fafafa' : 'transparent',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = '#fafafa';
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Expand/Collapse Icon */}
          <svg
            className="w-5 h-5 flex-shrink-0"
            style={{
              color: '#737373',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease'
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          {/* Job Info */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold" style={{ color: '#171717' }}>
                {job.run_name}
              </h3>
              {/* <span className="text-xs" style={{ color: '#737373' }}>
                ID: {job.id}
              </span> */}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: '#737373' }}>
              {/* <span>{job.dataset_name}</span>
              <span>•</span>
              <span>{job.total_items} items</span>
              <span>•</span> */}
              <ScoreDisplay score={job.score} errorMessage={job.error_message} />
            </div>
          </div>

          {/* Status Badge */}
          <div
            className="px-3 py-1 rounded-md text-sm font-medium"
            style={{
              backgroundColor: statusColors.bg,
              borderWidth: '1px',
              borderColor: statusColors.border,
              color: statusColors.text
            }}
          >
            {job.status.toUpperCase()}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#e5e5e5' }}>
          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs mt-4 mb-4" style={{ color: '#737373' }}>
            <div>
              <span className="font-medium">Started At:</span> {formatDate(job.inserted_at)}
            </div>
            <div>
              <span className="font-medium">Last Updated At:</span> {formatDate(job.updated_at)}
            </div>
          </div>

          {/* Error message (if failed) */}
          {job.error_message && (
            <div className="border rounded-lg p-3 mb-4" style={{
              backgroundColor: 'hsl(0, 84%, 96%)',
              borderColor: 'hsl(0, 84%, 80%)'
            }}>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(0, 84%, 50%)' }}>Error</div>
              <div className="text-sm" style={{ color: 'hsl(0, 84%, 50%)' }}>
                {job.error_message}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsConfigModalOpen(true);
              }}
              className="px-3 py-2 rounded-md text-sm font-medium"
              style={{
                backgroundColor: '#ffffff',
                borderWidth: '1px',
                borderColor: '#e5e5e5',
                color: '#171717',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fafafa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              View Config
            </button>
            <button
              onClick={() => router.push(`/evaluations/${job.id}`)}
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{
                backgroundColor: '#171717',
                color: '#ffffff',
                border: 'none',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#404040';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#171717';
              }}
            >
              View Results
            </button>
          </div>
        </div>
      )}

      {/* Config Modal */}
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
