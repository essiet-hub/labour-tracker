import type { Settings } from '../logic/types'

export function defaultSettings(): Settings {
  return {
    // Local first-stage rules agreed in IMPLEMENTATION-PLAN.md, decision 1.
    latentVeIntervalHours: 4,
    activeVeIntervalHours: 2,
    activeMinCmPerHour: 1,
    latentMaxHoursAfterRom: 12,
    confirmedDelayMinCm: 1,
    veAfterOxytocinForDelayHours: 4,
    // Requirements section 8: ROM thresholds and IOL timing (match local protocol).
    romAlertHours: [18, 24],
    oxytocinAfterAromHours: 2,
    // NICE-derived rule specified in section 8: flag strictly above this count.
    tachysystolePer10: 5,
    // NICE-derived active pushing timings specified in section 7.3.
    secondStage: {
      nullipSuspectMin: 60,
      nullipDelayMin: 120,
      parousSuspectMin: 30,
      parousDelayMin: 60,
    },
    // Product preferences from requirements section 6.5.
    autoDeleteHoursAfterDelivery: 72,
    vibrateOnRedFlag: true,
    theme: 'system',
  }
}

export const disclaimer = 'This app is a personal reminder tool. It does not replace clinical judgement, the medical record or local protocols. Always verify timings.'
export const storageNote = 'Cases are stored only on this device. Clearing browser data will erase them.'
