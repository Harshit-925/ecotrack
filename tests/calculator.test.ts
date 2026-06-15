import test from 'node:test';
import assert from 'node:assert';
import { calculateEmissions, sanitizeStateValues, StateValues } from '../src/calculator.js';

test('EcoTrack Carbon Calculation Suite', async (t) => {
  
  const defaultValues: StateValues = {
    calcMode: 'personal',
    carKm: 30,
    carType: 'gasoline',
    publicTransit: 5,
    flightsShort: 2,
    flightsLong: 1,
    electricity: 300,
    energySource: 'grid',
    heating: 'gas',
    homeSize: 1200,
    dietType: 'average',
    foodWaste: 15,
    localFood: 20,
    shopping: 500,
    recycling: 30,
    digital: 6
  };

  await t.test('Default Input Assessment calculations match expected thresholds', () => {
    const res = calculateEmissions(defaultValues);
    
    // Emissions calculations should resolve to valid numbers
    assert.strictEqual(typeof res.total, 'number');
    assert.ok(res.total > 0);
    assert.strictEqual(res.breakdown.length, 4);

    // Default calculations check
    assert.ok(res.trees > 0);
    assert.ok(res.earthsNeeded > 0);
    assert.ok(res.costImpact > 0);
  });

  await t.test('Car fuel type adjustments correctly adjust transport emissions', () => {
    const gasolineState = { ...defaultValues, carType: 'gasoline' };
    const electricState = { ...defaultValues, carType: 'electric' };

    const resGas = calculateEmissions(gasolineState);
    const resElec = calculateEmissions(electricState);

    // Electric car should have drastically lower transport emissions than gasoline
    assert.ok(resElec.transport < resGas.transport);
  });

  await t.test('Clean energy multipliers (Solar/Wind) yield lower electricity footprint', () => {
    const gridState = { ...defaultValues, energySource: 'grid' };
    const solarState = { ...defaultValues, energySource: 'solar' };

    const resGrid = calculateEmissions(gridState);
    const resSolar = calculateEmissions(solarState);

    assert.ok(resSolar.energy < resGrid.energy);
  });

  await t.test('Diet choices calculate expected offset rankings', () => {
    const meatState = { ...defaultValues, dietType: 'meat-heavy' };
    const veganState = { ...defaultValues, dietType: 'vegan' };

    const resMeat = calculateEmissions(meatState);
    const resVegan = calculateEmissions(veganState);

    assert.ok(resVegan.diet < resMeat.diet);
  });

  await t.test('Strict input bounds checking clamps out-of-bounds parameters safely', () => {
    const maliciousInput = {
      ...defaultValues,
      carKm: 500000, // max is 200
      publicTransit: -100, // min is 0
      foodWaste: 1500, // max is 50
      electricity: 999999 // max is 1000
    };

    const sanitized = sanitizeStateValues(maliciousInput);

    assert.strictEqual(sanitized.carKm, 200);
    assert.strictEqual(sanitized.publicTransit, 0);
    assert.strictEqual(sanitized.foodWaste, 50);
    assert.strictEqual(sanitized.electricity, 1000);
  });

  await t.test('Calculates correct grade scales based on final emissions total', () => {
    // Force extremely low carbon lifestyle
    const lowCarbonState: StateValues = {
      calcMode: 'personal',
      carKm: 0,
      carType: 'electric',
      publicTransit: 0,
      flightsShort: 0,
      flightsLong: 0,
      electricity: 0,
      energySource: 'solar',
      heating: 'heat-pump',
      homeSize: 200,
      dietType: 'vegan',
      foodWaste: 0,
      localFood: 100,
      shopping: 0,
      recycling: 100,
      digital: 0
    };

    const resLow = calculateEmissions(lowCarbonState);
    assert.ok(resLow.total < 2.0);
    assert.strictEqual(resLow.ecoScore.letter, 'A+');

    // Force extremely high carbon lifestyle
    const highCarbonState: StateValues = {
      ...defaultValues,
      calcMode: 'node-server', // Multiplier 3.5x
      carKm: 200,
      electricity: 1000,
      flightsShort: 20,
      flightsLong: 10
    };

    const resHigh = calculateEmissions(highCarbonState);
    assert.ok(resHigh.total >= 10.0);
    assert.strictEqual(resHigh.ecoScore.letter, 'F');
  });

  await t.test('Recycling offset and local food variables calculate correctly', () => {
    const lowRecycle = { ...defaultValues, recycling: 0 };
    const highRecycle = { ...defaultValues, recycling: 100 };

    const resLow = calculateEmissions(lowRecycle);
    const resHigh = calculateEmissions(highRecycle);

    // High recycling reduces emissions, so total should be lower
    assert.ok(resHigh.total < resLow.total);
  });
});
