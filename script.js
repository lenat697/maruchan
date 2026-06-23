/* script.js - Lógica interactiva y puente con PyScript */

document.addEventListener("DOMContentLoaded", () => {
    // Referencias a elementos del DOM
    const tabBtns = document.querySelectorAll(".tabs .tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    
    const sliderT0 = document.getElementById("slider-t0");
    const valT0 = document.getElementById("val-t0");
    
    const sliderTs = document.getElementById("slider-ts");
    const valTs = document.getElementById("val-ts");
    
    const sliderK = document.getElementById("slider-k");
    const valK = document.getElementById("val-k");
    
    const sliderMaxt = document.getElementById("slider-maxt");
    const valMaxt = document.getElementById("val-maxt");
    
    const sliderInspect = document.getElementById("slider-inspect");
    const valInspect = document.getElementById("val-inspect");
    
    const btnPlay = document.getElementById("btn-play");
    const statusOverlay = document.getElementById("pyscript-status");
    
    // Elementos de Storytelling
    const soupImage = document.getElementById("soup-img");
    const currentTempText = document.getElementById("current-temp-text");
    const tempBadge = document.getElementById("temp-badge");
    const studentSaying = document.getElementById("student-saying");
    const steamContainer = document.getElementById("steam-container");

    let simulationData = { tiempos: [], temperaturas: [] };
    let chartInstance = null;
    let playInterval = null;
    let isPlaying = false;

    // --- 1. Gestión de Pestañas ---
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            console.log("Tab click - button:", btn, "data-tab:", tabId, "Element found:", document.getElementById(tabId));
            
            tabBtns.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            
            btn.classList.add("active");
            if (tabId && document.getElementById(tabId)) {
                document.getElementById(tabId).classList.add("active");
            } else {
                console.warn("No se encontró el elemento con ID:", tabId);
            }
        });
    });

    // --- 2. Fallback Matemático en JS (hasta que PyScript cargue) ---
    function calcularEnfriamientoJS(T_0, T_s, k, max_t, num_puntos = 100) {
        const tiempos = [];
        const temperaturas = [];
        const dt = max_t / (num_puntos - 1);
        
        for (let i = 0; i < num_puntos; i++) {
            const t = i * dt;
            const T = T_s + (T_0 - T_s) * Math.exp(-k * t);
            tiempos.push(Number(t.toFixed(2)));
            temperaturas.push(Number(T.toFixed(2)));
        }
        return { tiempos, temperaturas };
    }

    // --- 3. Ejecución del Modelo ---
    function ejecutarSimulacion() {
        const T_0 = parseFloat(sliderT0.value);
        const T_s = parseFloat(sliderTs.value);
        const k = parseFloat(sliderK.value);
        const max_t = parseFloat(sliderMaxt.value);
        
        // Actualizamos límites del slider de inspección
        sliderInspect.max = max_t;
        if (parseFloat(sliderInspect.value) > max_t) {
            sliderInspect.value = max_t;
        }
        valInspect.textContent = `${sliderInspect.value} min`;

        // Intentamos llamar a la función de PyScript expuesta en window
        if (window.calcularEnfriamientoPython) {
            try {
                const jsonRes = window.calcularEnfriamientoPython(T_0, T_s, k, max_t, 100);
                simulationData = JSON.parse(jsonRes);
                console.log("Calculado con PyScript (Python)");
                statusOverlay.classList.add("loaded");
            } catch (err) {
                console.error("Error al calcular con PyScript, usando JS Fallback:", err);
                simulationData = calcularEnfriamientoJS(T_0, T_s, k, max_t);
            }
        } else {
            // JS Fallback
            simulationData = calcularEnfriamientoJS(T_0, T_s, k, max_t);
            console.log("Calculado con JavaScript Fallback (esperando PyScript)");
        }

        actualizarGrafico();
        actualizarEstadoSopa();
    }

    // --- 4. Inicialización y Actualización de la Gráfica ---
    function actualizarGrafico() {
        const ctx = document.getElementById("chart-canvas").getContext("2d");
        
        // Crear gradiente para la temperatura de la sopa
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(255, 87, 34, 0.4)');   /* Naranja caliente */
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)'); /* Azul frío */

        const inspectTime = parseFloat(sliderInspect.value);
        const inspectIndex = simulationData.tiempos.findIndex(t => t >= inspectTime);
        const inspectTemp = inspectIndex !== -1 ? simulationData.temperaturas[inspectIndex] : simulationData.temperaturas[0];

        // Construir datos de la línea constante para la Temperatura Ideal (60°C)
        const idealLine = Array(simulationData.tiempos.length).fill(60);

        // Construir datos del punto de inspección
        const pointData = simulationData.tiempos.map((t, idx) => {
            if (idx === inspectIndex) {
                return simulationData.temperaturas[idx];
            }
            return null;
        });

        if (chartInstance) {
            chartInstance.data.labels = simulationData.tiempos;
            chartInstance.data.datasets[0].data = simulationData.temperaturas;
            chartInstance.data.datasets[1].data = idealLine;
            chartInstance.data.datasets[2].data = pointData;
            chartInstance.update('none'); // Actualización rápida sin animar de cero
        } else {
            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: simulationData.tiempos,
                    datasets: [
                        {
                            label: 'Temperatura de la Sopa (°C)',
                            data: simulationData.temperaturas,
                            borderColor: '#FF5722',
                            borderWidth: 4,
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 0,
                            pointHoverRadius: 6
                        },
                        {
                            label: 'Temperatura Ideal para Comer (60°C)',
                            data: idealLine,
                            borderColor: '#10b981',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            fill: false,
                            pointRadius: 0,
                            pointHoverRadius: 0
                        },
                        {
                            label: 'Punto Inspeccionado',
                            data: pointData,
                            backgroundColor: '#D84315',
                            borderColor: '#ffffff',
                            borderWidth: 2,
                            pointRadius: 8,
                            pointHoverRadius: 10,
                            showLine: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    family: 'Outfit',
                                    size: 13,
                                    weight: '600'
                                },
                                color: '#4a5568'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.raw}°C`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Tiempo (minutos)',
                                font: { family: 'Outfit', size: 14, weight: '700' },
                                color: '#4a5568'
                            },
                            grid: { color: 'rgba(0,0,0,0.03)' }
                        },
                        y: {
                            min: 0,
                            max: 110,
                            title: {
                                display: true,
                                text: 'Temperatura (°C)',
                                font: { family: 'Outfit', size: 14, weight: '700' },
                                color: '#4a5568'
                            },
                            grid: { color: 'rgba(0,0,0,0.03)' }
                        }
                    }
                }
            });
        }
    }

    // --- 5. Storytelling Visual y Animaciones de Vapor ---
    function actualizarEstadoSopa() {
        const inspectTime = parseFloat(sliderInspect.value);
        
        // Buscar la temperatura correspondiente al tiempo seleccionado
        const index = simulationData.tiempos.findIndex(t => t >= inspectTime);
        const temp = index !== -1 ? simulationData.temperaturas[index] : parseFloat(sliderT0.value);

        currentTempText.innerHTML = `${temp.toFixed(1)} <span style="font-size: 1.5rem; font-weight: 500;">°C</span>`;

        // Remover clases de color de temperatura previas
        tempBadge.className = "temp-badge";

        // Determinación del estado de la sopa y asignación de activos
        if (temp > 75) {
            // ¡MUY CALIENTE!
            tempBadge.textContent = "Peligro: ¡Quema!";
            tempBadge.classList.add("badge-hot");
            studentSaying.textContent = "¡Ay! ¡Peligro, quema la lengua! 🥵 El agua hirviendo recién servida está a fuego vivo. ¡Ni se te ocurra meterle cuchara aún!";
            soupImage.src = "assets/maruchan_hot.png";
            generarVapor(5); // Mucho vapor
        } else if (temp > 60) {
            // CALIENTE PERO BAJANDO
            tempBadge.textContent = "Casi lista...";
            tempBadge.classList.add("badge-warm");
            studentSaying.textContent = "Casi lista... Huele riquísimo pero aún puedes quemarte un poco. ¡Un par de soplidos y estará perfecta! 😋";
            soupImage.src = "assets/maruchan_warm.png";
            generarVapor(2); // Vapor moderado
        } else if (temp >= 50) {
            // TEMPERATURA PERFECTA
            tempBadge.textContent = "¡A comer!";
            tempBadge.classList.add("badge-perfect");
            studentSaying.textContent = "¡Temperatura perfecta! ¡A comer! 🎉🍲 Los fideos están en su punto y el caldo está ideal para disfrutar sin sufrir quemaduras. ¡Buen provecho!";
            soupImage.src = "assets/maruchan_ready.png";
            generarVapor(0); // Sin vapor
        } else {
            // SE ENFRIÓ
            tempBadge.textContent = "Fría";
            tempBadge.classList.add("badge-cold");
            studentSaying.textContent = "¡Se enfrió! 🥶 Ya está por debajo de la temperatura ideal. Quedó tibia y los fideos se están inflando de más. ¡Apúrate!";
            soupImage.src = "assets/maruchan_cold.png";
            generarVapor(0); // Sin vapor
        }
    }

    // Efecto visual de partículas de vapor
    function generarVapor(intensidad) {
        steamContainer.innerHTML = "";
        if (intensidad === 0) return;

        for (let i = 0; i < intensidad; i++) {
            const steamNode = document.createElement("div");
            steamNode.className = "steam-bubble";
            
            // Posicionamiento horizontal aleatorio
            const leftOffset = 25 + Math.random() * 50; // Entre 25% y 75% del contenedor
            const size = 8 + Math.random() * 12; // Tamaño aleatorio
            const animDuration = 1.5 + Math.random() * 1.5; // Duración aleatoria
            const animDelay = Math.random() * 1.5;

            steamNode.style.left = `${leftOffset}%`;
            steamNode.style.bottom = `15px`;
            steamNode.style.width = `${size}px`;
            steamNode.style.height = `${size}px`;
            steamNode.style.animationDuration = `${animDuration}s`;
            steamNode.style.animationDelay = `${animDelay}s`;

            steamContainer.appendChild(steamNode);
        }
    }

    // --- 6. Manejadores de Eventos de Controles ---
    const controles = [sliderT0, sliderTs, sliderK, sliderMaxt];
    
    sliderT0.addEventListener("input", (e) => {
        valT0.textContent = `${e.target.value}°C`;
        ejecutarSimulacion();
    });

    sliderTs.addEventListener("input", (e) => {
        valTs.textContent = `${e.target.value}°C`;
        ejecutarSimulacion();
    });

    sliderK.addEventListener("input", (e) => {
        valK.textContent = e.target.value;
        ejecutarSimulacion();
    });

    sliderMaxt.addEventListener("input", (e) => {
        valMaxt.textContent = `${e.target.value} min`;
        ejecutarSimulacion();
    });

    sliderInspect.addEventListener("input", (e) => {
        valInspect.textContent = `${e.target.value} min`;
        actualizarGrafico();
        actualizarEstadoSopa();
    });

    // Botón de reproducción de la simulación
    btnPlay.addEventListener("click", () => {
        if (isPlaying) {
            // Detener
            clearInterval(playInterval);
            btnPlay.innerHTML = '<span style="font-size: 1.1rem; margin-right: 5px;">▶</span> Reproducir';
            btnPlay.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
            isPlaying = false;
        } else {
            // Iniciar
            isPlaying = true;
            btnPlay.innerHTML = '<span style="font-size: 1.1rem; margin-right: 5px;">⏸</span> Pausar';
            btnPlay.style.background = '#4a5568';
            
            // Si está en el final, reiniciar a 0
            if (parseFloat(sliderInspect.value) >= parseFloat(sliderInspect.max)) {
                sliderInspect.value = 0;
            }

            playInterval = setInterval(() => {
                let current = parseFloat(sliderInspect.value);
                const step = parseFloat(sliderMaxt.value) / 100; // 100 pasos totales
                
                current += 0.2; // Avanzar 0.2 minutos por tick
                
                if (current >= parseFloat(sliderInspect.max)) {
                    sliderInspect.value = sliderInspect.max;
                    clearInterval(playInterval);
                    btnPlay.innerHTML = '<span style="font-size: 1.1rem; margin-right: 5px;">▶</span> Reproducir';
                    btnPlay.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
                    isPlaying = false;
                } else {
                    sliderInspect.value = current;
                }
                
                valInspect.textContent = `${parseFloat(sliderInspect.value).toFixed(1)} min`;
                actualizarGrafico();
                actualizarEstadoSopa();
            }, 50); // Rápido pero fluido
        }
    });

    // --- 7. Bucle de Detección de PyScript ---
    // Chequeamos cada 300ms si PyScript ya cargó su runtime e inicializó el proxy.
    const detectorPyScript = setInterval(() => {
        if (window.calcularEnfriamientoPython) {
            console.log("¡PyScript detectado y activo!");
            statusOverlay.classList.add("loaded");
            ejecutarSimulacion();
            clearInterval(detectorPyScript);
        }
    }, 300);

    // Cancelar detección después de 20 segundos por si acaso y usar JS
    setTimeout(() => {
        clearInterval(detectorPyScript);
        if (!window.calcularEnfriamientoPython) {
            console.log("Tiempo de espera agotado para PyScript. Utilizando JS Fallback de forma permanente.");
            statusOverlay.innerHTML = '<span style="font-size:1.1rem;">⚠️</span> Usando JS (PyScript offline)';
            statusOverlay.style.background = 'rgba(239, 68, 68, 0.9)';
            setTimeout(() => statusOverlay.classList.add("loaded"), 3000);
        }
    }, 20000);

    // Ejecutar simulación inicial (usará fallback JS inmediatamente)
    ejecutarSimulacion();
});
