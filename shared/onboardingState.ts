import z from "zod";
export const onboardingModeSchema = z.enum([
    "student",
    "professional",
    "curious",
    "looking-for-a-job",
]);

export type OnboardingMode = z.infer<typeof onboardingModeSchema>;

export const onboardingStateSchema = z.object({
    permissions: z.object({
        didGrantMicrophonePermission: z.boolean(),
        didGrantScreenPermission: z.boolean(),
        didGrantAccessibilityPermission: z.boolean(),
    }),
    restarted: z.boolean(),
    surveys: z.object({
        mode: onboardingModeSchema.optional(),
        surveyAnswer: z.string().optional(),
        submitted: z.boolean(),
    }),
    learn: z.object({
        didCompleteSend: z.boolean(),
        didCompleteHide: z.boolean(),
    }),
    didCompleteLanding: z.boolean(),
    completed: z.boolean(),
});
export const DEFAULT_ONBOARDING_STATE = {
    permissions: {
        didGrantMicrophonePermission: false,
        didGrantScreenPermission: false,
        didGrantAccessibilityPermission: false,
    },
    restarted: false,
    surveys: {
        mode: undefined,
        surveyAnswer: undefined,
        submitted: false,
    },
    learn: {
        didCompleteSend: false,
        didCompleteHide: false,
    },
    didCompleteLanding: false,
    completed: false,
};
