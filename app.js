/**
 * EcoTrack Application Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ==========================================================================
  // 1. EMISSION FACTORS (Science-backed constants - kg CO2 / unit)
  // ==========================================================================
  const EMISSION_FACTORS = {
    car: { gasoline: 0.21, diesel: 0.27, hybrid: 0.12, electric: 0.05 }, // kg CO2 per km
    publicTransit: 0.089, // kg CO2 per passenger-km (approx. 30km/hr so hours * 30 * 0.089)
    flights: { short: 0.255, long: 0.195 }, // tonnes CO2 per flight (round trip)
    electricity: 0.417, // kg CO2 per kWh (global grid average)
    energySource: { grid: 1.0, solar: 0.05, wind: 0.02, mixed: 0.5 }, // source multipliers
    heating: { gas: 2.0, electric: 1.5, oil: 2.5, 'heat-pump': 0.5 }, // tonnes/year base
    homeSize: 0.0005, // multiplier per sqft
    diet: { 'meat-heavy': 3.3, average: 2.5, pescatarian: 1.7, vegetarian: 1.5, vegan: 1.0 }, // tonnes/year base
    foodWaste: 0.02, // tonnes per % wasted
    localFood: -0.005, // reduction per local food %
    shopping: 0.006, // kg CO2 per dollar
    digital: 0.036, // kg CO2 per daily hour * 365
    recycling: -0.015 // reduction per recycling %
  };

  const WORLD_AVERAGE = 4.5;
  const US_AVERAGE = 14.7;
  const EU_AVERAGE = 6.1;
  const TARGET_2030 = 2.0;

  // ==========================================================================
  // 2. STATE MANAGEMENT
  // ==========================================================================
  const state = {
    currentStep: 1,
    totalSteps: 4,
    values: {
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
    },
    results: null,
    chartsRendered: false
  };

  // ==========================================================================
  // 3. CALCULATION ENGINE
  // ==========================================================================
  function calculateEmissions() {
    const v = state.values;

    // 1. Transportation
    const transportCar = (v.carKm * 365 * EMISSION_FACTORS.car[v.carType]) / 1000;
    const transportTransit = (v.publicTransit * 30 * 52 * EMISSION_FACTORS.publicTransit) / 1000;
    const transportFlights = (v.flightsShort * EMISSION_FACTORS.flights.short) + (v.flightsLong * EMISSION_FACTORS.flights.long);
    const transportTotal = transportCar + transportTransit + transportFlights;

    // 2. Home Energy
    const electricityBase = (v.electricity * 12 * EMISSION_FACTORS.electricity * EMISSION_FACTORS.energySource[v.energySource]) / 1000;
    const homeSizeMultiplier = (v.homeSize * EMISSION_FACTORS.homeSize) + 0.4;
    const heatingBase = EMISSION_FACTORS.heating[v.heating] * homeSizeMultiplier;
    const energyTotal = electricityBase + heatingBase;

    // 3. Diet
    const dietBase = EMISSION_FACTORS.diet[v.dietType];
    const dietWaste = v.foodWaste * EMISSION_FACTORS.foodWaste;
    const dietLocal = v.localFood * EMISSION_FACTORS.localFood;
    const dietTotal = Math.max(0.2, dietBase + dietWaste + dietLocal);

    // 4. Lifestyle
    const lifestyleShopping = (v.shopping * 12 * EMISSION_FACTORS.shopping) / 1000;
    const lifestyleDigital = (v.digital * 365 * EMISSION_FACTORS.digital) / 1000;
    const lifestyleRecycling = v.recycling * EMISSION_FACTORS.recycling;
    const lifestyleTotal = Math.max(0.1, lifestyleShopping + lifestyleDigital + lifestyleRecycling);

    // Totals
    const total = transportTotal + energyTotal + dietTotal + lifestyleTotal;

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
      transport: parseFloat(transportTotal.toFixed(2)),
      energy: parseFloat(energyTotal.toFixed(2)),
      diet: parseFloat(dietTotal.toFixed(2)),
      lifestyle: parseFloat(lifestyleTotal.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      breakdown: [
        { category: 'Transportation', value: transportTotal, color: '#3B82F6', icon: 'car' },
        { category: 'Home Energy', value: energyTotal, color: '#F59E0B', icon: 'zap' },
        { category: 'Diet & Food', value: dietTotal, color: '#22C55E', icon: 'utensils' },
        { category: 'Lifestyle', value: lifestyleTotal, color: '#A855F7', icon: 'shopping-bag' }
      ],
      ecoScore: { letter, score, description },
      trees: Math.round(total * 45), // tonnes * 1000 / 22kg (absorbed/tree/yr)
      earthsNeeded: parseFloat(Math.max(0.2, total / WORLD_AVERAGE).toFixed(1)),
      costImpact: Math.round((total * 50) / 12) // Social Cost of Carbon approx $50/tonne, monthly
    };
  }

  // Calculate & update the running total shown in sticky footer
  function updateRunningTotal() {
    const res = calculateEmissions();
    const valEl = document.getElementById('running-total-value');
    if (valEl) {
      valEl.innerHTML = `${res.total.toFixed(2)} <small>tonnes CO₂/year</small>`;
    }
  }

  // ==========================================================================
  // 4. PARTICLE SYSTEM (Ambient floating eco-particles)
  // ==========================================================================
  let canvas, ctx, particles = [];
  
  function initParticles() {
    canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    // Create initial pool
    const count = window.innerWidth < 768 ? 30 : 70;
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(true));
    }

    window.addEventListener('resize', resizeCanvas);
    requestAnimationFrame(animateParticles);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle(randomY = false) {
    const colors = ['#22C55E', '#10B981', '#3B82F6'];
    return {
      x: Math.random() * canvas.width,
      y: randomY ? Math.random() * canvas.height : canvas.height + 20,
      size: Math.random() * 2 + 1,
      speedX: Math.random() * 0.4 - 0.2,
      speedY: -(Math.random() * 0.5 + 0.2),
      opacity: Math.random() * 0.35 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      swayWidth: Math.random() * 20 + 5,
      swaySpeed: Math.random() * 0.01 + 0.005,
      swayOffset: Math.random() * Math.PI * 2
    };
  }

  function animateParticles(timestamp) {
    if (!canvas || !ctx) return;
    
    // Respect user motion choice
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      // Update
      p.y += p.speedY;
      p.swayOffset += p.swaySpeed;
      p.x += p.speedX + Math.sin(p.swayOffset) * 0.2;

      // Draw
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Recirculate if particle drifts off top or sides
      if (p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
        particles[i] = createParticle(false);
      }
    }

    requestAnimationFrame(animateParticles);
  }

  // ==========================================================================
  // 5. ANIMATED NUMBER COUNTER
  // ==========================================================================
  function animateCounter(element, target, duration = 1500, prefix = '', suffix = '', decimals = 2) {
    if (!element) return;
    const start = parseFloat(element.innerText.replace(/[^0-9.-]/g, '')) || 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: cubic-bezier easeOut
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * ease;
      
      element.innerText = prefix + current.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }) + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.innerText = prefix + target.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }) + suffix;
      }
    }

    requestAnimationFrame(update);
  }

  // ==========================================================================
  // 6. DONUT CHART (Canvas implementation with dynamic segment expand)
  // ==========================================================================
  let activeDonutIndex = -1;
  let donutAnimProgress = 0;
  
  function drawDonutChart(canvas, data, animated = true) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // HDPI setup
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const outerRadius = Math.min(rect.width, rect.height) * 0.42;
    const innerRadius = outerRadius * 0.62;

    const totalVal = data.reduce((acc, d) => acc + d.value, 0);

    function draw(progress) {
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (totalVal === 0) return;

      let startAngle = -Math.PI / 2; // Start at 12 o'clock

      data.forEach((item, index) => {
        const sliceAngle = (item.value / totalVal) * (Math.PI * 2);
        const endAngle = startAngle + sliceAngle * progress;

        // Visual highlight expand on hover index
        let currentOuter = outerRadius;
        let currentInner = innerRadius;
        let shiftX = 0;
        let shiftY = 0;

        if (index === activeDonutIndex) {
          currentOuter += 5;
          currentInner += 2;
          const midAngle = startAngle + (sliceAngle / 2);
          shiftX = Math.cos(midAngle) * 4;
          shiftY = Math.sin(midAngle) * 4;
        }

        ctx.save();
        ctx.translate(shiftX, shiftY);
        ctx.beginPath();
        // Inner and outer rings with spacing gap (1.5 degrees / 0.026 rad)
        const gap = 0.025; 
        ctx.arc(centerX, centerY, currentOuter, startAngle + gap, endAngle - gap);
        ctx.arc(centerX, centerY, currentInner, endAngle - gap, startAngle + gap, true);
        ctx.closePath();
        
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.restore();

        startAngle += sliceAngle;
      });

      // Center text
      ctx.fillStyle = '#F8FAFC';
      ctx.font = `bold 24px 'Space Grotesk'`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(totalVal.toFixed(2), centerX, centerY - 6);

      ctx.fillStyle = '#94A3B8';
      ctx.font = `600 11px 'Inter'`;
      ctx.fillText('TONNES CO₂', centerX, centerY + 16);
    }

    if (animated && donutAnimProgress < 1) {
      let startTime = null;
      function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        donutAnimProgress = Math.min(elapsed / 1200, 1);
        
        // Easing cubicOut
        const ease = 1 - Math.pow(1 - donutAnimProgress, 3);
        draw(ease);

        if (donutAnimProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          setupDonutInteractivity(canvas, data, centerX, centerY, outerRadius, innerRadius, totalVal);
        }
      }
      requestAnimationFrame(animate);
    } else {
      draw(1);
      setupDonutInteractivity(canvas, data, centerX, centerY, outerRadius, innerRadius, totalVal);
    }

    // Legend construction
    const legendEl = document.getElementById('donut-legend');
    if (legendEl) {
      legendEl.innerHTML = '';
      data.forEach((item, index) => {
        const pct = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(0) : '0';
        const div = document.createElement('div');
        div.className = `legend-item ${index === activeDonutIndex ? 'active' : ''}`;
        div.style.cursor = 'pointer';
        div.innerHTML = `
          <div class="legend-info">
            <div class="legend-color" style="background: ${item.color}"></div>
            <span class="legend-label">${item.category}</span>
          </div>
          <div>
            <span class="legend-value">${item.value.toFixed(2)} t</span>
            <span class="legend-percent">(${pct}%)</span>
          </div>
        `;
        
        div.addEventListener('mouseenter', () => {
          activeDonutIndex = index;
          drawDonutChart(canvas, data, false);
        });
        div.addEventListener('mouseleave', () => {
          activeDonutIndex = -1;
          drawDonutChart(canvas, data, false);
        });

        legendEl.appendChild(div);
      });
    }
  }

  function setupDonutInteractivity(canvas, data, centerX, centerY, outerRadius, innerRadius, totalVal) {
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Distance from center
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= innerRadius && dist <= outerRadius + 8) {
        // Calculate angle from 12 o'clock (-Math.PI/2)
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2) {
          angle += Math.PI * 2;
        }
        
        let startAngle = -Math.PI / 2;
        let hoveredIdx = -1;

        for (let i = 0; i < data.length; i++) {
          const sliceAngle = (data[i].value / totalVal) * (Math.PI * 2);
          const endAngle = startAngle + sliceAngle;

          if (angle >= startAngle && angle < endAngle) {
            hoveredIdx = i;
            break;
          }
          startAngle += sliceAngle;
        }

        if (hoveredIdx !== activeDonutIndex) {
          activeDonutIndex = hoveredIdx;
          drawDonutChart(canvas, data, false);
        }
      } else {
        if (activeDonutIndex !== -1) {
          activeDonutIndex = -1;
          drawDonutChart(canvas, data, false);
        }
      }
    };

    canvas.onmouseleave = () => {
      activeDonutIndex = -1;
      drawDonutChart(canvas, data, false);
    };
  }

  // ==========================================================================
  // 7. BAR CHART (Horizontal comparisons)
  // ==========================================================================
  let barAnimProgress = 0;

  function drawBarChart(canvas, userTotal) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const benchmarks = [
      { label: 'You', value: userTotal, isUser: true },
      { label: '2030 Target', value: TARGET_2030 },
      { label: 'World Avg', value: WORLD_AVERAGE },
      { label: 'EU Avg', value: EU_AVERAGE },
      { label: 'US Avg', value: US_AVERAGE }
    ];

    const maxVal = Math.max(...benchmarks.map(b => b.value));
    const paddingLeft = 90;
    const paddingRight = 50;
    const chartWidth = rect.width - paddingLeft - paddingRight;
    const rowHeight = 44;
    const barHeight = 16;
    const startY = 32;

    // Determine user bar color based on footprint size
    let userColor = '#EF4444'; // Red
    if (userTotal < TARGET_2030) userColor = '#22C55E'; // Green
    else if (userTotal < WORLD_AVERAGE) userColor = '#4ADE80'; // Light Green
    else if (userTotal < EU_AVERAGE) userColor = '#F59E0B'; // Amber

    function draw(progress) {
      ctx.clearRect(0, 0, rect.width, rect.height);

      benchmarks.forEach((b, i) => {
        const y = startY + i * rowHeight;
        
        // Draw Label
        ctx.fillStyle = b.isUser ? '#F8FAFC' : '#94A3B8';
        ctx.font = b.isUser ? `bold 13px 'Inter'` : `13px 'Inter'`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, paddingLeft - 12, y + barHeight / 2);

        // Draw background track
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(paddingLeft, y, chartWidth, barHeight, 4);
        ctx.fill();

        // Calculate fill width
        const fillWidth = (b.value / maxVal) * chartWidth * progress;

        // Draw Fill
        ctx.save();
        if (b.isUser) {
          ctx.fillStyle = userColor;
          // Apply drop shadow glow on User bar
          ctx.shadowBlur = 10;
          ctx.shadowColor = userColor;
        } else if (b.label === '2030 Target') {
          ctx.fillStyle = '#3B82F6'; // Blue accent for target
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.4)'; // Muted gray
        }

        ctx.beginPath();
        ctx.roundRect(paddingLeft, y, Math.max(2, fillWidth), barHeight, 4);
        ctx.fill();
        ctx.restore();

        // Draw Value Label on right
        ctx.fillStyle = b.isUser ? userColor : '#CBD5E1';
        ctx.font = `bold 12px 'JetBrains Mono'`;
        ctx.textAlign = 'left';
        ctx.fillText(`${b.value.toFixed(1)}t`, paddingLeft + fillWidth + 8, y + barHeight / 2);
      });
    }

    if (barAnimProgress < 1) {
      let startTime = null;
      function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        barAnimProgress = Math.min(elapsed / 1000, 1);
        
        const ease = 1 - Math.pow(1 - barAnimProgress, 3);
        draw(ease);

        if (barAnimProgress < 1) {
          requestAnimationFrame(animate);
        }
      }
      requestAnimationFrame(animate);
    } else {
      draw(1);
    }
  }

  // ==========================================================================
  // 8. CALCULATOR WIZARD NAVIGATION
  // ==========================================================================
  function goToStep(stepNum) {
    if (stepNum < 1 || stepNum > state.totalSteps) return;

    // Slide/Fade animation out for current step
    const currentStepEl = document.getElementById(`step-${state.currentStep}`);
    const nextStepEl = document.getElementById(`step-${stepNum}`);

    if (currentStepEl && nextStepEl) {
      currentStepEl.classList.remove('active');
      nextStepEl.classList.add('active');
    }

    state.currentStep = stepNum;

    // Update Progress Step Classes
    document.querySelectorAll('.progress-step').forEach((el, index) => {
      const stepIdx = index + 1;
      el.classList.remove('active', 'completed');
      
      if (stepIdx === stepNum) {
        el.classList.add('active');
      } else if (stepIdx < stepNum) {
        el.classList.add('completed');
      }
    });

    // Update wizard progress percentage
    const progressVal = ((stepNum - 1) / (state.totalSteps - 1)) * 100;
    const progressWrapper = document.querySelector('.calc-progress');
    if (progressWrapper) {
      progressWrapper.setAttribute('aria-valuenow', progressVal);
    }

    // Toggle navigation button visibilities
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnCalc = document.getElementById('btn-calculate');

    if (btnPrev && btnNext && btnCalc) {
      // Prev button visibility
      btnPrev.style.visibility = stepNum === 1 ? 'hidden' : 'visible';

      // Next / Calculate toggle
      if (stepNum === state.totalSteps) {
        btnNext.classList.add('hidden');
        btnCalc.classList.remove('hidden');
      } else {
        btnNext.classList.remove('hidden');
        btnCalc.classList.add('hidden');
      }
    }

    // Auto update running total
    updateRunningTotal();
  }

  // Set up button click navigation handlers
  function initNavigation() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnCalc = document.getElementById('btn-calculate');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        goToStep(state.currentStep - 1);
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        goToStep(state.currentStep + 1);
      });
    }

    if (btnCalc) {
      btnCalc.addEventListener('click', () => {
        // Run full calculations and update visual dashboard
        const results = calculateEmissions();
        state.results = results;
        
        // Save current inputs to localStorage
        localStorage.setItem('ecotrack_state', JSON.stringify(state.values));

        showResults(results);
      });
    }

    // Allow progress steps to click jump back
    document.querySelectorAll('.progress-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const stepNum = parseInt(btn.getAttribute('data-step'));
        // Only allow jumping back or to immediate next step
        if (stepNum < state.currentStep || stepNum === state.currentStep + 1) {
          goToStep(stepNum);
        }
      });
    });
  }

  // ==========================================================================
  // 9. INPUT SLIDERS & BUTTON GROUPS HANDLERS
  // ==========================================================================
  function initSliders() {
    // 1. Car commute km
    setupSlider('input-car-km', 'val-car-km', (v) => `${v} km`);
    // 2. Transit hours
    setupSlider('input-public-transit', 'val-public-transit', (v) => `${v} hours`);
    // 3. Short flights
    setupSlider('input-flights-short', 'val-flights-short', (v) => `${v} flight${v != 1 ? 's' : ''}`);
    // 4. Long flights
    setupSlider('input-flights-long', 'val-flights-long', (v) => `${v} flight${v != 1 ? 's' : ''}`);
    // 5. Electricity kWh
    setupSlider('input-electricity', 'val-electricity', (v) => `${v} kWh`);
    // 6. Home Size
    setupSlider('input-home-size', 'val-home-size', (v) => `${v} sq ft`);
    // 7. Food waste
    setupSlider('input-food-waste', 'val-food-waste', (v) => `${v}%`);
    // 8. Local Food
    setupSlider('input-local-food', 'val-local-food', (v) => `${v}%`);
    // 9. Shopping spend
    setupSlider('input-shopping', 'val-shopping', (v) => `$${v}`);
    // 10. Recycling rate
    setupSlider('input-recycling', 'val-recycling', (v) => `${v}%`);
    // 11. Digital hours
    setupSlider('input-digital', 'val-digital', (v) => `${v} hours`);
  }

  function setupSlider(sliderId, displayId, formatter) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    if (!slider || !display) return;

    // Map input to state key
    const stateKey = sliderId.replace('input-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());

    // Update handler
    const update = () => {
      const val = parseInt(slider.value);
      display.innerText = formatter(val);
      state.values[stateKey] = val;
      updateRunningTotal();
    };

    slider.addEventListener('input', update);
    
    // Sync initial state values to slider inputs
    if (state.values[stateKey] !== undefined) {
      slider.value = state.values[stateKey];
      display.innerText = formatter(state.values[stateKey]);
    }
  }

  function initSelectOptions() {
    // 1. Car type
    setupButtonSelector('group-car-type', 'carType');
    // 2. Electricity source
    setupButtonSelector('group-energy-source', 'energySource');
    // 3. Heating source
    setupButtonSelector('group-heating', 'heating');
  }

  function setupButtonSelector(groupId, stateKey) {
    const group = document.getElementById(groupId);
    if (!group) return;

    const options = group.querySelectorAll('.select-option');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => {
          o.classList.remove('selected');
          o.setAttribute('aria-checked', 'false');
        });
        opt.classList.add('selected');
        opt.setAttribute('aria-checked', 'true');
        
        const val = opt.getAttribute('data-value');
        state.values[stateKey] = val;
        updateRunningTotal();
      });

      // Select initial
      if (opt.getAttribute('data-value') === state.values[stateKey]) {
        options.forEach(o => {
          o.classList.remove('selected');
          o.setAttribute('aria-checked', 'false');
        });
        opt.classList.add('selected');
        opt.setAttribute('aria-checked', 'true');
      }
    });
  }

  function initDietOptions() {
    const group = document.getElementById('group-diet-type');
    if (!group) return;

    const cards = group.querySelectorAll('.diet-option');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');

        const val = card.getAttribute('data-value');
        state.values.dietType = val;
        updateRunningTotal();
      });

      // Select initial
      if (card.getAttribute('data-value') === state.values.dietType) {
        cards.forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
      }
    });
  }

  // ==========================================================================
  // 10. RESULTS DISPLAY & INSIGHTS GENERATOR
  // ==========================================================================
  function showResults(results) {
    // Hide running total stick footer to clean up space
    const runTotalEl = document.getElementById('running-total');
    if (runTotalEl) runTotalEl.classList.add('hidden');

    // Make sections visible
    const sections = ['results', 'insights', 'eco-score'];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('visible');
        el.classList.add('fade-in-up');
        el.classList.add('is-visible');
      }
    });

    // Scroll to results section smoothly
    const resultsSec = document.getElementById('results');
    if (resultsSec) {
      resultsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Trigger animated numbers
    const totalValEl = document.getElementById('total-emissions-value');
    animateCounter(totalValEl, results.total, 1500, '', '', 2);

    animateCounter(document.getElementById('stat-trees'), results.trees, 1500, '', '', 0);
    
    // Percentage comparison with world
    const worldDiff = ((results.total - WORLD_AVERAGE) / WORLD_AVERAGE) * 100;
    const worldPrefix = worldDiff > 0 ? '+' : '';
    animateCounter(document.getElementById('stat-vs-world'), worldDiff, 1500, worldPrefix, '%', 0);

    animateCounter(document.getElementById('stat-cost'), results.costImpact, 1500, '$', '/mo', 0);
    animateCounter(document.getElementById('stat-earth-days'), results.earthsNeeded, 1500, '', ' Earths', 1);

    // Draw charts
    donutAnimProgress = 0;
    barAnimProgress = 0;
    
    const donutCanvas = document.getElementById('donut-chart');
    drawDonutChart(donutCanvas, results.breakdown, true);

    const barCanvas = document.getElementById('bar-chart');
    drawBarChart(barCanvas, results.total);

    // Generate Insights
    generateAndPopulateInsights(results);

    // Populate Eco Score Grade Card
    populateEcoScore(results);

    // Populate Achievements
    checkAchievements(results);
  }

  function generateAndPopulateInsights(results) {
    const v = state.values;
    const insights = [];

    // Transport insights
    if (v.carKm > 40 && v.carType !== 'electric') {
      const possibleSaving = (v.carKm * 365 * (EMISSION_FACTORS.car[v.carType] - EMISSION_FACTORS.car.electric)) / 1000;
      insights.push({
        category: 'transport',
        title: 'Switch to Electric Commuting',
        text: `Commuting ${v.carKm} km daily in a ${v.carType} car produces massive emissions. Upgrading to an EV would reduce travel emissions by ~75% instantly.`,
        saving: `Save ${possibleSaving.toFixed(1)}t CO₂/yr`
      });
    } else if (v.carKm > 20) {
      const transitSaving = (v.carKm * 180 * EMISSION_FACTORS.car[v.carType]) / 1000; // assumes commuting 180 workdays
      insights.push({
        category: 'transport',
        title: 'Adopt Hybrid Public Transit',
        text: `Swapping 2-3 driving days weekly for train or bus commutes trims fuel budgets and directly lowers daily tailpipe emissions.`,
        saving: `Save ${transitSaving.toFixed(1)}t CO₂/yr`
      });
    }

    if (v.flightsShort > 3 || v.flightsLong > 1) {
      const flightSave = (v.flightsShort * 0.5 * EMISSION_FACTORS.flights.short) + (v.flightsLong * 0.5 * EMISSION_FACTORS.flights.long);
      insights.push({
        category: 'transport',
        title: 'Consolidate Flight Travel',
        text: 'Aviation holds high greenhouse impact. Consolidating annual airline trips or opting for high-speed rail lines cuts emissions tremendously.',
        saving: `Save ${flightSave.toFixed(1)}t CO₂/yr`
      });
    }

    // Energy Insights
    if (v.energySource === 'grid') {
      const solarSaving = (v.electricity * 12 * EMISSION_FACTORS.electricity * 0.95) / 1000;
      insights.push({
        category: 'energy',
        title: 'Solarize Home Electricity',
        text: 'Switching home power to solar panels or subscribing to community green energy mix cancels grid coal dependencies.',
        saving: `Save ${solarSaving.toFixed(1)}t CO₂/yr`
      });
    }

    if (v.heating === 'gas' || v.heating === 'oil') {
      const heatPumpSaving = EMISSION_FACTORS.heating[v.heating] * 0.6;
      insights.push({
        category: 'energy',
        title: 'Install Heat Pump System',
        text: `Your current heating setup utilizes carbon-heavy fossil fuels. Heat pumps run 3-4x more efficiently than boiler counterparts.`,
        saving: `Save ${heatPumpSaving.toFixed(1)}t CO₂/yr`
      });
    }

    // Diet Insights
    if (v.dietType === 'meat-heavy' || v.dietType === 'average') {
      const currentDietT = EMISSION_FACTORS.diet[v.dietType];
      const veggieSaving = currentDietT - EMISSION_FACTORS.diet.vegetarian;
      insights.push({
        category: 'diet',
        title: 'Shift Toward Vegetarian Diet',
        text: 'Red meats require heavy water and pasture land, releasing high methane amounts. Plant protein sources have 10x lower footprint.',
        saving: `Save ${veggieSaving.toFixed(1)}t CO₂/yr`
      });
    }

    if (v.foodWaste > 10) {
      const wasteSaving = (v.foodWaste - 5) * EMISSION_FACTORS.foodWaste;
      insights.push({
        category: 'diet',
        title: 'Combat Household Food Waste',
        text: 'A third of all food produced goes waste. Smart planning, composting, and using leftovers saves groceries and methane emissions.',
        saving: `Save ${wasteSaving.toFixed(2)}t CO₂/yr`
      });
    }

    // Lifestyle insights
    if (v.shopping > 400) {
      const shopSaving = (v.shopping - 200) * 12 * EMISSION_FACTORS.shopping / 1000;
      insights.push({
        category: 'lifestyle',
        title: 'Embrace Circular Consumption',
        text: 'Manufacturing new consumer items generates intense emissions. Buying secondhand items or repairing current electronics decreases raw resource footprint.',
        saving: `Save ${shopSaving.toFixed(2)}t CO₂/yr`
      });
    }

    if (v.recycling < 60) {
      const recSaving = (70 - v.recycling) * 0.015;
      insights.push({
        category: 'lifestyle',
        title: 'Optimize Household Recycling',
        text: 'Diverting organic and plastic packaging waste from municipal landfill piles directly cuts greenhouse emissions.',
        saving: `Save ${recSaving.toFixed(2)}t CO₂/yr`
      });
    }

    // Inject to insights grid
    const container = document.getElementById('insights-container');
    if (container) {
      container.innerHTML = '';
      
      // Limit to max 4 highly relevant insights
      insights.slice(0, 4).forEach((ins, idx) => {
        const card = document.createElement('div');
        card.className = `glass-card insight-card insight-card--${ins.category} fade-in-up stagger-${idx + 1} is-visible`;
        card.innerHTML = `
          <div class="insight-category cat-${ins.category}">
            <!-- Small dynamic label dot -->
            <span>●</span> ${ins.category}
          </div>
          <h4 class="insight-title">${ins.title}</h4>
          <p class="insight-text">${ins.text}</p>
          <div class="insight-impact">
            <!-- Trending Down Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trending-down"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            ${ins.saving}
          </div>
        `;
        container.appendChild(card);
      });
    }
  }

  function populateEcoScore(results) {
    const letterEl = document.getElementById('eco-score-letter');
    const descEl = document.getElementById('eco-score-description');

    if (letterEl && descEl) {
      // Set letter and apply class color coding
      letterEl.className = 'score-letter';
      const gradeClass = results.ecoScore.letter.toLowerCase().replace('+', '');
      letterEl.classList.add(`grade-${gradeClass}`);
      letterEl.innerText = results.ecoScore.letter;

      // Set description
      descEl.innerText = results.ecoScore.description;
    }

    // Animate Comparison you bar width
    const youBar = document.getElementById('comparison-you');
    const youValEl = document.getElementById('val-comp-you');
    if (youBar && youValEl) {
      // Proportional calculation (US average of 14.7t is our 100% baseline)
      const pct = Math.min(100, (results.total / US_AVERAGE) * 100);
      setTimeout(() => {
        youBar.style.width = `${pct}%`;
      }, 300);
      youValEl.innerText = `${results.total.toFixed(1)}t`;
    }
  }

  function checkAchievements(results) {
    const v = state.values;
    const achievements = [
      { id: 'ach-first-step', unlock: true }, // always unlocked after calculation
      { id: 'ach-eco-warrior', unlock: results.total < WORLD_AVERAGE },
      { id: 'ach-green-hero', unlock: results.total < TARGET_2030 },
      { id: 'ach-diet-champion', unlock: v.dietType === 'vegetarian' || v.dietType === 'vegan' },
      { id: 'ach-clean-energy', unlock: v.energySource === 'solar' || v.energySource === 'wind' },
      { id: 'ach-zero-waste', unlock: v.recycling >= 80 }
    ];

    achievements.forEach(ach => {
      const el = document.getElementById(ach.id);
      if (el) {
        if (ach.unlock) {
          el.classList.remove('locked');
          el.classList.add('unlocked');
        } else {
          el.classList.add('locked');
          el.classList.remove('unlocked');
        }
      }
    });
  }

  // ==========================================================================
  // 11. EXTRA FUNCTIONALITIES (Recalculate, Share, Download, LocalStorage)
  // ==========================================================================
  function initActions() {
    // 1. Recalculate Click
    const btnRecalc = document.getElementById('btn-recalculate');
    if (btnRecalc) {
      btnRecalc.addEventListener('click', () => {
        // Reset steps & navigation
        goToStep(1);

        // Hide results sections
        const sections = ['results', 'insights', 'eco-score'];
        sections.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.remove('visible');
        });

        // Show running total bar again
        const runTotalEl = document.getElementById('running-total');
        if (runTotalEl) runTotalEl.classList.remove('hidden');

        // Scroll back up to calculator
        const calcSec = document.getElementById('calculator');
        if (calcSec) {
          calcSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // 2. Share Click
    const btnShare = document.getElementById('btn-share');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        if (!state.results) return;
        const text = `🌱 EcoTrack Carbon Footprint Assessment:\n` +
                     `My personal emissions: ${state.results.total} tonnes CO₂/year\n` +
                     `Eco Score Grade: ${state.results.ecoScore.letter}\n` +
                     `Trees needed to offset: ${state.results.trees} trees\n` +
                     `Find out your footprint & help heal the climate at EcoTrack!`;

        navigator.clipboard.writeText(text).then(() => {
          showToast('Assessment results copied to clipboard!');
        }).catch(() => {
          showToast('Failed to copy. Share manually.', 'error');
        });
      });
    }

    // 3. Download Report Click
    const btnDownload = document.getElementById('btn-download');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        if (!state.results) return;
        const r = state.results;
        const v = state.values;
        const text = `=========================================\n` +
                     `🌱 ECOTRACK CARBON FOOTPRINT REPORT\n` +
                     `=========================================\n` +
                     `Date: ${new Date().toLocaleDateString()}\n` +
                     `Annual Emissions: ${r.total} tonnes CO2\n` +
                     `Sustainability Grade: ${r.ecoScore.letter}\n\n` +
                     `EMISSION CATEGORIES:\n` +
                     `- Transportation: ${r.transport} t CO2\n` +
                     `- Home Energy: ${r.energy} t CO2\n` +
                     `- Diet & Food: ${r.diet} t CO2\n` +
                     `- Lifestyle & Shopping: ${r.lifestyle} t CO2\n\n` +
                     `CLIMATE METRICS:\n` +
                     `- Tree Offset Equivalent: ${r.trees} trees required/year\n` +
                     `- Ecological Carrying Capacity: ${r.earthsNeeded} Earths required\n` +
                     `- Social Cost of Carbon Equivalent: $${r.costImpact}/month\n\n` +
                     `LIFESTYLE INPUT PARAMETERS:\n` +
                     `- Daily Car Commute: ${v.carKm} km (${v.carType})\n` +
                     `- Public Transit Weekly Hours: ${v.publicTransit} hrs\n` +
                     `- Annual Flight counts: Short: ${v.flightsShort}, Long: ${v.flightsLong}\n` +
                     `- Monthly electricity usage: ${v.electricity} kWh (${v.energySource})\n` +
                     `- Heating source: ${v.heating}\n` +
                     `- Eating pattern: ${v.dietType}\n` +
                     `- Local foods percentage: ${v.localFood}%\n` +
                     `- Household Recycling Rate: ${v.recycling}%\n` +
                     `- Daily Screen time: ${v.digital} hrs\n` +
                     `=========================================\n`;

        const blob = new Blob([text], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'EcoTrack_Carbon_Report.txt';
        link.click();
        URL.revokeObjectURL(link.href);
      });
    }
  }

  // ==========================================================================
  // 12. SCROLL & INTERSECTION OBSERVER ANIMATIONS
  // ==========================================================================
  function initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    // Observe all scrolling elements
    document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right, .scale-in').forEach(el => {
      observer.observe(el);
    });
  }

  // ==========================================================================
  // 13. NAVBAR SCROLL & ACTIVE TRACKING
  // ==========================================================================
  function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
      // Toggle class scrolled on navbar
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }

      // Track active section and style corresponding nav link
      let currentSectionId = '';
      sections.forEach(sec => {
        const top = sec.offsetTop - 120;
        const height = sec.offsetHeight;
        if (window.scrollY >= top && window.scrollY < top + height) {
          currentSectionId = sec.getAttribute('id');
        }
      });

      if (currentSectionId) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${currentSectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });

    // Close mobile menu on clicking any navigation anchor
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const navLinksContainer = document.getElementById('nav-links');
        const menuBtn = document.getElementById('mobile-menu-btn');
        if (navLinksContainer && navLinksContainer.classList.contains('open')) {
          navLinksContainer.classList.remove('open');
          menuBtn.classList.remove('open');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  // ==========================================================================
  // 14. MOBILE HAMBURGER MENU
  // ==========================================================================
  function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');

    if (menuBtn && navLinks) {
      menuBtn.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        menuBtn.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }
  }

  // ==========================================================================
  // 15. HERO WORLD EMISSIONS LIVE COUNTER
  // ==========================================================================
  function initHeroCounter() {
    const liveCounterEl = document.getElementById('live-counter');
    if (!liveCounterEl) return;

    // Daily global emission rate: approx. 100,000,000 tonnes (100 million tonnes)
    // = approx. 1157.4 tonnes per second
    const emissionsPerSecond = 1157.4;
    
    // Estimate baseline starting today at 12:00 AM local time
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const secondsElapsed = (now.getTime() - startOfDay.getTime()) / 1000;
    
    let baseCount = secondsElapsed * emissionsPerSecond;

    // Fast animation refresh
    setInterval(() => {
      baseCount += (emissionsPerSecond * 0.1);
      liveCounterEl.innerText = Math.round(baseCount).toLocaleString();
    }, 100);
  }

  // ==========================================================================
  // 16. TOAST NOTIFICATION SYSTEM
  // ==========================================================================
  function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'glass-card';
    
    // Inline styling for toast container overrides
    toast.style.position = 'fixed';
    toast.style.top = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '9999';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '30px';
    toast.style.border = '1px solid var(--border-glow)';
    toast.style.background = 'rgba(10, 15, 30, 0.95)';
    toast.style.color = '#F8FAFC';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.9rem';
    toast.style.boxShadow = 'var(--shadow-glow)';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    
    // Icon badge prefix
    const icon = type === 'success' ? '🌱' : '⚠️';
    toast.innerHTML = `<span style="margin-right: 8px;">${icon}</span> ${message}`;

    document.body.appendChild(toast);

    // Slide in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 50);

    // Dismiss
    setTimeout(() => {
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, duration);
  }

  // ==========================================================================
  // 17. CHECK & RESTORE SAVE STATE
  // ==========================================================================
  function checkSavedState() {
    const saved = localStorage.getItem('ecotrack_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Overwrite defaults in state values
        Object.assign(state.values, parsed);
        
        // Notify user they can restore
        setTimeout(() => {
          showToast('Restored your previously saved input state!', 'success', 4000);
        }, 1000);
      } catch (err) {
        console.error('Failed restoring state:', err);
      }
    }
  }

  // ==========================================================================
  // 18. APPLICATION INITIALIZATION
  // ==========================================================================
  function init() {
    initParticles();
    initSliders();
    initSelectOptions();
    initDietOptions();
    initNavigation();
    initScrollAnimations();
    initNavbarScroll();
    initMobileMenu();
    initHeroCounter();
    checkSavedState();
    
    // Initial sync calculation
    updateRunningTotal();
    initActions();
  }

  init();
});
