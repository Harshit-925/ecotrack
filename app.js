import { calculateEmissions } from './calculator.js';
document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    const state = {
        currentStep: 1,
        totalSteps: 4,
        values: {
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
        },
        results: null,
        chartsRendered: false
    };
    /**
     * Calculates emissions based on current state values and updates the running total label in the sticky footer.
     */
    function updateRunningTotal() {
        const res = calculateEmissions(state.values);
        const valEl = document.getElementById('running-total-value');
        if (valEl) {
            valEl.textContent = '';
            valEl.appendChild(document.createTextNode(res.total.toFixed(2) + ' '));
            const small = document.createElement('small');
            small.textContent = 'tonnes CO₂/year';
            valEl.appendChild(small);
        }
    }
    let canvas = null;
    let ctx = null;
    let particles = [];
    /**
     * Initializes the particle background canvas, binds size listeners, and starts the render loop.
     */
    function initParticles() {
        canvas = document.getElementById('particles-canvas');
        if (!canvas)
            return;
        ctx = canvas.getContext('2d');
        resizeCanvas();
        const count = window.innerWidth < 768 ? 30 : 70;
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push(createParticle(true));
        }
        window.addEventListener('resize', resizeCanvas);
        requestAnimationFrame(animateParticles);
    }
    /**
     * Synchronizes the particle canvas buffer width and height with browser dimensions.
     */
    function resizeCanvas() {
        if (!canvas)
            return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    /**
     * Generates a new randomized particle object.
     *
     * @param randomY - If true, randomizes height. If false, initializes below canvas bounds.
     */
    function createParticle(randomY = false) {
        const colors = ['#22C55E', '#10B981', '#3B82F6'];
        const w = canvas ? canvas.width : window.innerWidth;
        const h = canvas ? canvas.height : window.innerHeight;
        return {
            x: Math.random() * w,
            y: randomY ? Math.random() * h : h + 20,
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
    /**
     * Redraws particles on every frame, applying sine-wave sway and recycling particles.
     */
    function animateParticles(timestamp) {
        if (!canvas || !ctx)
            return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.y += p.speedY;
            p.swayOffset += p.swaySpeed;
            p.x += p.speedX + Math.sin(p.swayOffset) * 0.2;
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            if (p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
                particles[i] = createParticle(false);
            }
        }
        requestAnimationFrame(animateParticles);
    }
    // ==========================================================================
    // 3. ANIMATED NUMBER COUNTER
    // ==========================================================================
    /**
     * animates counting values upwards using smooth ease-out curves.
     *
     * @param element - The HTML element target.
     * @param target - Target final value.
     * @param duration - Transition speed duration in ms.
     * @param prefix - Character prefix (e.g. '$').
     * @param suffix - Character suffix (e.g. '%').
     * @param decimals - Decimal resolution.
     */
    function animateCounter(element, target, duration = 1500, prefix = '', suffix = '', decimals = 2) {
        if (!element)
            return;
        const el = element;
        const start = parseFloat(el.innerText.replace(/[^0-9.-]/g, '')) || 0;
        const startTime = performance.now();
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * ease;
            el.innerText = prefix + current.toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }) + suffix;
            if (progress < 1) {
                requestAnimationFrame(update);
            }
            else {
                el.innerText = prefix + target.toLocaleString(undefined, {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                }) + suffix;
            }
        }
        requestAnimationFrame(update);
    }
    // ==========================================================================
    // 4. DONUT CHART (Canvas implementation with dynamic segment expand)
    // ==========================================================================
    let activeDonutIndex = -1;
    let donutAnimProgress = 0;
    /**
     * Draws a custom styled donut breakdown chart using low-level 2D canvas context.
     *
     * @param canvasEl - Target canvas element.
     * @param data - Category breakdown items array.
     * @param animated - Whether to animate.
     */
    function drawDonutChart(canvasEl, data, animated = true) {
        if (!canvasEl)
            return;
        const chartCtx = canvasEl.getContext('2d');
        if (!chartCtx)
            return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvasEl.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        canvasEl.width = width * dpr;
        canvasEl.height = height * dpr;
        chartCtx.scale(dpr, dpr);
        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.min(width, height) * 0.42;
        const innerRadius = outerRadius * 0.62;
        const totalVal = data.reduce((acc, d) => acc + d.value, 0);
        function draw(progress) {
            if (!chartCtx)
                return;
            chartCtx.clearRect(0, 0, width, height);
            if (totalVal === 0)
                return;
            let startAngle = -Math.PI / 2;
            data.forEach((item, index) => {
                const sliceAngle = (item.value / totalVal) * (Math.PI * 2);
                const endAngle = startAngle + sliceAngle * progress;
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
                chartCtx.save();
                chartCtx.translate(shiftX, shiftY);
                chartCtx.beginPath();
                const gap = 0.025;
                chartCtx.arc(centerX, centerY, currentOuter, startAngle + gap, endAngle - gap);
                chartCtx.arc(centerX, centerY, currentInner, endAngle - gap, startAngle + gap, true);
                chartCtx.closePath();
                chartCtx.fillStyle = item.color;
                chartCtx.fill();
                chartCtx.restore();
                startAngle += sliceAngle;
            });
            chartCtx.fillStyle = '#F8FAFC';
            chartCtx.font = `bold 24px 'Space Grotesk'`;
            chartCtx.textAlign = 'center';
            chartCtx.textBaseline = 'middle';
            chartCtx.fillText(totalVal.toFixed(2), centerX, centerY - 6);
            chartCtx.fillStyle = '#94A3B8';
            chartCtx.font = `600 11px 'Inter'`;
            chartCtx.fillText('TONNES CO₂', centerX, centerY + 16);
        }
        if (animated && donutAnimProgress < 1) {
            let startTime = null;
            function animate(timestamp) {
                if (!startTime)
                    startTime = timestamp;
                const elapsed = timestamp - startTime;
                donutAnimProgress = Math.min(elapsed / 1200, 1);
                const ease = 1 - Math.pow(1 - donutAnimProgress, 3);
                draw(ease);
                if (donutAnimProgress < 1) {
                    requestAnimationFrame(animate);
                }
                else {
                    setupDonutInteractivity(canvasEl, data, centerX, centerY, outerRadius, innerRadius, totalVal);
                }
            }
            requestAnimationFrame(animate);
        }
        else {
            draw(1);
            setupDonutInteractivity(canvasEl, data, centerX, centerY, outerRadius, innerRadius, totalVal);
        }
        const legendEl = document.getElementById('donut-legend');
        if (legendEl) {
            legendEl.textContent = '';
            data.forEach((item, index) => {
                const pct = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(0) : '0';
                const div = document.createElement('div');
                div.className = `legend-item ${index === activeDonutIndex ? 'active' : ''}`;
                const info = document.createElement('div');
                info.className = 'legend-info';
                const color = document.createElement('div');
                color.className = 'legend-color';
                color.style.background = item.color;
                const label = document.createElement('span');
                label.className = 'legend-label';
                label.textContent = item.category;
                info.appendChild(color);
                info.appendChild(label);
                const values = document.createElement('div');
                const valSpan = document.createElement('span');
                valSpan.className = 'legend-value';
                valSpan.textContent = `${item.value.toFixed(2)} t `;
                const pctSpan = document.createElement('span');
                pctSpan.className = 'legend-percent';
                pctSpan.textContent = `(${pct}%)`;
                values.appendChild(valSpan);
                values.appendChild(pctSpan);
                div.appendChild(info);
                div.appendChild(values);
                legendEl.appendChild(div);
            });
        }
    }
    /**
     * Sets up hover triggers on the donut canvas, resolving active slice segments.
     */
    function setupDonutInteractivity(canvasEl, data, centerX, centerY, outerRadius, innerRadius, totalVal) {
        canvasEl.onmousemove = (e) => {
            const rect = canvasEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= innerRadius && dist <= outerRadius + 8) {
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
                    drawDonutChart(canvasEl, data, false);
                }
            }
            else {
                if (activeDonutIndex !== -1) {
                    activeDonutIndex = -1;
                    drawDonutChart(canvasEl, data, false);
                }
            }
        };
        canvasEl.onmouseleave = () => {
            activeDonutIndex = -1;
            drawDonutChart(canvasEl, data, false);
        };
    }
    // ==========================================================================
    // 5. BAR CHART (Horizontal comparisons)
    // ==========================================================================
    let barAnimProgress = 0;
    /**
     * Draws comparative horizontal bar charts showing benchmarks against EU/US/World averages.
     *
     * @param canvasEl - Target canvas element.
     * @param userTotal - User footprint emissions value.
     */
    function drawBarChart(canvasEl, userTotal) {
        if (!canvasEl)
            return;
        const chartCtx = canvasEl.getContext('2d');
        if (!chartCtx)
            return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvasEl.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        canvasEl.width = width * dpr;
        canvasEl.height = height * dpr;
        chartCtx.scale(dpr, dpr);
        const TARGET_2030 = 2.0;
        const WORLD_AVERAGE = 4.5;
        const EU_AVERAGE = 6.1;
        const US_AVERAGE = 14.7;
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
        const chartWidth = width - paddingLeft - paddingRight;
        const rowHeight = 44;
        const barHeight = 16;
        const startY = 32;
        let userColor = '#EF4444';
        if (userTotal < TARGET_2030)
            userColor = '#22C55E';
        else if (userTotal < WORLD_AVERAGE)
            userColor = '#4ADE80';
        else if (userTotal < EU_AVERAGE)
            userColor = '#F59E0B';
        function draw(progress) {
            if (!chartCtx)
                return;
            chartCtx.clearRect(0, 0, width, height);
            benchmarks.forEach((b, i) => {
                const y = startY + i * rowHeight;
                chartCtx.fillStyle = b.isUser ? '#F8FAFC' : '#94A3B8';
                chartCtx.font = b.isUser ? `bold 13px 'Inter'` : `13px 'Inter'`;
                chartCtx.textAlign = 'right';
                chartCtx.textBaseline = 'middle';
                chartCtx.fillText(b.label, paddingLeft - 12, y + barHeight / 2);
                chartCtx.fillStyle = '#0f172a';
                chartCtx.beginPath();
                if (typeof chartCtx.roundRect === 'function') {
                    chartCtx.roundRect(paddingLeft, y, chartWidth, barHeight, 4);
                }
                else {
                    chartCtx.rect(paddingLeft, y, chartWidth, barHeight);
                }
                chartCtx.fill();
                const fillWidth = (b.value / maxVal) * chartWidth * progress;
                chartCtx.save();
                if (b.isUser) {
                    chartCtx.fillStyle = userColor;
                    chartCtx.shadowBlur = 10;
                    chartCtx.shadowColor = userColor;
                }
                else if (b.label === '2030 Target') {
                    chartCtx.fillStyle = '#3B82F6';
                }
                else {
                    chartCtx.fillStyle = 'rgba(148, 163, 184, 0.4)';
                }
                chartCtx.beginPath();
                if (typeof chartCtx.roundRect === 'function') {
                    chartCtx.roundRect(paddingLeft, y, Math.max(2, fillWidth), barHeight, 4);
                }
                else {
                    chartCtx.rect(paddingLeft, y, Math.max(2, fillWidth), barHeight);
                }
                chartCtx.fill();
                chartCtx.restore();
                chartCtx.fillStyle = b.isUser ? userColor : '#CBD5E1';
                chartCtx.font = `bold 12px 'JetBrains Mono'`;
                chartCtx.textAlign = 'left';
                chartCtx.fillText(`${b.value.toFixed(1)}t`, paddingLeft + fillWidth + 8, y + barHeight / 2);
            });
        }
        if (barAnimProgress < 1) {
            let startTime = null;
            function animate(timestamp) {
                if (!startTime)
                    startTime = timestamp;
                const elapsed = timestamp - startTime;
                barAnimProgress = Math.min(elapsed / 1000, 1);
                const ease = 1 - Math.pow(1 - barAnimProgress, 3);
                draw(ease);
                if (barAnimProgress < 1) {
                    requestAnimationFrame(animate);
                }
            }
            requestAnimationFrame(animate);
        }
        else {
            draw(1);
        }
    }
    // ==========================================================================
    // 6. CALCULATOR WIZARD NAVIGATION
    // ==========================================================================
    /**
     * Activates a specific step in the 4-step wizard card and toggles button states.
     *
     * @param stepNum - The target step index (1-4).
     */
    function goToStep(stepNum) {
        if (stepNum < 1 || stepNum > state.totalSteps)
            return;
        const currentStepEl = document.getElementById(`step-${state.currentStep}`);
        const nextStepEl = document.getElementById(`step-${stepNum}`);
        if (currentStepEl && nextStepEl) {
            currentStepEl.classList.remove('active');
            nextStepEl.classList.add('active');
        }
        state.currentStep = stepNum;
        document.querySelectorAll('.progress-step').forEach((el, index) => {
            const stepIdx = index + 1;
            el.classList.remove('active', 'completed');
            if (stepIdx === stepNum) {
                el.classList.add('active');
            }
            else if (stepIdx < stepNum) {
                el.classList.add('completed');
            }
        });
        const progressVal = ((stepNum - 1) / (state.totalSteps - 1)) * 100;
        const progressWrapper = document.querySelector('.calc-progress');
        if (progressWrapper) {
            progressWrapper.setAttribute('aria-valuenow', progressVal.toString());
        }
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        const btnCalc = document.getElementById('btn-calculate');
        if (btnPrev && btnNext && btnCalc) {
            btnPrev.style.visibility = stepNum === 1 ? 'hidden' : 'visible';
            if (stepNum === state.totalSteps) {
                btnNext.classList.add('hidden');
                btnCalc.classList.remove('hidden');
            }
            else {
                btnNext.classList.remove('hidden');
                btnCalc.classList.add('hidden');
            }
        }
        updateRunningTotal();
    }
    /**
     * Binds mouse click events to prev/next navigation controls and step progress buttons.
     */
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
                const results = calculateEmissions(state.values);
                state.results = results;
                localStorage.setItem('ecotrack_state', JSON.stringify(state.values));
                showResults(results);
            });
        }
        document.querySelectorAll('.progress-step').forEach(btn => {
            btn.addEventListener('click', () => {
                const stepNum = parseInt(btn.getAttribute('data-step') || '1');
                if (stepNum < state.currentStep || stepNum === state.currentStep + 1) {
                    goToStep(stepNum);
                }
            });
        });
    }
    // ==========================================================================
    // 7. INPUT SLIDERS & BUTTON GROUPS HANDLERS
    // ==========================================================================
    /**
     * Hooks up input ranges and value feedback nodes for sliders.
     */
    function initSliders() {
        setupSlider('input-car-km', 'val-car-km');
        setupSlider('input-public-transit', 'val-public-transit');
        setupSlider('input-flights-short', 'val-flights-short');
        setupSlider('input-flights-long', 'val-flights-long');
        setupSlider('input-electricity', 'val-electricity');
        setupSlider('input-home-size', 'val-home-size');
        setupSlider('input-food-waste', 'val-food-waste');
        setupSlider('input-local-food', 'val-local-food');
        setupSlider('input-shopping', 'val-shopping');
        setupSlider('input-recycling', 'val-recycling');
        setupSlider('input-digital', 'val-digital');
    }
    setupButtonSelector('group-calc-mode', 'calcMode');
    /**
     * Configures bidirectional synchronization between slider and manual text input.
     *
     * @param sliderId - Input element ID.
     * @param displayId - Label display element ID.
     */
    function setupSlider(sliderId, displayId) {
        const slider = document.getElementById(sliderId);
        const manualInput = document.getElementById(sliderId + '-manual');
        const stateKey = sliderId.replace('input-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const syncValues = (val) => {
            let min = 0;
            let max = 100;
            if (stateKey === 'carKm') {
                min = 0;
                max = 200;
            }
            else if (stateKey === 'publicTransit') {
                min = 0;
                max = 40;
            }
            else if (stateKey === 'flightsShort') {
                min = 0;
                max = 20;
            }
            else if (stateKey === 'flightsLong') {
                min = 0;
                max = 10;
            }
            else if (stateKey === 'electricity') {
                min = 0;
                max = 1000;
            }
            else if (stateKey === 'homeSize') {
                min = 200;
                max = 5000;
            }
            else if (stateKey === 'foodWaste') {
                min = 0;
                max = 50;
            }
            else if (stateKey === 'localFood') {
                min = 0;
                max = 100;
            }
            else if (stateKey === 'shopping') {
                min = 0;
                max = 2000;
            }
            else if (stateKey === 'recycling') {
                min = 0;
                max = 100;
            }
            else if (stateKey === 'digital') {
                min = 0;
                max = 16;
            }
            const clampedVal = Math.max(min, Math.min(max, val));
            state.values[stateKey] = clampedVal;
            if (slider)
                slider.value = clampedVal.toString();
            if (manualInput)
                manualInput.value = clampedVal.toString();
            const displaySpan = document.getElementById(displayId);
            if (displaySpan) {
                let text = clampedVal.toString();
                if (stateKey === 'carKm')
                    text = `${clampedVal} km`;
                else if (stateKey === 'publicTransit')
                    text = `${clampedVal} hours`;
                else if (stateKey === 'flightsShort' || stateKey === 'flightsLong')
                    text = `${clampedVal} flight${clampedVal !== 1 ? 's' : ''}`;
                else if (stateKey === 'electricity')
                    text = `${clampedVal} kWh`;
                else if (stateKey === 'homeSize')
                    text = `${clampedVal} sq ft`;
                else if (stateKey === 'shopping')
                    text = `$${clampedVal}`;
                else if (stateKey === 'foodWaste' || stateKey === 'localFood' || stateKey === 'recycling')
                    text = `${clampedVal}%`;
                else if (stateKey === 'digital')
                    text = `${clampedVal} hours`;
                displaySpan.textContent = text;
            }
            updateRunningTotal();
        };
        if (slider) {
            slider.addEventListener('input', () => {
                syncValues(parseInt(slider.value) || 0);
            });
        }
        if (manualInput) {
            manualInput.addEventListener('input', () => {
                syncValues(parseInt(manualInput.value) || 0);
            });
        }
        if (state.values[stateKey] !== undefined) {
            syncValues(state.values[stateKey]);
        }
    }
    /**
     * Initializes selector button groups for fuel types and energy sources.
     */
    function initSelectOptions() {
        setupButtonSelector('group-car-type', 'carType');
        setupButtonSelector('group-energy-source', 'energySource');
        setupButtonSelector('group-heating', 'heating');
    }
    /**
     * Sets up selection events inside a button choice container.
     *
     * @param groupId - Parent element ID.
     * @param stateKey - Target index key in global state object.
     */
    function setupButtonSelector(groupId, stateKey) {
        const group = document.getElementById(groupId);
        if (!group)
            return;
        const options = group.querySelectorAll('.select-option');
        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => {
                    o.classList.remove('selected');
                    o.setAttribute('aria-checked', 'false');
                });
                opt.classList.add('selected');
                opt.setAttribute('aria-checked', 'true');
                const val = opt.getAttribute('data-value') || '';
                if (stateKey === 'calcMode') {
                    state.values.calcMode = (val === 'office' || val === 'node-server' || val === 'personal') ? val : 'personal';
                }
                else if (stateKey === 'carType') {
                    state.values.carType = (val === 'diesel' || val === 'hybrid' || val === 'electric') ? val : 'gasoline';
                }
                else if (stateKey === 'energySource') {
                    state.values.energySource = (val === 'solar' || val === 'wind' || val === 'mixed') ? val : 'grid';
                }
                else if (stateKey === 'heating') {
                    state.values.heating = (val === 'electric' || val === 'oil' || val === 'heat-pump') ? val : 'gas';
                }
                updateRunningTotal();
            });
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
    /**
     * Sets up active selection event listeners for diet choosing card panels.
     */
    function initDietOptions() {
        const group = document.getElementById('group-diet-type');
        if (!group)
            return;
        const cards = group.querySelectorAll('.diet-option');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                cards.forEach(c => {
                    c.classList.remove('selected');
                    c.setAttribute('aria-checked', 'false');
                });
                card.classList.add('selected');
                card.setAttribute('aria-checked', 'true');
                const val = card.getAttribute('data-value') || '';
                state.values.dietType = (val === 'meat-heavy' || val === 'pescatarian' || val === 'vegetarian' || val === 'vegan') ? val : 'average';
                updateRunningTotal();
            });
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
    // 8. RESULTS DISPLAY & INSIGHTS GENERATOR
    // ==========================================================================
    /**
     * Makes results sections visible, starts animations, and calls graph setups.
     *
     * @param results - Calculated footprint metrics results object.
     */
    function showResults(results) {
        const sections = ['results', 'insights', 'eco-score'];
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('visible');
                el.classList.add('fade-in-up');
                el.classList.add('is-visible');
            }
        });
        const resultsSec = document.getElementById('results');
        if (resultsSec) {
            resultsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const totalValEl = document.getElementById('total-emissions-value');
        animateCounter(totalValEl, results.total, 1500, '', '', 2);
        animateCounter(document.getElementById('stat-trees'), results.trees, 1500, '', '', 0);
        const WORLD_AVERAGE = 4.5;
        const worldDiff = ((results.total - WORLD_AVERAGE) / WORLD_AVERAGE) * 100;
        const worldPrefix = worldDiff > 0 ? '+' : '';
        animateCounter(document.getElementById('stat-vs-world'), worldDiff, 1500, worldPrefix, '%', 0);
        animateCounter(document.getElementById('stat-cost'), results.costImpact, 1500, '$', '/mo', 0);
        animateCounter(document.getElementById('stat-earth-days'), results.earthsNeeded, 1500, '', ' Earths', 1);
        donutAnimProgress = 0;
        barAnimProgress = 0;
        const donutCanvas = document.getElementById('donut-chart');
        drawDonutChart(donutCanvas, results.breakdown, true);
        const barCanvas = document.getElementById('bar-chart');
        drawBarChart(barCanvas, results.total);
        generateAndPopulateInsights(results);
        populateEcoScore(results);
        checkAchievements(results);
    }
    /**
     * Generates localized suggestions dynamically targeting the highest emission segments.
     *
     * @param results - Emissions calculation outcomes.
     */
    function generateAndPopulateInsights(results) {
        const v = state.values;
        const insights = [];
        const EMISSION_FACTORS = {
            car: { gasoline: 0.21, diesel: 0.27, hybrid: 0.12, electric: 0.05 },
            flights: { short: 0.255, long: 0.195 },
            electricity: 0.417,
            heating: { gas: 2.0, electric: 1.5, oil: 2.5, 'heat-pump': 0.5 },
            diet: { 'meat-heavy': 3.3, average: 2.5, pescatarian: 1.7, vegetarian: 1.5, vegan: 1.0 },
            foodWaste: 0.02,
            shopping: 0.006,
            recycling: -0.015
        };
        if (v.carKm > 40 && v.carType !== 'electric') {
            const currentFactor = EMISSION_FACTORS.car[v.carType] ?? 0.21;
            const possibleSaving = (v.carKm * 365 * (currentFactor - EMISSION_FACTORS.car.electric)) / 1000;
            insights.push({
                category: 'transport',
                title: 'Switch to Electric Commuting',
                text: `Commuting ${v.carKm} km daily in a ${v.carType} car produces massive emissions. Upgrading to an EV would reduce travel emissions by ~75% instantly.`,
                saving: `Save ${possibleSaving.toFixed(1)}t CO₂/yr`
            });
        }
        else if (v.carKm > 20) {
            const currentFactor = EMISSION_FACTORS.car[v.carType] ?? 0.21;
            const transitSaving = (v.carKm * 180 * currentFactor) / 1000;
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
            const currentHeating = EMISSION_FACTORS.heating[v.heating] ?? 2.0;
            const heatPumpSaving = currentHeating * 0.6;
            insights.push({
                category: 'energy',
                title: 'Install Heat Pump System',
                text: `Your current heating setup utilizes carbon-heavy fossil fuels. Heat pumps run 3-4x more efficiently than boiler counterparts.`,
                saving: `Save ${heatPumpSaving.toFixed(1)}t CO₂/yr`
            });
        }
        if (v.dietType === 'meat-heavy' || v.dietType === 'average') {
            const currentDietT = EMISSION_FACTORS.diet[v.dietType] ?? 2.5;
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
        const container = document.getElementById('insights-container');
        if (container) {
            container.textContent = '';
            insights.slice(0, 4).forEach((ins, idx) => {
                const card = document.createElement('div');
                card.className = `glass-card insight-card insight-card--${ins.category} fade-in-up stagger-${idx + 1} is-visible`;
                const cat = document.createElement('div');
                cat.className = `insight-category cat-${ins.category}`;
                const dot = document.createElement('span');
                dot.textContent = '● ';
                cat.appendChild(dot);
                cat.appendChild(document.createTextNode(ins.category));
                const title = document.createElement('h4');
                title.className = 'insight-title';
                title.textContent = ins.title;
                const p = document.createElement('p');
                p.className = 'insight-text';
                p.textContent = ins.text;
                const impact = document.createElement('div');
                impact.className = 'insight-impact';
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('width', '16');
                svg.setAttribute('height', '16');
                svg.setAttribute('viewBox', '0 0 24 24');
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'currentColor');
                svg.setAttribute('stroke-width', '2.5');
                svg.setAttribute('stroke-linecap', 'round');
                svg.setAttribute('stroke-linejoin', 'round');
                svg.setAttribute('class', 'feather feather-trending-down');
                const poly1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                poly1.setAttribute('points', '23 18 13.5 8.5 8.5 13.5 1 6');
                const poly2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                poly2.setAttribute('points', '17 18 23 18 23 12');
                svg.appendChild(poly1);
                svg.appendChild(poly2);
                impact.appendChild(svg);
                impact.appendChild(document.createTextNode(' ' + ins.saving));
                card.appendChild(cat);
                card.appendChild(title);
                card.appendChild(p);
                card.appendChild(impact);
                container.appendChild(card);
            });
        }
    }
    /**
     * Updates letters and grades in the Eco Score module wrapper.
     *
     * @param results - Calculated footprint metrics results.
     */
    function populateEcoScore(results) {
        const letterEl = document.getElementById('eco-score-letter');
        const descEl = document.getElementById('eco-score-description');
        if (letterEl && descEl) {
            letterEl.className = 'score-letter';
            const gradeClass = results.ecoScore.letter.toLowerCase().replace('+', '');
            letterEl.classList.add(`grade-${gradeClass}`);
            letterEl.innerText = results.ecoScore.letter;
            descEl.innerText = results.ecoScore.description;
        }
        const youBar = document.getElementById('comparison-you');
        const youValEl = document.getElementById('val-comp-you');
        if (youBar && youValEl) {
            const US_AVERAGE = 14.7;
            const pct = Math.min(100, (results.total / US_AVERAGE) * 100);
            setTimeout(() => {
                youBar.style.width = `${pct}%`;
            }, 300);
            youValEl.innerText = `${results.total.toFixed(1)}t`;
        }
    }
    /**
     * Sets unlocked statuses for gamified achievements based on input state values.
     *
     * @param results - Emissions calculation outcomes.
     */
    function checkAchievements(results) {
        const v = state.values;
        const TARGET_2030 = 2.0;
        const WORLD_AVERAGE = 4.5;
        const achievements = [
            { id: 'ach-first-step', unlock: true },
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
                }
                else {
                    el.classList.add('locked');
                    el.classList.remove('unlocked');
                }
            }
        });
    }
    // ==========================================================================
    // 9. EXTRA FUNCTIONALITIES (Recalculate, Share, Download, LocalStorage)
    // ==========================================================================
    /**
     * Binds click events to CTA action elements (recalculate, share, download).
     */
    function initActions() {
        const btnRecalc = document.getElementById('btn-recalculate');
        if (btnRecalc) {
            btnRecalc.addEventListener('click', () => {
                goToStep(1);
                const sections = ['results', 'insights', 'eco-score'];
                sections.forEach(id => {
                    const el = document.getElementById(id);
                    if (el)
                        el.classList.remove('visible');
                });
                const calcSec = document.getElementById('calculator');
                if (calcSec) {
                    calcSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
        const btnShare = document.getElementById('btn-share');
        if (btnShare) {
            btnShare.addEventListener('click', () => {
                if (!state.results)
                    return;
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
        const btnDownload = document.getElementById('btn-download');
        if (btnDownload) {
            btnDownload.addEventListener('click', () => {
                if (!state.results)
                    return;
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
    // 10. SCROLL & INTERSECTION OBSERVER ANIMATIONS
    // ==========================================================================
    /**
     * Initializes intersection observers for triggering staggered fade-in animations on scroll.
     */
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
        document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right, .scale-in').forEach(el => {
            observer.observe(el);
        });
    }
    // ==========================================================================
    // 11. NAVBAR SCROLL & ACTIVE TRACKING
    // ==========================================================================
    /**
     * Adjusts navbar backgrounds on scroll and highlights the active section in navigation links.
     */
    function initNavbarScroll() {
        const navbar = document.getElementById('navbar');
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.nav-link');
        if (!navbar)
            return;
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            }
            else {
                navbar.classList.remove('scrolled');
            }
            let currentSectionId = '';
            sections.forEach(sec => {
                const top = sec.offsetTop - 120;
                const height = sec.offsetHeight;
                if (window.scrollY >= top && window.scrollY < top + height) {
                    const id = sec.getAttribute('id');
                    if (id)
                        currentSectionId = id;
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
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const navLinksContainer = document.getElementById('nav-links');
                const menuBtn = document.getElementById('mobile-menu-btn');
                if (navLinksContainer && navLinksContainer.classList.contains('open')) {
                    navLinksContainer.classList.remove('open');
                    if (menuBtn) {
                        menuBtn.classList.remove('open');
                        menuBtn.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
    }
    // ==========================================================================
    // 12. MOBILE HAMBURGER MENU
    // ==========================================================================
    /**
     * Binds click handlers to slide out mobile drawer menus when the hamburger is toggled.
     */
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
    // 13. HERO WORLD EMISSIONS LIVE COUNTER
    // ==========================================================================
    /**
     * Runs the sub-second global emissions counter in the hero header.
     */
    function initHeroCounter() {
        const liveCounterEl = document.getElementById('live-counter');
        if (!liveCounterEl)
            return;
        const emissionsPerSecond = 1157.4;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const secondsElapsed = (now.getTime() - startOfDay.getTime()) / 1000;
        let baseCount = secondsElapsed * emissionsPerSecond;
        setInterval(() => {
            baseCount += (emissionsPerSecond * 0.1);
            liveCounterEl.innerText = Math.round(baseCount).toLocaleString();
        }, 100);
    }
    // ==========================================================================
    // 14. TOAST NOTIFICATION SYSTEM
    // ==========================================================================
    /**
     * Spawns a floating glassmorphic toast notification.
     *
     * @param message - The alert text message content.
     * @param type - Alert status level ('success' | 'error').
     * @param duration - Self dismiss timer delay in ms.
     */
    function showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'glass-card';
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
        const icon = type === 'success' ? '🌱' : '⚠️';
        toast.textContent = '';
        const span = document.createElement('span');
        span.style.marginRight = '8px';
        span.textContent = icon;
        toast.appendChild(span);
        toast.appendChild(document.createTextNode(message));
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 50);
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, duration);
    }
    // ==========================================================================
    // 15. CHECK & RESTORE SAVE STATE
    // ==========================================================================
    /**
     * Retrieves previous session parameters from localStorage and populates sliders/selectors.
     */
    function checkSavedState() {
        const saved = localStorage.getItem('ecotrack_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    const keys = Object.keys(state.values);
                    for (const key of keys) {
                        const stringKey = key;
                        if (stringKey === '__proto__' || stringKey === 'constructor' || stringKey === 'prototype') {
                            continue;
                        }
                        if (Object.prototype.hasOwnProperty.call(parsed, key)) {
                            const val = parsed[key];
                            if (typeof val === typeof state.values[key]) {
                                state.values[key] = val;
                            }
                        }
                    }
                }
                setTimeout(() => {
                    showToast('Restored your previously saved input state!', 'success', 4000);
                }, 1000);
            }
            catch (err) {
                console.error('Failed restoring state:', err);
            }
        }
    }
    // ==========================================================================
    // 16. RESPONSIVE CHART REDRAW ON RESIZE
    // ==========================================================================
    /**
     * Redraws canvas charts on window resize event actions, debouncing callbacks to conserve execution resources.
     */
    function initChartResize() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            if (resizeTimeout)
                clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (state.results) {
                    const donutCanvas = document.getElementById('donut-chart');
                    const barCanvas = document.getElementById('bar-chart');
                    donutAnimProgress = 1;
                    barAnimProgress = 1;
                    drawDonutChart(donutCanvas, state.results.breakdown, false);
                    drawBarChart(barCanvas, state.results.total);
                }
            }, 250);
        });
    }
    // ==========================================================================
    // 17. APPLICATION INITIALIZATION
    // ==========================================================================
    /**
     * Primary orchestrator method mapping page listeners and initial calculation loads.
     */
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
        initChartResize();
        updateRunningTotal();
        initActions();
    }
    init();
});
