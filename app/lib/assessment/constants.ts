export const ASSESSMENT_FEATURE_FLAG = "ASSESSMENT" as const;
export const ASSESSMENT_CONFIG_TAG = "ASSESSMENT" as const;
export const ASSESSMENT_CONFIG_VERSION_PAGE_SIZE = 8;

export type AssessmentConfigTag = typeof ASSESSMENT_CONFIG_TAG;
export type AssessmentFeatureFlag = typeof ASSESSMENT_FEATURE_FLAG;
