export interface Settings {
  latentVeIntervalHours: number
  activeVeIntervalHours: number
  activeMinCmPerHour: number
  latentMaxHoursAfterRom: number
  confirmedDelayMinCm: number
  veAfterOxytocinForDelayHours: number
  romAlertHours: number[]
  oxytocinAfterAromHours: number
  tachysystolePer10: number
  secondStage: {
    nullipSuspectMin: number
    nullipDelayMin: number
    parousSuspectMin: number
    parousDelayMin: number
  }
  autoDeleteHoursAfterDelivery: 24 | 48 | 72
  vibrateOnRedFlag: boolean
  theme: 'system' | 'light' | 'dark'
}

export type Ward = '7F' | '7E' | '6EF'

export interface Case {
  id: string
  createdAt: string
  updatedAt: string
  ward: Ward
  bed: string
  initials: string
  age?: number
  gravida: number
  para: number
  edd: string
  weightKg?: number
  heightCm?: number
  labourType: 'IOL' | 'Spontaneous'
  iolIndication?: string
  iolIndicationOther?: string
  plannedIolAt?: string
  historyFlags: string[]
  historyNote?: string
  usg?: {
    date: string
    efwGrams?: number
    efwCentile?: number
    presentation?: 'Cephalic' | 'Breech' | 'Transverse' | 'Oblique' | 'Unstable'
    liquor?: { method: 'AFI' | 'DVP'; valueCm: number }
    placenta?: 'Anterior' | 'Posterior' | 'Fundal' | 'Lateral' | 'Low-lying' | 'Praevia'
  }
  notes?: string
  deliveredAt?: string
}

export type Liquor = 'Clear' | 'Blood-stained' | 'Meconium – light' | 'Meconium – thick' | 'Scanty / none seen'
export type FetalPosition = 'OA' | 'LOA' | 'ROA' | 'OT' | 'LOT' | 'ROT' | 'OP' | 'LOP' | 'ROP' | 'Not determined'
interface BaseEvent {
  id: string
  caseId: string
  at: string
  note?: string
  createdAt: string
}
export type LabourEvent = BaseEvent & (
  | { type: 'IOL_STARTED'; ward: '7E' | '6EF'; bed: string }
  | { type: 'AROM' | 'SROM'; liquor: Liquor }
  | { type: 'OXYTOCIN_START' | 'OXYTOCIN_RATE'; rateMlPerHr: number }
  | { type: 'OXYTOCIN_STOP'; reason?: string }
  | { type: 'CONTRACTIONS'; per10min: number; regular: boolean }
  | { type: 'VE'; dilatationCm: number; station?: number; position?: FetalPosition }
  | { type: 'CTG_CONCERN'; classification?: 'Suspicious' | 'Pathological' }
  | { type: 'MATERNAL_PYREXIA'; temperatureC?: number }
  | { type: 'REMINDER'; label: string; dueAt: string; doneAt?: string }
  | { type: 'TRANSFER'; toWard: Ward; toBed: string }
  | { type: 'ESTABLISHED_LABOUR' | 'EPIDURAL' | 'MATERNAL_PYREXIA_RESOLVED' | 'FULL_DILATATION' | 'ACTIVE_PUSHING' | 'DELIVERED' | 'NOTE' }
)

export interface Acknowledgement {
  caseId: string
  flagId: string
  threshold: string
  acknowledgedAt: string
}
