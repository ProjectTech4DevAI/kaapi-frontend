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
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
      {/* Header */}
      <div className="border-b p-4" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Simplified Evaluation Pipeline</h1>
            <p className="text-sm mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>A Tech4Dev Product</p>
          </div>
          <button
            onClick={handleBackToWorkflow}
            className="px-4 py-2 rounded-md transition-colors text-sm font-medium"
            style={{ 
              borderWidth: '1px',
              borderColor: 'hsl(0, 0%, 85%)',
              backgroundColor: 'hsl(0, 0%, 100%)',
              color: 'hsl(330, 3%, 19%)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
          >
            ← Back to Workflow
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <div className="max-w-7xl mx-auto flex">
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
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'hsl(330, 3%, 19%)' }}>How it works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
          <li>Upload your QnA dataset (CSV format with columns: question, expected_answer)</li>
          <li>Click "Run Evaluation" to start the pipeline</li>
          <li>Wait for processing to complete (automatic redirect to results)</li>
          <li>View detailed results and metrics in the Results tab</li>
        </ol>
      </div>

      {/* Upload Card */}
      <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Upload QnA Dataset</h2>

        <div className="border-2 border-dashed rounded-lg p-12 text-center transition-colors" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
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
                className="cursor-pointer px-6 py-2 rounded-md transition-colors inline-block text-sm font-medium"
                style={{ backgroundColor: 'hsl(167, 59%, 22%)', color: 'hsl(0, 0%, 100%)' }}
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
              <div className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
                Selected: <span className="font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{uploadedFile.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Run Button */}
        <div className="mt-6">
          <button
            onClick={onRunEvaluation}
            disabled={!uploadedFile || isEvaluating}
            className="w-full py-3 rounded-md font-medium text-sm transition-all"
            style={{
              backgroundColor: !uploadedFile || isEvaluating ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
              color: !uploadedFile || isEvaluating ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
              cursor: !uploadedFile || isEvaluating ? 'not-allowed' : 'pointer',
              borderWidth: !uploadedFile || isEvaluating ? '1px' : '0',
              borderColor: !uploadedFile || isEvaluating ? 'hsl(0, 0%, 85%)' : 'transparent'
            }}
          >
            {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
          </button>
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