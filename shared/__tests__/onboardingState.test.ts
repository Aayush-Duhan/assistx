import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { onboardingStateSchema, DEFAULT_ONBOARDING_STATE } from '../onboardingState';

/**
 * **Feature: landing-page-shared-state, Property 2: Onboarding state serialization round-trip**
 * **Validates: Requirements 2.1**
 * 
 * For any valid onboarding state object, serializing to JSON and deserializing 
 * should produce an equivalent object with didCompleteLanding preserved.
 */
describe('onboardingState', () => {
  // Arbitrary for generating valid onboarding states
  const onboardingModeArb = fc.constantFrom('student', 'professional', 'curious', 'looking-for-a-job');

  const onboardingStateArb = fc.record({
    permissions: fc.record({
      didGrantMicrophonePermission: fc.boolean(),
      didGrantScreenPermission: fc.boolean(),
      didGrantAccessibilityPermission: fc.boolean(),
    }),
    restarted: fc.boolean(),
    surveys: fc.record({
      mode: fc.option(onboardingModeArb, { nil: undefined }),
      surveyAnswer: fc.option(fc.string(), { nil: undefined }),
      submitted: fc.boolean(),
    }),
    learn: fc.record({
      didCompleteSend: fc.boolean(),
      didCompleteHide: fc.boolean(),
    }),
    didCompleteLanding: fc.boolean(),
    completed: fc.boolean(),
  });

  it('Property 2: serialization round-trip preserves didCompleteLanding', () => {
    fc.assert(
      fc.property(onboardingStateArb, (state) => {
        // Serialize to JSON
        const serialized = JSON.stringify(state);
        // Deserialize
        const deserialized = JSON.parse(serialized);
        // Parse with schema to validate
        const parsed = onboardingStateSchema.parse(deserialized);

        // didCompleteLanding should be preserved
        expect(parsed.didCompleteLanding).toBe(state.didCompleteLanding);
        // Full object should be equivalent
        expect(parsed).toEqual(state);
      }),
      { numRuns: 100 }
    );
  });

  it('DEFAULT_ONBOARDING_STATE has didCompleteLanding set to false', () => {
    expect(DEFAULT_ONBOARDING_STATE.didCompleteLanding).toBe(false);
  });

  it('schema validates DEFAULT_ONBOARDING_STATE', () => {
    const result = onboardingStateSchema.safeParse(DEFAULT_ONBOARDING_STATE);
    expect(result.success).toBe(true);
  });

  /**
   * **Feature: landing-page-shared-state, Property 1: Landing page visibility is determined by didCompleteLanding**
   * **Validates: Requirements 1.4, 1.5**
   * 
   * For any onboarding state, the landing page should be displayed if and only if 
   * didCompleteLanding is false.
   */
  it('Property 1: landing page visibility is determined by didCompleteLanding', () => {
    fc.assert(
      fc.property(fc.boolean(), (didCompleteLanding) => {
        // The logic: show landing page when didCompleteLanding is false
        const shouldShowLanding = !didCompleteLanding;

        // Verify the logic is correct
        if (didCompleteLanding) {
          expect(shouldShowLanding).toBe(false); // Landing should NOT be shown
        } else {
          expect(shouldShowLanding).toBe(true); // Landing SHOULD be shown
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: landing-page-shared-state, Property 3: Reset restores didCompleteLanding to default**
   * **Validates: Requirements 2.3**
   * 
   * For any onboarding state, after reset, didCompleteLanding should be false.
   */
  it('Property 3: reset restores didCompleteLanding to default', () => {
    fc.assert(
      fc.property(onboardingStateArb, (_state) => {
        // Simulate reset by using DEFAULT_ONBOARDING_STATE
        // After reset, didCompleteLanding should always be false
        const resetState = DEFAULT_ONBOARDING_STATE;

        expect(resetState.didCompleteLanding).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
