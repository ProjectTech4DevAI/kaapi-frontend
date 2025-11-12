/**
 * SimplifiedEval.tsx - Simplified One-Click Evaluation Flow
 *
 * Two-tab structure:
 * 1. Upload Tab: Upload QnA dataset → Run evaluation
 * 2. Results Tab: View evaluation results with metrics and detailed logs
 */

"use client"
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation'
import { APIKey } from '../keystore/page';
import { STORAGE_KEY } from '../keystore/page';

// Dummy evaluation results data
const DUMMY_RESULTS = {
  evaluationId: 'eval_12345',
  timestamp: new Date().toISOString(),
  dataset: {
    name: 'medical_qa_v1.csv',
    totalRows: 150,
    processedRows: 150,
  },
  metrics: {
    averageScore: 0.87,
    accuracy: 0.92,
    precision: 0.89,
    recall: 0.85,
    f1Score: 0.87,
  },
  modelInfo: {
    provider: 'OpenAI',
    model: 'gpt-4-turbo',
    temperature: 0.7,
  },
  logs: [
    {
      id: 1,
      question: 'What is the primary function of the mitochondria?',
      expected: 'Energy production through ATP synthesis',
      actual: 'The mitochondria is responsible for ATP synthesis and cellular energy production',
      score: 0.95,
      status: 'pass',
      timestamp: '2025-11-06T10:23:45Z',
    },
    {
      id: 2,
      question: 'Describe the process of protein synthesis.',
      expected: 'Transcription of DNA to mRNA, then translation to protein',
      actual: 'Protein synthesis involves transcription followed by translation at the ribosome',
      score: 0.92,
      status: 'pass',
      timestamp: '2025-11-06T10:23:46Z',
    },
    {
      id: 3,
      question: 'What are the main components of the cell membrane?',
      expected: 'Phospholipid bilayer with embedded proteins',
      actual: 'The cell membrane consists of a phospholipid bilayer',
      score: 0.78,
      status: 'pass',
      timestamp: '2025-11-06T10:23:47Z',
    },
    {
      id: 4,
      question: 'Explain the role of DNA polymerase.',
      expected: 'Synthesizes new DNA strands during replication',
      actual: 'DNA polymerase helps in replication',
      score: 0.65,
      status: 'warning',
      timestamp: '2025-11-06T10:23:48Z',
    },
    {
      id: 5,
      question: 'What is osmosis?',
      expected: 'Movement of water across a semi-permeable membrane',
      actual: 'Movement of molecules across membranes',
      score: 0.55,
      status: 'fail',
      timestamp: '2025-11-06T10:23:49Z',
    },
  ],
};

type Tab = 'upload' | 'results';

const fetcher=(url)=>fetch(url).then((r)=>r.json())

export default function SimplifiedEval() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState(DUMMY_RESULTS);
  const [progress, setProgress] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  // Upload fields
  const [datasetName, setDatasetName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [duplicationFactor, setDuplicationFactor] = useState<string>('1');

  // Evaluation fields
  const [experimentName, setExperimentName] = useState<string>('');
  const [modelName, setModelName] = useState<string>('gpt-4');
  const [instructions, setInstructions] = useState<string>('You are a helpful FAQ assistant.');
  const [vectorStoreIds, setVectorStoreIds] = useState<string>('');
  const [maxNumResults, setMaxNumResults] = useState<string>('3');

  const router = useRouter();

  // Load API keys from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        setApiKeys(keys);
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  // Simulate evaluation progress
  useEffect(() => {
    if (isEvaluating) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsEvaluating(false);
            setActiveTab('results');
            return 100;
          }
          return prev + 10;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isEvaluating]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedKeyId) {
      alert('Please select an API key first');
      event.target.value = ''; // Reset file input
      return;
    }

    // Set the file and extract dataset name from filename
    setUploadedFile(file);
    const extractedName = file.name.replace(/\.(csv|CSV)$/, '');
    setDatasetName(extractedName);

    // Reset previous upload state
    setDatasetId(null);
  };

  const handleUploadDataset = async () => {
    if (!uploadedFile) {
      alert('Please select a file first');
      return;
    }

    if (!selectedKeyId) {
      alert('Please select an API key first');
      return;
    }

    if (!datasetName.trim()) {
      alert('Please enter a dataset name');
      return;
    }

    // Get the selected API key
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) {
      alert('Selected API key not found');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('dataset_name', datasetName.trim());

      // Optional fields
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (duplicationFactor) {
        formData.append('duplication_factor', duplicationFactor);
      }

      // Upload via Next.js API proxy (to avoid CORS issues)
      const response = await fetch('/api/evaluations/datasets', {
        method: 'POST',
        body: formData,
        headers: {
          'X-API-KEY': selectedKey.key,
          // Note: Do NOT set Content-Type for multipart/form-data
          // Browser automatically sets it with the correct boundary
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      // Store the dataset_id returned from the upload
      if (data.dataset_id) {
        setDatasetId(data.dataset_id);
        alert('File uploaded successfully! You can now run the evaluation.');
      } else {
        throw new Error('No dataset_id returned from upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload file: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunEvaluation = async() => {
    if (!selectedKeyId) {
      alert('Please select an API key first');
      return;
    }
    if (!datasetId) {
      alert('Please upload a dataset first');
      return;
    }
    if (!experimentName.trim()) {
      alert('Please enter an experiment name');
      return;
    }

    // Get the selected API key
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) {
      alert('Selected API key not found');
      return;
    }

    setProgress(0);
    setIsEvaluating(true);

    try {
      // Build the request payload
      const payload: any = {
        dataset_id: parseInt(datasetId),
        experiment_name: experimentName.trim(),
      };

      // Add optional config if fields are provided
      const hasConfig = modelName || instructions || vectorStoreIds;
      if (hasConfig) {
        payload.config = {};

        if (modelName) {
          payload.config.model = modelName;
        }

        if (instructions) {
          payload.config.instructions = instructions;
        }

        // Add tools if vector store IDs are provided
        if (vectorStoreIds) {
          const vectorStoreIdArray = vectorStoreIds.split(',').map(id => id.trim()).filter(id => id);
          if (vectorStoreIdArray.length > 0) {
            payload.config.tools = [
              {
                type: 'file_search',
                vector_store_ids: vectorStoreIdArray,
                max_num_results: parseInt(maxNumResults) || 3,
              }
            ];
            payload.config.include = ['file_search_call.results'];
          }
        }
      }

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
      setEvaluationResults(data);
      setProgress(100);
      setIsEvaluating(false);
      setActiveTab('results');
    } catch(error) {
      console.error('Error:', error);
      alert(`Failed to run evaluation: ${error.message}`);
      setIsEvaluating(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Full Height */}
        <aside
          className="border-r transition-all duration-300 ease-in-out h-full flex-shrink-0"
          style={{
            width: sidebarCollapsed ? '0px' : '240px',
            backgroundColor: 'hsl(0, 0%, 100%)',
            borderColor: 'hsl(0, 0%, 85%)',
            overflow: 'hidden',
          }}
        >
          <div className="px-6 py-4" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Kaapi Konsole</h2>
            <p className="text-sm mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>A Tech4Dev Product</p>
          </div>
          <nav className="p-4 space-y-2 h-full" style={{ width: '240px' }}>
            <button
              onClick={() => router.push('/evaluations')}
              className="w-full text-left px-4 py-3 rounded-md transition-all duration-200 text-sm font-medium flex items-center gap-3"
              style={{
                backgroundColor: 'hsl(167, 59%, 22%)',
                color: 'hsl(0, 0%, 100%)'
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Evaluations
            </button>
            <button
              onClick={() => router.push('/keystore')}
              className="w-full text-left px-4 py-3 rounded-md transition-all duration-200 text-sm font-medium flex items-center gap-3"
              style={{
                backgroundColor: 'transparent',
                color: 'hsl(330, 3%, 49%)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 96.5%)';
                e.currentTarget.style.color = 'hsl(330, 3%, 19%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'hsl(330, 3%, 49%)';
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Kaapi Keystore
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Section with Collapse Button */}
          <div className="border-b px-6 py-4" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md transition-colors flex-shrink-0"
                style={{
                  borderWidth: '1px',
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Evaluations</h1>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('upload')}
                className="px-6 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderBottomColor: activeTab === 'upload' ? 'hsl(167, 59%, 22%)' : 'transparent',
                  color: activeTab === 'upload' ? 'hsl(167, 59%, 22%)' : 'hsl(330, 3%, 49%)'
                }}
              >
                1. Upload & Run
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className="px-6 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderBottomColor: activeTab === 'results' ? 'hsl(167, 59%, 22%)' : 'transparent',
                  color: activeTab === 'results' ? 'hsl(167, 59%, 22%)' : 'hsl(330, 3%, 49%)'
                }}
              >
                2. Results
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
            <div className="max-w-7xl mx-auto">
              {activeTab === 'upload' ? (
                <UploadTab
                  uploadedFile={uploadedFile}
                  datasetId={datasetId}
                  isUploading={isUploading}
                  isEvaluating={isEvaluating}
                  progress={progress}
                  apiKeys={apiKeys}
                  selectedKeyId={selectedKeyId}
                  datasetName={datasetName}
                  description={description}
                  duplicationFactor={duplicationFactor}
                  experimentName={experimentName}
                  modelName={modelName}
                  instructions={instructions}
                  vectorStoreIds={vectorStoreIds}
                  maxNumResults={maxNumResults}
                  onKeySelect={setSelectedKeyId}
                  onDatasetNameChange={setDatasetName}
                  onDescriptionChange={setDescription}
                  onDuplicationFactorChange={setDuplicationFactor}
                  onExperimentNameChange={setExperimentName}
                  onModelNameChange={setModelName}
                  onInstructionsChange={setInstructions}
                  onVectorStoreIdsChange={setVectorStoreIds}
                  onMaxNumResultsChange={setMaxNumResults}
                  onFileSelect={handleFileSelect}
                  onUploadDataset={handleUploadDataset}
                  onRunEvaluation={handleRunEvaluation}
                />
              ) : (
                <ResultsTab results={evaluationResults} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ UPLOAD TAB COMPONENT ============
interface UploadTabProps {
  uploadedFile: File | null;
  datasetId: string | null;
  isUploading: boolean;
  isEvaluating: boolean;
  progress: number;
  apiKeys: APIKey[];
  selectedKeyId: string;
  datasetName: string;
  description: string;
  duplicationFactor: string;
  experimentName: string;
  modelName: string;
  instructions: string;
  vectorStoreIds: string;
  maxNumResults: string;
  onKeySelect: (keyId: string) => void;
  onDatasetNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDuplicationFactorChange: (value: string) => void;
  onExperimentNameChange: (value: string) => void;
  onModelNameChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
  onVectorStoreIdsChange: (value: string) => void;
  onMaxNumResultsChange: (value: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadDataset: () => void;
  onRunEvaluation: () => void;
}

function UploadTab({
  uploadedFile,
  datasetId,
  isUploading,
  isEvaluating,
  progress,
  apiKeys,
  selectedKeyId,
  datasetName,
  description,
  duplicationFactor,
  experimentName,
  modelName,
  instructions,
  vectorStoreIds,
  maxNumResults,
  onKeySelect,
  onDatasetNameChange,
  onDescriptionChange,
  onDuplicationFactorChange,
  onExperimentNameChange,
  onModelNameChange,
  onInstructionsChange,
  onVectorStoreIdsChange,
  onMaxNumResultsChange,
  onFileSelect,
  onUploadDataset,
  onRunEvaluation,
}: UploadTabProps) {
  const selectedKey = apiKeys.find(k => k.id === selectedKeyId);

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'hsl(330, 3%, 19%)' }}>How it works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
          <li>Select an API key from your keystore</li>
          <li>Choose your QnA dataset CSV file (format: question, expected_answer columns)</li>
          <li>Edit dataset name, add description and set duplication factor (optional)</li>
          <li>Click "Upload Dataset" - file will be uploaded to S3 and a dataset ID will be generated</li>
          <li>Configure evaluation settings (experiment name required, other fields optional)</li>
          <li>Click "Run Evaluation" to start the evaluation process</li>
          <li>Wait for processing to complete (automatic redirect to results)</li>
          <li>View detailed results and metrics in the Results tab</li>
        </ol>
      </div>

      {/* API Key Selection Card */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Select API Key</h2>

        {apiKeys.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
            <div style={{ color: 'hsl(330, 3%, 49%)' }}>
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
              <p className="font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>No API keys found</p>
              <p className="text-sm mb-4">You need to add an API key before running evaluations</p>
              <a
                href="/keystore"
                className="inline-block px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ backgroundColor: 'hsl(167, 59%, 22%)', color: 'hsl(0, 0%, 100%)' }}
              >
                Go to Kaapi Keystore
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedKeyId}
              onChange={(e) => onKeySelect(e.target.value)}
              className="w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 text-sm"
              style={{
                borderColor: selectedKeyId ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                backgroundColor: 'hsl(0, 0%, 100%)',
                color: 'hsl(330, 3%, 19%)'
              }}
            >
              <option value="">-- Select an API Key --</option>
              {apiKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.provider} - {key.label}
                </option>
              ))}
            </select>

            {selectedKey && (
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'hsl(134, 61%, 95%)', borderColor: 'hsl(134, 61%, 70%)' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(134, 61%, 25%)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(134, 61%, 25%)' }}>
                      Selected: <span className="font-semibold">{selectedKey.provider} - {selectedKey.label}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'hsl(134, 61%, 30%)' }}>
                      Key: {selectedKey.key.substring(0, 8)}...{selectedKey.key.substring(selectedKey.key.length - 4)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Card */}
      <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Upload QnA Dataset</h2>

        {/* File Selection Area */}
        {!datasetId && (
          <>
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center transition-colors"
              style={{
                borderColor: 'hsl(0, 0%, 85%)',
                opacity: !selectedKeyId ? 0.5 : 1,
                pointerEvents: !selectedKeyId ? 'none' : 'auto'
              }}
            >
              <div className="space-y-4">
                <div style={{ color: 'hsl(330, 3%, 49%)' }}>
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <label
                    htmlFor="file-upload"
                    className="px-6 py-2 rounded-md transition-colors inline-block text-sm font-medium"
                    style={{
                      backgroundColor: (isUploading || !!datasetId) ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
                      color: (isUploading || !!datasetId) ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
                      cursor: (isUploading || !!datasetId) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Choose CSV File
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={onFileSelect}
                    disabled={isUploading || !!datasetId}
                    className="hidden"
                  />
                </div>
                {uploadedFile && (
                  <div className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    Selected: <span className="font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{uploadedFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dataset Metadata Fields - Show after file selection */}
            {uploadedFile && !datasetId && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Dataset Name <span style={{ color: 'hsl(8, 86%, 40%)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => onDatasetNameChange(e.target.value)}
                    placeholder="Enter dataset name"
                    disabled={isUploading}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: datasetName ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                      backgroundColor: isUploading ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Enter dataset description"
                    disabled={isUploading}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'hsl(0, 0%, 85%)',
                      backgroundColor: isUploading ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Duplication Factor (Optional)
                  </label>
                  <input
                    type="number"
                    value={duplicationFactor}
                    onChange={(e) => onDuplicationFactorChange(e.target.value)}
                    placeholder="1"
                    min="1"
                    disabled={isUploading}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'hsl(0, 0%, 85%)',
                      backgroundColor: isUploading ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    Number of times to duplicate the dataset rows
                  </p>
                </div>

                {/* Upload Button */}
                <div className="mt-6">
                  <button
                    onClick={onUploadDataset}
                    disabled={!datasetName.trim() || isUploading}
                    className="w-full py-3 rounded-md font-medium text-sm transition-all"
                    style={{
                      backgroundColor: (!datasetName.trim() || isUploading) ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
                      color: (!datasetName.trim() || isUploading) ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
                      cursor: (!datasetName.trim() || isUploading) ? 'not-allowed' : 'pointer',
                      borderWidth: (!datasetName.trim() || isUploading) ? '1px' : '0',
                      borderColor: (!datasetName.trim() || isUploading) ? 'hsl(0, 0%, 85%)' : 'transparent'
                    }}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Dataset'}
                  </button>
                  {!datasetName.trim() && (
                    <p className="text-xs mt-2 text-center" style={{ color: 'hsl(8, 86%, 40%)' }}>
                      Please enter a dataset name
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Upload Success Message */}
        {datasetId && (
          <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(134, 61%, 95%)', borderColor: 'hsl(134, 61%, 70%)' }}>
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(134, 61%, 25%)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(134, 61%, 25%)' }}>
                  Dataset uploaded successfully!
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm" style={{ color: 'hsl(134, 61%, 30%)' }}>
              <p><span className="font-medium">Dataset ID:</span> <span className="font-mono">{datasetId}</span></p>
              <p><span className="font-medium">Dataset Name:</span> {datasetName}</p>
              {uploadedFile && <p><span className="font-medium">File:</span> {uploadedFile.name}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Configuration Card */}
      {datasetId && (
        <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Evaluation Configuration</h2>

          <div className="space-y-4">
            {/* Experiment Name - Required */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Experiment Name <span style={{ color: 'hsl(8, 86%, 40%)' }}>*</span>
              </label>
              <input
                type="text"
                value={experimentName}
                onChange={(e) => onExperimentNameChange(e.target.value)}
                placeholder="e.g., test_run_1"
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: experimentName ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                  backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div>

            {/* Model Name - Optional */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Model (Optional)
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => onModelNameChange(e.target.value)}
                placeholder="e.g., gpt-4"
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div>

            {/* Instructions - Optional */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Instructions (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder="System instructions for the model"
                rows={3}
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div>

            {/* Vector Store Configuration */}
            <div className="border-t pt-4" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(330, 3%, 19%)' }}>
                File Search Configuration (Optional)
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Vector Store IDs
                  </label>
                  <input
                    type="text"
                    value={vectorStoreIds}
                    onChange={(e) => onVectorStoreIdsChange(e.target.value)}
                    placeholder="e.g., vs_12345, vs_67890"
                    disabled={isEvaluating}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'hsl(0, 0%, 85%)',
                      backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    Comma-separated list of vector store IDs for file search
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Max Number of Results
                  </label>
                  <input
                    type="number"
                    value={maxNumResults}
                    onChange={(e) => onMaxNumResultsChange(e.target.value)}
                    placeholder="3"
                    min="1"
                    max="20"
                    disabled={isEvaluating}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'hsl(0, 0%, 85%)',
                      backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Run Evaluation Section */}
      <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Run Evaluation</h2>

        {/* Run Button */}
        <div className="mt-6">
          <button
            onClick={onRunEvaluation}
            disabled={!selectedKeyId || !datasetId || !experimentName.trim() || isEvaluating || isUploading}
            className="w-full py-3 rounded-md font-medium text-sm transition-all"
            style={{
              backgroundColor: !selectedKeyId || !datasetId || !experimentName.trim() || isEvaluating || isUploading ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
              color: !selectedKeyId || !datasetId || !experimentName.trim() || isEvaluating || isUploading ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
              cursor: !selectedKeyId || !datasetId || !experimentName.trim() || isEvaluating || isUploading ? 'not-allowed' : 'pointer',
              borderWidth: !selectedKeyId || !datasetId || !experimentName.trim() || isEvaluating || isUploading ? '1px' : '0',
              borderColor: !selectedKeyId || !datasetId || !experimentName.trim() || isEvaluating || isUploading ? 'hsl(0, 0%, 85%)' : 'transparent'
            }}
          >
            {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
          </button>
          {!selectedKeyId && (
            <p className="text-xs mt-2 text-center" style={{ color: 'hsl(8, 86%, 40%)' }}>
              Please select an API key to continue
            </p>
          )}
          {selectedKeyId && !datasetId && !isUploading && (
            <p className="text-xs mt-2 text-center" style={{ color: 'hsl(8, 86%, 40%)' }}>
              Please upload a dataset file first
            </p>
          )}
          {selectedKeyId && datasetId && !experimentName.trim() && (
            <p className="text-xs mt-2 text-center" style={{ color: 'hsl(8, 86%, 40%)' }}>
              Please enter an experiment name
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {isEvaluating && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>
              <span>Processing pipeline...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'hsl(0, 0%, 91%)' }}>
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: 'hsl(167, 59%, 22%)' }}
              />
            </div>
            <div className="mt-3 text-sm text-center" style={{ color: 'hsl(330, 3%, 49%)' }}>
              {progress < 30 && '📂 Loading dataset...'}
              {progress >= 30 && progress < 60 && '🤖 Running LLM evaluation...'}
              {progress >= 60 && progress < 90 && '📊 Calculating metrics...'}
              {progress >= 90 && '✅ Finalizing results...'}
            </div>
          </div>
        )}
      </div>

      {/* Sample CSV Format */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(330, 3%, 19%)' }}>Expected CSV Format:</h3>
        <pre className="text-xs p-4 rounded-md border overflow-x-auto font-mono" style={{ backgroundColor: 'hsl(0, 0%, 96.5%)', borderColor: 'hsl(0, 0%, 85%)', color: 'hsl(330, 3%, 19%)' }}>
{`question,expected_answer
"What is the capital of France?","Paris"
"Explain photosynthesis","Process by which plants convert light into energy"`}
        </pre>
      </div>
    </div>
  );
}

// ============ RESULTS TAB COMPONENT ============
interface ResultsTabProps {
  results: typeof DUMMY_RESULTS;
}

function ResultsTab({ results }: ResultsTabProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Average Score"
          value={(results.metrics.averageScore * 100).toFixed(1) + '%'}
          icon="📊"
          color="blue"
        />
        <MetricCard
          title="Accuracy"
          value={(results.metrics.accuracy * 100).toFixed(1) + '%'}
          icon="🎯"
          color="green"
        />
        <MetricCard
          title="F1 Score"
          value={(results.metrics.f1Score * 100).toFixed(1) + '%'}
          icon="⚡"
          color="purple"
        />
      </div>

      {/* Dataset Info */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Evaluation Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Dataset" value={results.dataset.name} />
          <InfoItem label="Total Rows" value={results.dataset.totalRows.toString()} />
          <InfoItem label="Model" value={results.modelInfo.model} />
          <InfoItem label="Temperature" value={results.modelInfo.temperature.toString()} />
        </div>
      </div>

      {/* Detailed Logs */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Detailed Evaluation Logs</h2>
        <div className="space-y-3">
          {results.logs.map((log) => (
            <LogItem key={log.id} log={log} />
          ))}
        </div>
      </div>

      {/* Export Actions */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Export Results</h3>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-md transition-colors text-sm font-medium"
            style={{ backgroundColor: 'hsl(167, 59%, 22%)', color: 'hsl(0, 0%, 100%)' }}
          >
            📥 Download CSV
          </button>
          <button
            className="px-4 py-2 rounded-md transition-colors text-sm font-medium"
            style={{
              borderWidth: '1px',
              borderColor: 'hsl(0, 0%, 85%)',
              backgroundColor: 'hsl(0, 0%, 100%)',
              color: 'hsl(330, 3%, 19%)'
            }}
          >
            📋 Copy to Clipboard
          </button>
          <button
            className="px-4 py-2 rounded-md transition-colors text-sm font-medium"
            style={{
              borderWidth: '1px',
              borderColor: 'hsl(0, 0%, 85%)',
              backgroundColor: 'hsl(0, 0%, 100%)',
              color: 'hsl(330, 3%, 19%)'
            }}
          >
            📤 Export to Langfuse
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ HELPER COMPONENTS ============
interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'purple';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: { bg: 'hsl(0, 0%, 100%)', border: 'hsl(0, 0%, 85%)', text: 'hsl(330, 3%, 19%)' },
    green: { bg: 'hsl(134, 61%, 95%)', border: 'hsl(134, 61%, 70%)', text: 'hsl(134, 61%, 25%)' },
    purple: { bg: 'hsl(0, 0%, 100%)', border: 'hsl(0, 0%, 85%)', text: 'hsl(330, 3%, 19%)' },
  };

  return (
    <div className="border rounded-lg p-6" style={{ backgroundColor: colorClasses[color].bg, borderColor: colorClasses[color].border }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium" style={{ color: 'hsl(330, 3%, 49%)' }}>Live</span>
      </div>
      <div className="text-3xl font-semibold" style={{ color: colorClasses[color].text }}>{value}</div>
      <div className="text-sm mt-2" style={{ color: 'hsl(330, 3%, 49%)' }}>{title}</div>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div>
      <div className="text-xs uppercase font-semibold" style={{ color: 'hsl(330, 3%, 49%)' }}>{label}</div>
      <div className="text-lg font-medium mt-1" style={{ color: 'hsl(330, 3%, 19%)' }}>{value}</div>
    </div>
  );
}

interface LogItemProps {
  log: typeof DUMMY_RESULTS.logs[0];
}

function LogItem({ log }: LogItemProps) {
  const statusColors = {
    pass: { bg: 'hsl(134, 61%, 95%)', border: 'hsl(134, 61%, 70%)', text: 'hsl(134, 61%, 25%)' },
    warning: { bg: 'hsl(46, 100%, 95%)', border: 'hsl(46, 100%, 80%)', text: 'hsl(46, 100%, 25%)' },
    fail: { bg: 'hsl(8, 86%, 95%)', border: 'hsl(8, 86%, 80%)', text: 'hsl(8, 86%, 40%)' },
  };

  return (
    <div className="border rounded-lg p-4" style={{ backgroundColor: statusColors[log.status].bg, borderColor: statusColors[log.status].border }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="font-semibold text-sm mb-1" style={{ color: statusColors[log.status].text }}>Question #{log.id}</div>
          <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>{log.question}</div>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <span className="text-lg font-semibold" style={{ color: statusColors[log.status].text }}>{(log.score * 100).toFixed(0)}%</span>
          <span className="text-xl">
            {log.status === 'pass' ? '✅' : log.status === 'warning' ? '⚠️' : '❌'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
        <div>
          <div className="font-medium mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Expected:</div>
          <div style={{ color: 'hsl(330, 3%, 19%)' }}>{log.expected}</div>
        </div>
        <div>
          <div className="font-medium mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Actual:</div>
          <div style={{ color: 'hsl(330, 3%, 19%)' }}>{log.actual}</div>
        </div>
      </div>
    </div>
  );
}
