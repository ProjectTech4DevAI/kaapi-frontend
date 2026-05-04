import type {
  EvalJob,
  AssistantConfig,
  GroupedTraceItem,
  ScoreObject,
} from "@/app/lib/types/evaluation";
import { normalizeToIndividualScores } from "@/app/lib/utils/evaluation";
import { sanitizeCSVCell } from "@/app/lib/utils";

const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const safeFilename = (input: string) => input.replace(/[^a-z0-9]/gi, "_");

export const exportGroupedCSV = (
  job: EvalJob,
  traces: GroupedTraceItem[],
): number => {
  const maxAnswers = Math.max(...traces.map((g) => g.llm_answers.length));
  const scoreNames = traces[0]?.scores[0]?.map((s) => s.name) || [];
  let csvContent = "Question ID,Question,Ground Truth";
  for (let i = 1; i <= maxAnswers; i++) {
    csvContent += `,LLM Answer ${i},Trace ID ${i}`;
    scoreNames.forEach((name) => {
      csvContent += `,${name} (${i}),${sanitizeCSVCell(`${name} (${i}) Comment`)}`;
    });
  }
  csvContent += "\n";
  traces.forEach((group) => {
    const row: string[] = [
      String(group.question_id),
      sanitizeCSVCell(group.question || ""),
      sanitizeCSVCell(group.ground_truth_answer || ""),
    ];
    for (let i = 0; i < maxAnswers; i++) {
      row.push(
        `"${(group.llm_answers[i] || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      );
      row.push(group.trace_ids[i] || "");
      scoreNames.forEach((name) => {
        const score = group.scores[i]?.find((s) => s.name === name);
        row.push(score ? String(score.value) : "");
        row.push(score?.comment ? sanitizeCSVCell(score.comment, true) : "");
      });
    }
    csvContent += row.join(",") + "\n";
  });

  downloadCSV(
    csvContent,
    `evaluation_${job.id}_${safeFilename(job.run_name)}_grouped.csv`,
  );
  return traces.length;
};

export const exportRowCSV = (
  job: EvalJob,
  scoreObject: ScoreObject,
  assistantConfig?: AssistantConfig,
): number => {
  const individual_scores = normalizeToIndividualScores(scoreObject);
  if (!individual_scores || individual_scores.length === 0) {
    throw new Error("No valid data available to export");
  }

  let csvContent = "";
  const firstItem = individual_scores[0];
  const scoreNames = firstItem?.trace_scores?.map((s) => s.name) || [];
  csvContent +=
    "Counter,Trace ID,Job ID,Run Name,Dataset,Model,Status,Total Items,";
  csvContent += "Question,Answer,Ground Truth,";
  csvContent +=
    scoreNames.map((name) => `${name},${name} (comment)`).join(",") + "\n";

  let rowCount = 0;
  individual_scores.forEach((item, index) => {
    const row = [
      index + 1,
      item.trace_id || "N/A",
      job.id,
      `"${job.run_name.replace(/"/g, '""')}"`,
      `"${job.dataset_name.replace(/"/g, '""')}"`,
      assistantConfig?.model || job.config?.model || "N/A",
      job.status,
      job.total_items,
      `"${(item.input?.question || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      `"${(item.output?.answer || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      `"${(item.metadata?.ground_truth || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      ...scoreNames.flatMap((name) => {
        const score = item.trace_scores?.find((s) => s.name === name);
        return [
          score ? score.value : "N/A",
          score?.comment ? sanitizeCSVCell(score.comment, true) : "",
        ];
      }),
    ].join(",");
    csvContent += row + "\n";
    rowCount++;
  });

  downloadCSV(
    csvContent,
    `evaluation_${job.id}_${safeFilename(job.run_name)}.csv`,
  );
  return rowCount;
};
