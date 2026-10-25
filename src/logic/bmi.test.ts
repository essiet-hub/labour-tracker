import { bmi } from './bmi'

describe('BMI', () => {
  it('returns BMI rounded to one decimal place', () => {
    expect(bmi(65, 165)).toBe('23.9')
    expect(bmi(81, 180)).toBe('25.0')
  })

  it.each([
    [undefined, 165], [65, undefined], [65, 0], [0, 165], [-1, 165],
    [65, -165], [NaN, 165], [65, Infinity],
  ])('returns no BMI for unusable inputs (%s, %s)', (weight, height) => {
    expect(bmi(weight, height)).toBeNull()
  })
})
