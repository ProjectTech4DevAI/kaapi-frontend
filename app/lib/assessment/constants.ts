export const ASSESSMENT_TAG = "ASSESSMENT" as const;
export const ASSESSMENT_FEATURE_FLAG = ASSESSMENT_TAG;
export const ASSESSMENT_CONFIG_TAG = ASSESSMENT_TAG;
export const ASSESSMENT_CONFIG_VERSION_PAGE_SIZE = 8;

export type AssessmentTag = typeof ASSESSMENT_TAG;
export type AssessmentConfigTag = typeof ASSESSMENT_CONFIG_TAG;
export type AssessmentFeatureFlag = typeof ASSESSMENT_FEATURE_FLAG;
