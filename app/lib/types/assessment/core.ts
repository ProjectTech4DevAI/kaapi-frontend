// Assessment types: generic utilities, navigation, and tab primitives.
import type { Dispatch, SetStateAction } from "react";

export type ValueSetter<T> = (value: T) => void;
export type StateSetter<T> = Dispatch<SetStateAction<T>>;
export type SampleRow = Record<string, string>;
export type ListResponse<T> = T[] | { data?: T[] };
export type CreateResponse<T> = T | { data?: T };
export type RouteContext<K extends string> = {
  params: Promise<Record<K, string>>;
};

export interface LabeledValue<T = string> {
  value: T;
  label: string;
}

export interface PagedResult<T> {
  items: T[];
  hasMore: boolean;
  nextSkip: number;
}

export type AssessmentTabId = "datasets" | "config" | "results";
export interface AssessmentTab {
  id: AssessmentTabId;
  label: string;
}

export interface Step {
  id: number;
  label: string;
}

export interface StepNavigationProps {
  onNext: () => void;
  onBack: () => void;
}

export interface WithForbiddenHandler {
  onForbidden?: () => void;
}
