/**
 * SimplifiedEval.tsx - Simplified One-Click Evaluation Flow
 *
 * Two-tab structure:
 * 1. Upload Tab: Upload QnA dataset → Run evaluation
 * 2. Results Tab: View evaluation results with metrics and detailed logs
 */

"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'

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

export default function SimplifiedEval() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState(DUMMY_RESULTS);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleRunEvaluation = () => {
    if (!uploadedFile) {
      alert('Please upload a dataset first');
      return;
    }
    setProgress(0);
    setIsEvaluating(true);
  };

  const handleBackToWorkflow = () => {
    router.push('/eval/');
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Simplified Evaluation Pipeline</h1>
            <p className="text-sm text-gray-500 mt-1">A Tech4Dev Product</p>
          </div>
          <button
            onClick={handleBackToWorkflow}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-md transition-colors text-sm font-medium"
          >
            ← Back to Workflow
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto flex">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            1. Upload & Run
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'results'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            2. Results
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'upload' ? (
            <UploadTab
              uploadedFile={uploadedFile}
              isEvaluating={isEvaluating}
              progress={progress}
              onFileUpload={handleFileUpload}
              onRunEvaluation={handleRunEvaluation}
            />
          ) : (
            <ResultsTab results={evaluationResults} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============ UPLOAD TAB COMPONENT ============
interface UploadTabProps {
  uploadedFile: File | null;
  isEvaluating: boolean;
  progress: number;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRunEvaluation: () => void;
}

function UploadTab({
  uploadedFile,
  isEvaluating,
  progress,
  onFileUpload,
  onRunEvaluation,
}: UploadTabProps) {
  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">How it works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>Upload your QnA dataset (CSV format with columns: question, expected_answer)</li>
          <li>Click "Run Evaluation" to start the pipeline</li>
          <li>Wait for processing to complete (automatic redirect to results)</li>
          <li>View detailed results and metrics in the Results tab</li>
        </ol>
      </div>

      {/* Upload Card */}
      <div className="bg-white border rounded-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload QnA Dataset</h2>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors">
          <div className="space-y-4">
            <div className="text-gray-400">
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
                className="cursor-pointer bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors inline-block text-sm font-medium"
              >
                Choose File
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={onFileUpload}
                className="hidden"
              />
            </div>
            {uploadedFile && (
              <div className="text-sm text-gray-600">
                Selected: <span className="font-medium text-gray-900">{uploadedFile.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Run Button */}
        <div className="mt-6">
          <button
            onClick={onRunEvaluation}
            disabled={!uploadedFile || isEvaluating}
            className={`w-full py-3 rounded-md font-medium text-sm transition-all ${
              !uploadedFile || isEvaluating
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
          </button>
        </div>

        {/* Progress Bar */}
        {isEvaluating && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Processing pipeline...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gray-900 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 text-sm text-gray-500 text-center">
              {progress < 30 && '📂 Loading dataset...'}
              {progress >= 30 && progress < 60 && '🤖 Running LLM evaluation...'}
              {progress >= 60 && progress < 90 && '📊 Calculating metrics...'}
              {progress >= 90 && '✅ Finalizing results...'}
            </div>
          </div>
        )}
      </div>

      {/* Sample CSV Format */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Expected CSV Format:</h3>
        <pre className="text-xs bg-gray-50 p-4 rounded-md border overflow-x-auto font-mono text-gray-700">
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
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Evaluation Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="Dataset" value={results.dataset.name} />
          <InfoItem label="Total Rows" value={results.dataset.totalRows.toString()} />
          <InfoItem label="Model" value={results.modelInfo.model} />
          <InfoItem label="Temperature" value={results.modelInfo.temperature.toString()} />
        </div>
      </div>

      {/* Detailed Logs */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Evaluation Logs</h2>
        <div className="space-y-3">
          {results.logs.map((log) => (
            <LogItem key={log.id} log={log} />
          ))}
        </div>
      </div>

      {/* Export Actions */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Results</h3>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium">
            📥 Download CSV
          </button>
          <button className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
            📋 Copy to Clipboard
          </button>
          <button className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium">
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
    blue: 'border-gray-200 bg-white',
    green: 'border-green-200 bg-green-50',
    purple: 'border-gray-200 bg-white',
  };

  const textColor = {
    blue: 'text-gray-900',
    green: 'text-green-900',
    purple: 'text-gray-900',
  };

  return (
    <div className={`border ${colorClasses[color]} rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-500 font-medium">Live</span>
      </div>
      <div className={`text-3xl font-semibold ${textColor[color]}`}>{value}</div>
      <div className="text-sm text-gray-600 mt-2">{title}</div>
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
      <div className="text-xs text-gray-500 uppercase font-semibold">{label}</div>
      <div className="text-lg font-medium text-gray-900 mt-1">{value}</div>
    </div>
  );
}

interface LogItemProps {
  log: typeof DUMMY_RESULTS.logs[0];
}

function LogItem({ log }: LogItemProps) {
  const statusColors = {
    pass: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    fail: 'bg-red-50 border-red-200',
  };

  const textColors = {
    pass: 'text-green-900',
    warning: 'text-yellow-900',
    fail: 'text-red-900',
  };

  return (
    <div className={`border rounded-lg p-4 ${statusColors[log.status]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className={`font-semibold text-sm mb-1 ${textColors[log.status]}`}>Question #{log.id}</div>
          <div className="text-sm text-gray-700">{log.question}</div>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <span className={`text-lg font-semibold ${textColors[log.status]}`}>{(log.score * 100).toFixed(0)}%</span>
          <span className="text-xl">
            {log.status === 'pass' ? '✅' : log.status === 'warning' ? '⚠️' : '❌'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
        <div>
          <div className="font-medium text-gray-600 mb-1">Expected:</div>
          <div className="text-gray-700">{log.expected}</div>
        </div>
        <div>
          <div className="font-medium text-gray-600 mb-1">Actual:</div>
          <div className="text-gray-700">{log.actual}</div>
        </div>
      </div>
    </div>
  );
}