export const wards = [
  { code: '6EF', label: '6EF Labour ward' },
  { code: '7E', label: '7E First stage' },
  { code: '7F', label: '7F Antenatal – awaiting IOL' },
] as const

export const iolIndications = [
  'Post-dates', 'SROM', 'Gestational diabetes', 'GDM + LGA', 'Pre-existing diabetes',
  'Gestational hypertension / pre-eclampsia', 'Chronic hypertension', 'FGR / SGA',
  'Suspected macrosomia', 'Reduced fetal movements', 'Oligohydramnios',
  'Advanced maternal age', 'Obstetric cholestasis', 'Maternal request', 'Other',
] as const

export const historyFlags = [
  'Previous CS', 'Other uterine surgery', 'GBS positive', 'GBS unknown',
  'GDM', 'Pre-existing diabetes',
  'Hypertension / PET', 'FGR / SGA', 'LGA', 'Rh negative',
  'Twins', 'Previous PPH', 'Precipitated labour',
  'Thrombocytopenia', 'Other (use note)',
] as const

export const fetalPositions = ['OA', 'LOA', 'ROA', 'OT', 'LOT', 'ROT', 'OP', 'LOP', 'ROP', 'Not determined'] as const
export const liquorOptions = ['Clear', 'Blood-stained', 'Meconium – light', 'Meconium – thick', 'Scanty / none seen'] as const

// Requirements section 9.2: plausibility warnings only, never blocking a save.
export const plausibleRanges = { weightKg: [30, 250], heightCm: [120, 210], efwGrams: [300, 6000] } as const
