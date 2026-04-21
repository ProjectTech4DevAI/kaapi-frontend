export const FeatureFlag = {
  ASSESSMENT: "ASSESSMENT",
} as const;

export type FeatureFlagKey = (typeof FeatureFlag)[keyof typeof FeatureFlag];
