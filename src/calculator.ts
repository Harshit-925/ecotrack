/**
 * EcoTrack Carbon Calculation Engine
 * 
 * Sourced from verified databases combining EPA, DEFRA, and Our World In Data.
 */

/**
 * Interface representing the complete set of calculator inputs.
 */
export interface StateValues {
  calcMode: 'personal' | 'office' | 'node-server';
  carKm: number;
  carType: 'gasoline' | 'diesel' | 'hybrid' | 'electric';
  publicTransit: number;
  flightsShort: number;
  flightsLong: number;
  electricity: number;
  energySource: 'grid' | 'solar' | 'wind' | 'mixed';
  heating: 'gas' | 'electric' | 'oil' | 'heat-pump';
  homeSize: number;
  dietType: 'meat-heavy' | 'average' | 'pescatarian' | 'vegetarian' | 'vegan';
  foodWaste: number;
  localFood: number;
  shopping: number;
  recycling: number;
  digital: number;
}

/**
 * Interface representing a breakdown category element for charts.
 */
export interface BreakdownItem {
  category: string;
  value: number;
  color: string;
  icon: string;
}

/**
 * Interface representing the grading scores card profile.
 */
export interface EcoScore {
  letter: string;
  score: number;
  description: string;
}

/**
 * Interface representing the compiled outputs of the emissions engine.
 */
export interface CalculationResults {
  transport: number;
  energy: number;
  diet: number;
  lifestyle: number;
  total: number;
  breakdown: BreakdownItem[];
  ecoScore: EcoScore;
  trees: number;
  earthsNeeded: number;
  costImpact: number;
}

/**
 * Scientific emission factors (kg CO2 equivalent per unit).
 */
export const EMISSION_FACTORS = {
  car: { gasoline: 0.21, diesel: 0.27, hybrid: 0.12, electric: 0.05 },
  publicTransit: 0.089,
  flights: { short: 0.255, long: 0.195 },
  electricity: 0.417,
  energySource: { grid: 1.0, solar: 0.05, wind: 0.02, mixed: 0.5 },
  heating: { gas: 2.0, electric: 1.5, oil: 2.5, 'heat-pump': 0.5 },
  homeSize: 0.0005,
  diet: { 'meat-heavy': 3.3, average: 2.5, pescatarian: 1.7, vegetarian: 1.5, vegan: 1.0 },
  foodWaste: 0.02,
  localFood: -0.005,
  shopping: 0.006,
  digital: 0.036,
  recycling: -0.015
};

/** Global averages and targets baseline */
export const WORLD_AVERAGE = 4.5;
export const US_AVERAGE = 14.7;
export const EU_AVERAGE = 6.1;
export const TARGET_2030 = 2.0;

/**
 * Utility to strictly clamp a numeric value to min and max boundaries.
 * 
 * @param val - The raw input numeric value.
 * @param min - The minimum allowed boundary.
 * @param max - The maximum allowed boundary.
 * @returns The clamped safe numeric value.
 */
export function clampValue(val: number, min: number, max: number): number {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return min;
  }
  return Math.max(min, Math.min(max, val));
}

/**
 * Sanitizes and validates inputs to prevent any out-of-bounds, NaN, or malicious values.
 * 
 * @param v - A partial state values object.
 * @returns A fully sanitized StateValues object.
 */
export function sanitizeStateValues(v: Partial<StateValues>): StateValues {
  const carTypeVal = v.carType ?? 'gasoline';
  const energySourceVal = v.energySource ?? 'grid';
  const heatingVal = v.heating ?? 'gas';
  const dietTypeVal = v.dietType ?? 'average';
  const calcModeVal = v.calcMode ?? 'personal';

  return {
    calcMode: (calcModeVal === 'office' || calcModeVal === 'node-server' || calcModeVal === 'personal') ? calcModeVal : 'personal',
    carKm: clampValue(v.carKm ?? 30, 0, 200),
    carType: (carTypeVal === 'gasoline' || carTypeVal === 'diesel' || carTypeVal === 'hybrid' || carTypeVal === 'electric') ? carTypeVal : 'gasoline',
    publicTransit: clampValue(v.publicTransit ?? 5, 0, 40),
    flightsShort: clampValue(v.flightsShort ?? 2, 0, 20),
    flightsLong: clampValue(v.flightsLong ?? 1, 0, 10),
    electricity: clampValue(v.electricity ?? 300, 0, 1000),
    energySource: (energySourceVal === 'grid' || energySourceVal === 'solar' || energySourceVal === 'wind' || energySourceVal === 'mixed') ? energySourceVal : 'grid',
    heating: (heatingVal === 'gas' || heatingVal === 'electric' || heatingVal === 'oil' || heatingVal === 'heat-pump') ? heatingVal : 'gas',
    homeSize: clampValue(v.homeSize ?? 1200, 200, 5000),
    dietType: (dietTypeVal === 'meat-heavy' || dietTypeVal === 'average' || dietTypeVal === 'pescatarian' || dietTypeVal === 'vegetarian' || dietTypeVal === 'vegan') ? dietTypeVal : 'average',
    foodWaste: clampValue(v.foodWaste ?? 15, 0, 50),
    localFood: clampValue(v.localFood ?? 20, 0, 100),
    shopping: clampValue(v.shopping ?? 500, 0, 2000),
    recycling: clampValue(v.recycling ?? 30, 0, 100),
    digital: clampValue(v.digital ?? 6, 0, 16)
  };
}

/**
 * Main calculations runner for Carbon footprint.
 * 
 * Calculates carbon output (in tonnes CO2/year) across four distinct categories.
 * 
 * @param values - Current input state parameters.
 * @returns The fully computed CalculationResults object.
 */
export function calculateEmissions(values: StateValues): CalculationResults {
  const v = sanitizeStateValues(values);

  // 1. Transportation
  const carFactor = EMISSION_FACTORS.car[v.carType] ?? 0.21;
  const transportCar = (v.carKm * 365 * carFactor) / 1000;
  const transportTransit = (v.publicTransit * 30 * 52 * EMISSION_FACTORS.publicTransit) / 1000;
  const transportFlights = (v.flightsShort * EMISSION_FACTORS.flights.short) + (v.flightsLong * EMISSION_FACTORS.flights.long);
  const transportTotal = transportCar + transportTransit + transportFlights;

  // 2. Home Energy
  const energyFactor = EMISSION_FACTORS.energySource[v.energySource] ?? 1.0;
  const electricityBase = (v.electricity * 12 * EMISSION_FACTORS.electricity * energyFactor) / 1000;
  const homeSizeMultiplier = (v.homeSize * EMISSION_FACTORS.homeSize) + 0.4;
  const heatingBase = (EMISSION_FACTORS.heating[v.heating] ?? 2.0) * homeSizeMultiplier;
  const energyTotal = electricityBase + heatingBase;

  // 3. Diet
  const dietBase = EMISSION_FACTORS.diet[v.dietType] ?? 2.5;
  const dietWaste = v.foodWaste * EMISSION_FACTORS.foodWaste;
  const dietLocal = v.localFood * EMISSION_FACTORS.localFood;
  const dietTotal = Math.max(0.2, dietBase + dietWaste + dietLocal);

  // 4. Lifestyle
  const lifestyleShopping = (v.shopping * 12 * EMISSION_FACTORS.shopping) / 1000;
  const lifestyleDigital = (v.digital * 365 * EMISSION_FACTORS.digital) / 1000;
  const lifestyleRecycling = v.recycling * EMISSION_FACTORS.recycling;
  const lifestyleTotal = Math.max(0.1, lifestyleShopping + lifestyleDigital + lifestyleRecycling);

  // Mode Multiplier
  let modeMultiplier = 1.0;
  if (v.calcMode === 'node-server') modeMultiplier = 3.5;
  if (v.calcMode === 'office') modeMultiplier = 2.0;

  // Totals
  const baseTotal = transportTotal + energyTotal + dietTotal + lifestyleTotal;
  const total = baseTotal * modeMultiplier;

  // Eco Score Grade Selection
  let letter = 'F';
  let score = 10;
  let description = '';

  if (total < 2.0) {
    letter = 'A+';
    score = 98;
    description = 'Exceptional! Your carbon footprint aligns perfectly with the 2050 net-zero climate goals. You are an inspiration!';
  } else if (total < 3.0) {
    letter = 'A';
    score = 88;
    description = 'Fantastic job! You are well below the world average and leading the way towards low-carbon living.';
  } else if (total < 4.5) {
    letter = 'B';
    score = 72;
    description = 'Good work! You are below the average global carbon intensity. Making minor tweaks can push you to grade A.';
  } else if (total < 7.0) {
    letter = 'C';
    score = 55;
    description = 'Moderate impact. Your lifestyle emissions are typical of average global citizens. See our insights to target reduction.';
  } else if (total < 10.0) {
    letter = 'D';
    score = 38;
    description = 'High emissions. Your carbon footprint is substantial. Consider optimization in transport and home heating.';
  } else {
    letter = 'F';
    score = 15;
    description = 'Very high impact. If everyone lived like this, we would need multiple earths. Start with simple travel & diet habits today.';
  }

  return {
    transport: parseFloat((transportTotal * modeMultiplier).toFixed(2)),
    energy: parseFloat((energyTotal * modeMultiplier).toFixed(2)),
    diet: parseFloat((dietTotal * modeMultiplier).toFixed(2)),
    lifestyle: parseFloat((lifestyleTotal * modeMultiplier).toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    breakdown: [
      { category: 'Transportation', value: transportTotal * modeMultiplier, color: '#3B82F6', icon: 'car' },
      { category: 'Home Energy', value: energyTotal * modeMultiplier, color: '#F59E0B', icon: 'zap' },
      { category: 'Diet & Food', value: dietTotal * modeMultiplier, color: '#22C55E', icon: 'utensils' },
      { category: 'Lifestyle', value: lifestyleTotal * modeMultiplier, color: '#A855F7', icon: 'shopping-bag' }
    ],
    ecoScore: { letter, score, description },
    trees: Math.round(total * 45), // tonnes * 1000 / 22kg (absorbed/tree/yr)
    earthsNeeded: parseFloat(Math.max(0.2, total / WORLD_AVERAGE).toFixed(1)),
    costImpact: Math.round((total * 50) / 12) // Social Cost of Carbon approx $50/tonne, monthly
  };
}
