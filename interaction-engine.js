// Paleta de colores PolkUp
const polkupColors = ['#EC2828', '#EDC217', '#3329ED', '#0DB500'];

/* ====================================================
   SISTEMA DE AUDIO DIGITAL (Web Audio API)
   ==================================================== */
class PolkupAudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = true;
        
        // Nodos para Efectos
        this.mainGain = null;
        this.tensionOsc = null;
        this.tensionLFO = null;
        this.tensionGain = null;
        this.tensionFilter = null;
        this.tensionLFOGain = null;
        
        this.windNoise = null;
        this.windFilter = null;
        this.windGain = null;
        this.windLFO = null;
        this.windLFOGain = null;
        
        this.summitMusicOsc = [];
        this.summitMusicGain = null;
    }

    init() {
        if (this.ctx) return;
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        this.mainGain = this.ctx.createGain();
        this.mainGain.connect(this.ctx.destination);
        this.mainGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
        
        this.setupTensionSynth();
        this.setupWindGenerator();
    }

    setMute(mute) {
        this.isMuted = mute;
        if (!this.ctx) return;
        
        const targetGain = this.isMuted ? 0 : 0.6;
        this.mainGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // --- SINTETIZADOR DE TENSIÓN (PANTALLA: ANCLA) ---
    setupTensionSynth() {
        this.tensionOsc = this.ctx.createOscillator();
        this.tensionOsc.type = 'triangle';
        this.tensionOsc.frequency.setValueAtTime(65, this.ctx.currentTime); 
        
        this.tensionFilter = this.ctx.createBiquadFilter();
        this.tensionFilter.type = 'lowpass';
        this.tensionFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
        
        this.tensionGain = this.ctx.createGain();
        this.tensionGain.gain.setValueAtTime(0, this.ctx.currentTime); 
        
        this.tensionLFO = this.ctx.createOscillator();
        this.tensionLFO.frequency.setValueAtTime(1, this.ctx.currentTime); 
        
        this.tensionLFOGain = this.ctx.createGain();
        this.tensionLFOGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        
        this.tensionOsc.connect(this.tensionFilter);
        this.tensionFilter.connect(this.tensionGain);
        this.tensionGain.connect(this.mainGain);
        
        this.tensionLFO.connect(this.tensionLFOGain);
        this.tensionLFOGain.connect(this.tensionGain.gain); 
        
        this.tensionOsc.start(0);
        this.tensionLFO.start(0);
    }

    startTensionSound() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        this.tensionGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.tensionGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.5);
    }

    stopTensionSound() {
        if (!this.ctx) return;
        this.tensionGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.tensionGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    }

    updateTension(proximityRatio) {
        if (!this.ctx) return;
        // Modulamos velocidad de latido del LFO y frecuencia del tono base
        const lfoFreq = 1 + proximityRatio * 13;
        this.tensionLFO.frequency.setTargetAtTime(lfoFreq, this.ctx.currentTime, 0.05);
        
        const pitch = 65 + proximityRatio * 135; // De 65Hz a 200Hz
        this.tensionOsc.frequency.setTargetAtTime(pitch, this.ctx.currentTime, 0.1);
        
        const filterCutoff = 120 + proximityRatio * 500;
        this.tensionFilter.frequency.setTargetAtTime(filterCutoff, this.ctx.currentTime, 0.1);
    }

    playAnchorChime() {
        if (!this.ctx || this.isMuted) return;
        
        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880]; // Acorde armónico de La Mayor
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.12, now + idx * 0.04 + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.8);
            
            osc.connect(gainNode);
            gainNode.connect(this.mainGain);
            
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.8);
        });
    }

    // --- SINTETIZADOR DE VIENTO (PANTALLA: CIMA / TÚNEL) ---
    setupWindGenerator() {
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        this.windNoise = this.ctx.createBufferSource();
        this.windNoise.buffer = noiseBuffer;
        this.windNoise.loop = true;
        
        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.setValueAtTime(250, this.ctx.currentTime); 
        this.windFilter.Q.setValueAtTime(2.0, this.ctx.currentTime); 
        
        this.windGain = this.ctx.createGain();
        this.windGain.gain.setValueAtTime(0, this.ctx.currentTime); 
        
        this.windNoise.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.mainGain);
        
        this.windNoise.start(0);
        
        this.windLFO = this.ctx.createOscillator();
        this.windLFO.frequency.setValueAtTime(0.18, this.ctx.currentTime); 
        
        this.windLFOGain = this.ctx.createGain();
        this.windLFOGain.gain.setValueAtTime(180, this.ctx.currentTime); 
        
        this.windLFO.connect(this.windLFOGain);
        this.windLFOGain.connect(this.windFilter.frequency); 
        
        this.windLFO.start(0);
    }

    startWindSound() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        this.windGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.windGain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.8);
    }

    stopWindSound() {
        if (!this.ctx) return;
        this.windGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.windGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    }

    updateWind(speedRatio) {
        if (!this.ctx) return;
        // Volumen y silbido del viento acorde a la velocidad
        const volume = 0.08 + speedRatio * 0.25;
        this.windGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.15);
        
        const filterCenter = 220 + speedRatio * 450;
        this.windLFOGain.gain.setTargetAtTime(120 + speedRatio * 200, this.ctx.currentTime, 0.2);
        this.windFilter.Q.setTargetAtTime(2.0 + speedRatio * 3.5, this.ctx.currentTime, 0.15);
    }

    playWhooshSound() {
        if (!this.ctx || this.isMuted) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.32);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);
        filter.frequency.exponentialRampToValueAtTime(1600, now + 0.12);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.32);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.mainGain);
        
        osc.start(now);
        osc.stop(now + 0.33);
    }

    playSummitChord() {
        if (!this.ctx) return;
        
        const now = this.ctx.currentTime;
        const chord = [130.81, 196.00, 261.63, 329.63, 392.00, 493.88, 587.33]; // C3, G3, C4, E4, G4, B4, D5
        
        this.summitMusicGain = this.ctx.createGain();
        this.summitMusicGain.gain.setValueAtTime(0, now);
        this.summitMusicGain.gain.linearRampToValueAtTime(0.22, now + 2.0); 
        this.summitMusicGain.connect(this.mainGain);
        
        this.summitMusicOsc = [];
        
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            
            // Vibrato sutil celestial
            const vibrato = this.ctx.createOscillator();
            const vibratoGain = this.ctx.createGain();
            vibrato.frequency.setValueAtTime(3.5 + Math.random() * 1.5, now);
            vibratoGain.gain.setValueAtTime(freq * 0.0025, now);
            
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibrato.start(now);
            
            gain.gain.setValueAtTime(0.04, now);
            
            osc.connect(gain);
            gain.connect(this.summitMusicGain);
            
            osc.start(now);
            this.summitMusicOsc.push({ osc, vibrato });
        });
    }

    stopSummitChord() {
        if (!this.ctx || !this.summitMusicGain) return;
        
        const now = this.ctx.currentTime;
        this.summitMusicGain.gain.cancelScheduledValues(now);
        this.summitMusicGain.gain.linearRampToValueAtTime(0, now + 1.2);
        
        setTimeout(() => {
            if (this.summitMusicOsc) {
                this.summitMusicOsc.forEach(item => {
                    try {
                        item.osc.stop();
                        item.vibrato.stop();
                    } catch(e) {}
                });
                this.summitMusicOsc = [];
            }
        }, 1300);
    }
}

const audio = new PolkupAudioEngine();

/* ====================================================
   CONTROL DE NAVEGACIÓN Y CONFIGURACIÓN INICIAL
   ==================================================== */
let currentActiveScreen = 'screen-menu';

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initAudioControls();
    initAnclaGame();
    initRotaGame();
    initCimaGame();
});

function initNavigation() {
    // Al apretar una opción del menú
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            switchScreen(targetId);
        });
    });

    // Al apretar el botón de volver al menú
    document.querySelectorAll('.back-to-menu').forEach(btn => {
        btn.addEventListener('click', () => {
            switchScreen('screen-menu');
        });
    });

    // Soporte para query parameter "?screen=ancla" para navegación directa
    const urlParams = new URLSearchParams(window.location.search);
    const screenParam = urlParams.get('screen');
    if (screenParam) {
        switchScreen('screen-' + screenParam);
    }
}

function switchScreen(screenId) {
    // Eventos al salir de la pantalla activa
    if (currentActiveScreen === 'screen-ancla' && screenId !== 'screen-ancla') {
        audio.stopTensionSound();
    }
    if (currentActiveScreen === 'screen-cima' && screenId !== 'screen-cima') {
        audio.stopWindSound();
        audio.stopSummitChord();
    }

    document.querySelectorAll('.experimental-screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
    if(targetScreen) {
        targetScreen.classList.add('active');
        currentActiveScreen = screenId;
        
        // Control de visibilidad del botón de sonido
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            if (screenId === 'screen-menu') {
                soundToggle.style.display = 'none'; // Se oculta en el menú principal
            } else {
                soundToggle.style.display = 'flex'; // Se muestra al entrar en cada página
            }
        }

        // Eventos al entrar a la pantalla destino
        if (screenId === 'screen-ancla') {
            audio.startTensionSound();
        } else if (screenId === 'screen-cima') {
            audio.startWindSound();
        }
        
        window.dispatchEvent(new Event('resize'));
    }
}

function initAudioControls() {
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            const isMuted = soundToggle.classList.contains('muted');
            if (isMuted) {
                soundToggle.classList.remove('muted');
                soundToggle.querySelector('.sound-icon').innerText = '🔊';
                soundToggle.querySelector('.sound-label').innerText = 'Silenciar';
                audio.init();
                audio.setMute(false);
            } else {
                soundToggle.classList.add('muted');
                soundToggle.querySelector('.sound-icon').innerText = '🔇';
                soundToggle.querySelector('.sound-label').innerText = 'Activar Sonido';
                audio.setMute(true);
            }
        });
    }
}


/* ====================================================
   1. EXPERIMENTO: ANCLA (Radar Elástico y Brújula)
   ==================================================== */
function initAnclaGame() {
    const canvas = document.getElementById('canvasAncla');
    const ctx = canvas.getContext('2d');
    
    let nodes = [];
    const totalNodes = 60;

    let mouseX = -1000;
    let mouseY = -1000;
    
    let nextNodeIndex = -1; 

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    function generateNodes() {
        nodes = [];
        for (let i = 0; i < totalNodes; i++) {
            const posX = 50 + Math.random() * (canvas.width - 100);
            const posY = 50 + Math.random() * (canvas.height - 100);
            const randomColor = polkupColors[Math.floor(Math.random() * polkupColors.length)];

            nodes.push({
                id: i,
                x: posX,     
                y: posY,
                currentX: posX, 
                currentY: posY,
                r: 26, 
                color: randomColor,
                active: false 
            });
        }

        if (nodes.length > 0) {
            const initialIndex = Math.floor(Math.random() * nodes.length);
            nodes[initialIndex].active = true;
            selectNextTarget(initialIndex);
        }
    }

    function selectNextTarget(currentActiveIdx) {
        let inactiveNodes = nodes.filter(n => n.id !== currentActiveIdx);
        if (inactiveNodes.length > 0) {
            let randomTarget = inactiveNodes[Math.floor(Math.random() * inactiveNodes.length)];
            nextNodeIndex = randomTarget.id;
        }
    }

    canvas.addEventListener('click', (e) => {
        if (!canvas.parentElement.parentElement.classList.contains('active')) return;
        
        const rect = canvas.getBoundingClientRect();
        const mX = e.clientX - rect.left;
        const mY = e.clientY - rect.top;

        const targetHiddenNode = nodes[nextNodeIndex];

        if (targetHiddenNode) {
            const distToTarget = Math.hypot(mX - targetHiddenNode.x, mY - targetHiddenNode.y);
            
            if (distToTarget < targetHiddenNode.r) {
                let activeNode = nodes.find(n => n.active);
                if (activeNode) {
                    activeNode.active = false; 
                    activeNode.currentX = activeNode.x; 
                    activeNode.currentY = activeNode.y;
                }
                
                targetHiddenNode.active = true;
                
                // Reproducir chime pop agradable
                audio.playAnchorChime();
                
                selectNextTarget(targetHiddenNode.id);
            }
        }
    });

    function render() {
        if (canvas.width !== canvas.parentElement.clientWidth || canvas.height !== canvas.parentElement.clientHeight) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            generateNodes(); 
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const targetHiddenNode = nodes[nextNodeIndex];

        // 🎯 CÁLCULO Y MODULACIÓN DE TENSIÓN DE AUDIO BASADO EN CERCANÍA
        if (targetHiddenNode && mouseX > 0 && currentActiveScreen === 'screen-ancla') {
            const distMouseToTarget = Math.hypot(mouseX - targetHiddenNode.x, mouseY - targetHiddenNode.y);
            const maxDistance = 600;
            const proximity = Math.max(0, 1 - (distMouseToTarget / maxDistance));
            audio.updateTension(proximity);
        } else if (currentActiveScreen === 'screen-ancla') {
            audio.updateTension(0);
        }

        nodes.forEach(node => {
            if (node.active) {
                // ---- FÍSICA DEL MOUSE (IMÁN) ----
                const distToMouse = Math.hypot(mouseX - node.x, mouseY - node.y);
                
                if (distToMouse < 280 && mouseX > 0) {
                    const angle = Math.atan2(mouseY - node.y, mouseX - node.x);
                    const pullStrength = (280 - distToMouse) * 0.25; 
                    
                    const targetX = node.x + Math.cos(angle) * pullStrength;
                    const targetY = node.y + Math.sin(angle) * pullStrength;

                    node.currentX += (targetX - node.currentX) * 0.15;
                    node.currentY += (targetY - node.currentY) * 0.15;

                    // 🕸️ LÍNEA 1: Tensión del Nodo Activo al Mouse
                    ctx.beginPath();
                    ctx.moveTo(node.currentX, node.currentY);
                    ctx.lineTo(mouseX, mouseY);
                    ctx.lineWidth = 2;
                    const alpha1 = Math.max(0.1, (280 - distToMouse) / 280);
                    ctx.strokeStyle = `rgba(51, 51, 51, ${alpha1})`; 
                    ctx.setLineDash([5, 4]); 
                    ctx.stroke();
                    ctx.setLineDash([]); 
                } else {
                    node.currentX += (node.x - node.currentX) * 0.12;
                    node.currentY += (node.y - node.currentY) * 0.12;
                }

                // 🧭 LÍNEA 2 BRÚJULA PERMANENTE: Del círculo activo al círculo objetivo oculto
                if (targetHiddenNode) {
                    let lineAlpha = 0.0;
                    let proximity = 0.0;
                    
                    if (mouseX > 0) {
                        const distToTarget = Math.hypot(mouseX - targetHiddenNode.x, mouseY - targetHiddenNode.y);
                        const distActiveToTarget = Math.hypot(targetHiddenNode.x - node.currentX, targetHiddenNode.y - node.currentY);
                        
                        // Limitamos la distancia máxima de revelación al tamaño de la distancia real entre nodos,
                        // asegurando que la brújula empiece en 0% de longitud cuando el mouse está en el nodo activo,
                        // y solo crezca a medida que el cursor se acerca al objetivo.
                        const maxRevealDist = Math.min(520, distActiveToTarget);
                        
                        proximity = Math.max(0, 1 - (distToTarget / Math.max(1, maxRevealDist)));
                        lineAlpha = 0.1 + (proximity * 0.55); // Aumenta la opacidad gradualmente
                    }
                    
                    if (proximity > 0) {
                        // La línea se dibuja directamente hasta el cursor del mouse,
                        // de modo que no se completa ni se acerca al círculo objetivo por sí sola;
                        // el usuario debe llegar con su cursor al círculo para conectarlo.
                        const lineEndX = mouseX;
                        const lineEndY = mouseY;
                        
                        ctx.beginPath();
                        ctx.moveTo(node.currentX, node.currentY);
                        ctx.lineTo(lineEndX, lineEndY);
                        ctx.lineWidth = 1.6;
                        ctx.strokeStyle = `rgba(51, 51, 51, ${lineAlpha})`;
                        ctx.setLineDash([4, 6]); 
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }

                // Dibujar círculo activo
                ctx.beginPath();
                ctx.arc(node.currentX, node.currentY, node.r, 0, Math.PI * 2);
                ctx.fillStyle = node.color;
                ctx.fill(); 
                
            } else {
                // ---- REVELACIÓN POR PROXIMIDAD DEL MOUSE ----
                const distToMouse = Math.hypot(mouseX - node.x, mouseY - node.y);
                
                if (distToMouse < 220 && mouseX > 0) {
                    const nodeAlpha = (1 - (distToMouse / 220)) * 0.9;
                    
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
                    
                    if (node.id === nextNodeIndex) {
                        ctx.fillStyle = node.color;
                    } else {
                        ctx.fillStyle = '#e5e5e5'; 
                    }
                    
                    ctx.globalAlpha = nodeAlpha;
                    ctx.fill();
                    ctx.globalAlpha = 1.0; 
                }
            }
        });

        requestAnimationFrame(render);
    }
    generateNodes();
    render();
}


/* ====================================================
   2. EXPERIMENTO: ROTAR (Giro y Modulador de Velocidad)
   ==================================================== */
function initRotaGame() {
    const canvas = document.getElementById('canvasRota');
    const ctx = canvas.getContext('2d');
    
    let mouseX = -1000;
    let mouseY = -1000;

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    const totalRings = 8; 
    let ringsData = [];
    let globalSpeedMultiplier = 1.0;

    // Control del slider de velocidad en la UI
    const speedSlider = document.getElementById('speed-slider');
    const speedLabel = document.getElementById('speed-label');
    if (speedSlider && speedLabel) {
        speedSlider.addEventListener('input', () => {
            globalSpeedMultiplier = parseFloat(speedSlider.value);
            speedLabel.innerText = globalSpeedMultiplier.toFixed(1) + 'x';
        });
    }

    function setupRings() {
        ringsData = [];
        const maxRadius = Math.max(canvas.width, canvas.height) * 0.65; 
        
        for (let r = 0; r < totalRings; r++) {
            ringsData.push({
                radius: maxRadius * ((totalRings - r) / totalRings), 
                baseAngle: Math.random() * Math.PI,                  
                speed: 0.0012 + (r * 0.0004),    
                direction: Math.random() < 0.5 ? 1 : -1, // 1 = horario, -1 = antihorario
                activationLevel: 0             
            });
        }
    }

    // 🎯 EVENTO DE CLIC EN ANILLO: Invierte la dirección de rotación
    canvas.addEventListener('click', (e) => {
        if (!canvas.parentElement.parentElement.classList.contains('active')) return;

        const rect = canvas.getBoundingClientRect();
        const mX = e.clientX - rect.left;
        const mY = e.clientY - rect.top;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const distToCenter = Math.hypot(mX - centerX, mY - centerY);

        const tolerance = 40; // Rango de grosor de cada anillo
        
        ringsData.forEach((ring) => {
            if (Math.abs(distToCenter - ring.radius) < tolerance) {
                // Invertir sentido
                ring.direction *= -1;
                // Disparar efecto whoosh sutil
                audio.playWhooshSound();
            }
        });
    });

    function render() {
        if (canvas.width !== canvas.parentElement.clientWidth || canvas.height !== canvas.parentElement.clientHeight) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            setupRings(); 
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const distToCenter = Math.hypot(mouseX - centerX, mouseY - centerY);

        ringsData.forEach((ring, idx) => {
            const tolerance = 45; 
            const isMouseOverRing = Math.abs(distToCenter - ring.radius) < tolerance;

            let shouldBeActive = isMouseOverRing;
            if (idx > 0 && ringsData[idx - 1].activationLevel > 0.4) {
                shouldBeActive = true;
            }

            // Rotación activa multiplicada por la velocidad global
            if (shouldBeActive) {
                ring.activationLevel = Math.min(ring.activationLevel + 0.03, 1);
                ring.baseAngle += ring.speed * ring.direction * globalSpeedMultiplier; 
            } else {
                ring.activationLevel = Math.max(ring.activationLevel - 0.015, 0);
                if (ring.activationLevel > 0) {
                    ring.baseAngle += ring.speed * ring.activationLevel * ring.direction * globalSpeedMultiplier;
                }
            }

            const totalDots = Math.floor(ring.radius * 0.12); 

            for (let i = 0; i < totalDots; i++) {
                const angle = (i / totalDots) * Math.PI * 2 + ring.baseAngle;
                
                const posX = centerX + Math.cos(angle) * ring.radius;
                const posY = centerY + Math.sin(angle) * ring.radius;
                
                const dotRadius = 12 + (ring.radius * 0.018);

                ctx.beginPath();
                ctx.arc(posX, posY, dotRadius, 0, Math.PI * 2);

                if (ring.activationLevel > 0) {
                    const baseColor = polkupColors[(i + idx) % polkupColors.length];
                    
                    ctx.fillStyle = baseColor;
                    ctx.globalAlpha = ring.activationLevel;
                    ctx.fill();
                    
                    ctx.globalAlpha = 1 - ring.activationLevel;
                    ctx.fillStyle = '#f3f3f3'; 
                    ctx.fill();
                    ctx.globalAlpha = 1.0; 
                } else {
                    ctx.fillStyle = '#f3f3f3';
                    ctx.fill();
                }
            }
        });

        requestAnimationFrame(render);
    }
    
    setupRings();
    render();
}


/* ====================================================
   3. EXPERIMENTO: LLEGA A LA CIMA (Vórtice 3D y Victoria)
   ==================================================== */
let resetCimaGame = null; // Handler global para resetear el juego de la cima

function initCimaGame() {
    const canvas = document.getElementById('canvasCima');
    const ctx = canvas.getContext('2d');
    
    let mouseX = -1000;
    let mouseY = -1000;
    let mouseInCenter = false;
    let currentSpeed = 0;
    let isColorInverted = false;
    let lastClickedColor = '#D4AF37'; // Color de la bandera por defecto (dorado)
    
    // Estado de rotación 3D para la Cima
    let rotY = 0;
    let rotX = -0.15;
    let targetRotY = 0;
    let targetRotX = -0.15;

    // Estado del centro de proyección dinámico
    let projectionCenterX = canvas.width / 2;

    // Helper de proyección 3D
    function project3D(x, y, z, rx, ry) {
        // Rotar alrededor de Y
        let x1 = x * Math.cos(ry) - z * Math.sin(ry);
        let z1 = x * Math.sin(ry) + z * Math.cos(ry);
        
        // Rotar alrededor de X
        let y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
        let z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
        
        const d = 450;
        const f = d / (d + z2);
        return {
            x: projectionCenterX + x1 * f,
            y: (canvas.height / 2) + y2 * f,
            z: z2
        };
    }
    
    // Configuración de la mecánica de ascenso a la cima
    let clickedArchesCount = 0;
    const maxRequiredArches = 5;
    let isSummitReached = false;
    let victoryAnimationStage = 0; // 0 = normal, 1 = vortex, 2 = collapse, 3 = expand, 4 = summit
    let victoryTimer = 0;
    
    let stars = [];
    let summitCircles = [];
    let elements = [];
    const maxElements = 120; // Densidad ideal para el túnel

    // Detectamos si el cursor entra en la zona central de activación o interactúa en 3D
    window.addEventListener('mousemove', (e) => {
        if (!canvas.parentElement || !canvas.parentElement.parentElement.classList.contains('active')) return;
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        
        if (isSummitReached) return;
        
        const distToCenter = Math.hypot(mouseX - canvas.width / 2, mouseY - canvas.height / 2);
        
        // Zona de activación central (320px)
        mouseInCenter = distToCenter < 320;
    });

    document.addEventListener('mouseleave', () => {
        mouseInCenter = false;
        mouseX = -1000;
        mouseY = -1000;
    });

    // Captura de clics para la inversión de colores y progresión a la cima
    canvas.addEventListener('click', (e) => {
        if (!canvas.parentElement.parentElement.classList.contains('active') || isSummitReached) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Evaluar clic en círculos con borde negro/blanco (arcos)
        elements.forEach(el => {
            if (el.z < 500 && el.hasStroke && currentSpeed > 0.1) {
                const dist = Math.hypot(mouseX - el.screenX, mouseY - el.screenY);
                // Damos un rango extra de holgura para facilitar el clic en círculos móviles
                if (dist < el.screenRadius + 15) {
                    // Sonido whoosh
                    audio.playWhooshSound();
                    
                    // Invertir colores
                    isColorInverted = !isColorInverted;
                    
                    // Apagar el arco de esta partícula para que no sea clickable dos veces
                    el.hasStroke = false;
                    
                    // Guardar el último color clickeado
                    lastClickedColor = el.color;
                    
                    // Aumentar contador
                    if (clickedArchesCount < maxRequiredArches) {
                        clickedArchesCount++;
                        updateArchCounterUI();
                        
                        // Si se clickean 5, ¡se llega a la cima!
                        if (clickedArchesCount === maxRequiredArches) {
                            triggerReachSummit();
                        }
                    }
                }
            }
        });
    });

    // Conectar el botón de reinicio
    const restartBtn = document.getElementById('btn-restart-climb');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            resetCimaGame();
            const overlay = document.getElementById('summit-overlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
        });
    }

    // --- GENERACIÓN DE PARTÍCULAS POR TODA LA PANTALLA ---
    function generateParticles() {
        elements = [];
        for (let i = 0; i < maxElements; i++) {
            const ratio = i / maxElements;
            
            // Distribución uniforme por toda la pantalla (no en espiral)
            const angle = Math.random() * Math.PI * 2; 
            const spreadFactor = 35 + Math.random() * 480; 

            elements.push({
                angle: angle, 
                z: ratio * 600, 
                spread: spreadFactor,
                color: polkupColors[Math.floor(Math.random() * polkupColors.length)],
                hasStroke: Math.random() < 0.20, // 20% de círculos son arcos clickables
                screenX: 0,
                screenY: 0,
                screenRadius: 0
            });
        }
    }

    // Inicializar estrellas para la pantalla de victoria
    function generateStars() {
        stars = [];
        for (let i = 0; i < 90; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 0.5 + Math.random() * 1.8,
                alpha: Math.random(),
                speed: 0.01 + Math.random() * 0.02
            });
        }
    }

    function updateStars() {
        stars.forEach(s => {
            s.alpha += s.speed;
            if (s.alpha > 1 || s.alpha < 0.2) {
                s.speed = -s.speed;
            }
        });
    }

    function updateArchCounterUI() {
        for (let i = 0; i < maxRequiredArches; i++) {
            const slot = document.getElementById(`slot-${i}`);
            if (slot) {
                if (i < clickedArchesCount) {
                    slot.classList.add('active');
                } else {
                    slot.classList.remove('active');
                }
            }
        }
    }

    // --- SECUENCIA DE ARRIBO A LA CIMA ---
    function triggerReachSummit() {
        victoryAnimationStage = 1;
        victoryTimer = 0;
        mouseInCenter = false;
        
        // Inicializar ángulos de rotación 3D para el modelo de la cima
        targetRotX = -0.3;
        targetRotY = 0;
        rotX = -0.15; // Ángulo de inclinación inicial para la transición suave
        rotY = 0;
        
        // Guardar estado inicial de cada partícula para la transición fluida
        elements.forEach(el => {
            el.startAngle = el.angle;
            el.startSpread = el.spread;
            el.startZ = el.z;
        });
        
        // Detener viento gradualmente
        audio.stopWindSound();
        
        // Sonido de victoria celestial
        audio.playWhooshSound();
        audio.playSummitChord();
    }

    // --- RESETEAR EL JUEGO ---
    resetCimaGame = function() {
        isSummitReached = false;
        victoryAnimationStage = 0;
        victoryTimer = 0;
        clickedArchesCount = 0;
        isColorInverted = false;
        lastClickedColor = '#D4AF37'; // Resetear color de bandera por defecto
        currentSpeed = 0;
        mouseInCenter = false;
        summitCircles = [];
        updateArchCounterUI();
        
        // Resetear variables de rotación 3D y centro de proyección
        rotX = -0.15;
        rotY = 0;
        targetRotX = -0.15;
        targetRotY = 0;
        projectionCenterX = canvas.width / 2;
        
        canvas.style.filter = 'none'; // Limpiar filtros de victoria
        
        audio.stopSummitChord();
        audio.startWindSound();
        
        generateParticles();
        generateStars();
        
        const canvasContainer = canvas.parentElement.parentElement;
        canvasContainer.classList.remove('inverted-theme');
    };

    // --- RENDERIZADO DEL ESCENARIO DE LA CIMA ---
    function drawSummitScene(centerX, centerY) {
        // Fondo negro puro
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // --- DIBUJAR PLATO CIRCULAR DE LA CIMA (Círculo con orificio central) ---
        const plateX = centerX;
        const plateY = centerY + 40;
        const plateR = 55;
        const holeR = 12;

        // Gradiente metálico oscuro/grisáceo para el plato
        let plateGrad = ctx.createLinearGradient(plateX - plateR, plateY - plateR, plateX + plateR, plateY + plateR);
        plateGrad.addColorStop(0, '#55555c');
        plateGrad.addColorStop(0.3, '#3a3a40');
        plateGrad.addColorStop(0.7, '#222226');
        plateGrad.addColorStop(1, '#111113');

        // Dibujar borde externo con relieve
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(plateX, plateY, plateR + 3, 0, Math.PI * 2);
        ctx.fillStyle = '#8e8e98'; // Borde metálico claro
        ctx.fill();
        ctx.shadowBlur = 0;

        // Dibujar el plato principal
        ctx.beginPath();
        ctx.arc(plateX, plateY, plateR, 0, Math.PI * 2);
        ctx.fillStyle = plateGrad;
        ctx.fill();

        // Borde interior metálico fino
        ctx.strokeStyle = '#6a6a75';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dibujar el orificio central (lleno de negro puro para simular profundidad)
        ctx.beginPath();
        ctx.arc(plateX, plateY, holeR, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Rim del orificio (borde interior)
        ctx.strokeStyle = '#2d2d33';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // --- ANIMACIÓN Y DIBUJO DE LA BANDERA ---
        // La bandera aparece en el frame 60 y se inserta completamente en el frame 120
        let flagAlpha = 0;
        let flagY = centerY - 100; // Posición final Y del asta en la cima
        if (victoryTimer >= 60) {
            const flagT = Math.min(1, (victoryTimer - 60) / 60);
            const easeOutCubic = 1 - Math.pow(1 - flagT, 3);
            flagAlpha = flagT;
            // Desciende desde 120px arriba de su posición final
            flagY = (centerY + 30) - 120 * (1 - easeOutCubic);
        }

        if (flagAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = flagAlpha;

            // Asta de la bandera (pole)
            const poleBottomX = plateX;
            const poleBottomY = flagY;
            const poleTopY = flagY - 130;

            // Dibujar el asta
            let poleGrad = ctx.createLinearGradient(poleBottomX - 2, 0, poleBottomX + 2, 0);
            poleGrad.addColorStop(0, '#e0e0e0');
            poleGrad.addColorStop(0.5, '#ffffff');
            poleGrad.addColorStop(1, '#9e9e9e');

            ctx.lineWidth = 4;
            ctx.strokeStyle = poleGrad;
            ctx.beginPath();
            ctx.moveTo(poleBottomX, poleBottomY);
            ctx.lineTo(poleBottomX, poleTopY);
            ctx.stroke();

            // Pequeña esfera dorada en la punta del asta
            ctx.beginPath();
            ctx.arc(poleBottomX, poleTopY, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#D4AF37';
            ctx.fill();
            ctx.strokeStyle = '#855f05';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Dibujar la Bandera dorada ondeante
            const flagWidth = 55;
            const flagHeight = 40;
            const startY = poleTopY + 10;

            let flagColorStart, flagColorEnd;
            switch (lastClickedColor) {
                case '#EC2828': // Rojo
                    flagColorStart = '#ff5c5c';
                    flagColorEnd = '#9e1414';
                    break;
                case '#EDC217': // Amarillo
                    flagColorStart = '#FFFDD0';
                    flagColorEnd = '#AA7C11';
                    break;
                case '#3329ED': // Azul
                    flagColorStart = '#756cff';
                    flagColorEnd = '#1d13b3';
                    break;
                case '#0DB500': // Verde
                    flagColorStart = '#54e048';
                    flagColorEnd = '#077d00';
                    break;
                default: // Dorado/Oro por defecto
                    flagColorStart = '#FFFDD0';
                    flagColorEnd = '#AA7C11';
            }

            let dynamicGrad = ctx.createLinearGradient(poleBottomX, startY, poleBottomX + flagWidth, startY);
            dynamicGrad.addColorStop(0, flagColorStart);
            dynamicGrad.addColorStop(0.5, lastClickedColor);
            dynamicGrad.addColorStop(1, flagColorEnd);

            ctx.fillStyle = dynamicGrad;
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.moveTo(poleBottomX, startY);

            // Borde superior de la bandera (onda sinusoidal)
            const time = Date.now() * 0.006;
            for (let xOffset = 0; xOffset <= flagWidth; xOffset += 4) {
                const yWave = Math.sin(time + (xOffset * 0.08)) * 3.5;
                ctx.lineTo(poleBottomX + xOffset, startY + yWave);
            }

            // Borde derecho de la bandera
            const rightWave = Math.sin(time + (flagWidth * 0.08)) * 3.5;
            ctx.lineTo(poleBottomX + flagWidth, startY + flagHeight + rightWave);

            // Borde inferior de la bandera (onda sinusoidal de regreso al asta)
            for (let xOffset = flagWidth; xOffset >= 0; xOffset -= 4) {
                const yWave = Math.sin(time + (xOffset * 0.08)) * 3.5;
                ctx.lineTo(poleBottomX + xOffset, startY + flagHeight + yWave);
            }

            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Sombra/Brillo en la costura de la bandera
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(poleBottomX + 2, startY + 2);
            for (let xOffset = 2; xOffset <= flagWidth - 2; xOffset += 4) {
                const yWave = Math.sin(time + (xOffset * 0.08)) * 3.5;
                ctx.lineTo(poleBottomX + xOffset, startY + 2 + yWave);
            }
            ctx.stroke();

            ctx.restore();
        }
    }

    // --- CICLO RENDERIZADO PRINCIPAL ---
    function render() {
        if (canvas.width !== canvas.parentElement.clientWidth || canvas.height !== canvas.parentElement.clientHeight) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            generateParticles();
            generateStars();
        }

        // Si se llegó a la cima final, dibujamos el paisaje de la victoria en lugar del túnel
        if (victoryAnimationStage === 4) {
            victoryTimer++;

            // Mantener la animación centrada en la pantalla
            projectionCenterX = canvas.width / 2;

            // Rotación automática continua (auto-giro) más el control del mouse
            const baseSpin = (victoryTimer * 0.012);
            if (mouseX > 0) {
                targetRotY = baseSpin + ((mouseX / canvas.width) - 0.5) * 2.0;
                targetRotX = -0.3 + ((mouseY / canvas.height) - 0.5) * 0.8;
            } else {
                targetRotY = baseSpin;
                targetRotX = -0.3;
            }

            // Interpolación de rotación 3D suave (LERP)
            rotX += (targetRotX - rotX) * 0.06;
            rotY += (targetRotY - rotY) * 0.06;

            // Dibujar la escena pasándole el centro de proyección actual
            drawSummitScene(projectionCenterX, canvas.height / 2);

            // Activar el modal de felicitaciones recién en el frame 300 (~5 segundos)
            if (victoryTimer === 300) {
                const overlay = document.getElementById('summit-overlay');
                if (overlay) {
                    overlay.classList.add('active');
                }
            }

            requestAnimationFrame(render);
            return;
        }

        // Si estamos en medio de la transición cinematográfica de victoria
        if (victoryAnimationStage > 0) {
            victoryTimer++;
            
            let currentBgColor;
            if (victoryAnimationStage === 2) {
                // Durante la mezcla y aceleración rápida, usamos un fondo semi-translúcido para generar estelas (trails) de mezcla de color
                currentBgColor = isColorInverted ? 'rgba(26, 26, 26, 0.22)' : 'rgba(255, 255, 255, 0.22)';
            } else {
                currentBgColor = isColorInverted ? '#1a1a1a' : '#ffffff';
            }
            ctx.fillStyle = currentBgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            if (victoryAnimationStage === 1) {
                // FASE 1: CONSOLIDACIÓN EN EL CENTRO Y GIRO (3 segundos)
                const t = Math.min(1, victoryTimer / 180);
                const rotTime = (victoryTimer * 0.012); // Giro inicial lento y controlado
                
                // Función de easing cubic ease-in-out para una aceleración/desaceleración súper fluida
                const easeInOutCubic = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                
                // Asegurar interpolación a la orientación base de la torre
                rotX += (targetRotX - rotX) * 0.06;
                rotY += (targetRotY - rotY) * 0.06;

                elements.forEach((el, index) => {
                    const colorIdx = polkupColors.indexOf(el.color);
                    
                    // Posicionamos los grupos en el centro de la pantalla
                    const baseAngle = -3 * Math.PI / 4 + colorIdx * (Math.PI / 2);
                    const targetAngle = baseAngle + rotTime;
                    const targetRadius = 20; // Giro concentrado en el centro
                    
                    if (el.startAngle === undefined) el.startAngle = el.angle;
                    if (el.startSpread === undefined) el.startSpread = el.spread;
                    if (el.startZ === undefined) el.startZ = el.z;
                    
                    const spinAngle = el.startAngle + rotTime;
                    
                    el.angle = spinAngle * (1 - easeInOutCubic) + targetAngle * easeInOutCubic;
                    el.spread = el.startSpread * (1 - easeInOutCubic) + targetRadius * easeInOutCubic;
                    el.z = el.startZ * (1 - easeInOutCubic) + 200 * easeInOutCubic;
                    
                    const perspectiveFactor = 200 / Math.max(1, el.z);
                    el.screenX = centerX + Math.cos(el.angle) * el.spread * perspectiveFactor;
                    el.screenY = centerY + Math.sin(el.angle) * el.spread * perspectiveFactor;
                    
                    const originalRadius = Math.max(1, (600 - el.z) * 0.042 * perspectiveFactor);
                    const currentRadius = originalRadius * (1 - t) + 28 * t;
                    
                    ctx.beginPath();
                    ctx.arc(el.screenX, el.screenY, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = el.color; // Sin bordes ni contornos
                    ctx.fill();
                });
                
                if (victoryTimer >= 180) {
                    victoryAnimationStage = 2;
                    victoryTimer = 0;
                }
            }
            else if (victoryAnimationStage === 2) {
                // FASE 2: COLAPSO Y MEZCLA RÁPIDA EN EL CENTRO (2.5 segundos)
                const t = Math.min(1, victoryTimer / 150);
                
                if (t < 0.45) {
                    canvas.style.filter = 'url(#polkup-gooey)';
                } else if (t < 0.90) {
                    const blurAmount = ((t - 0.45) / 0.45) * 16; // De 0px a 16px de blur
                    canvas.style.filter = `blur(${blurAmount}px)`;
                } else {
                    canvas.style.filter = 'none';
                }
                
                const currCenterX = centerX;
                const currCenterY = centerY;
                
                rotX += (targetRotX - rotX) * 0.06;
                rotY += (targetRotY - rotY) * 0.06;

                elements.forEach((el, index) => {
                    el.angle += 0.05 + t * 0.28; 
                    el.spread *= 0.955; // Se contraen hacia el centro
                    el.z = el.z * (1 - 0.05) + 200 * 0.05;
                    
                    const perspectiveFactor = 200 / Math.max(1, el.z);
                    el.screenX = currCenterX + Math.cos(el.angle) * el.spread * perspectiveFactor;
                    el.screenY = currCenterY + Math.sin(el.angle) * el.spread * perspectiveFactor;
                    
                    const currentRadius = 28 * (1 - t * 0.3);
                    
                    ctx.beginPath();
                    ctx.arc(el.screenX, el.screenY, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = el.color;
                    ctx.fill();
                });
                
                if (victoryTimer >= 150) {
                    canvas.style.filter = 'none';
                    victoryAnimationStage = 3;
                    victoryTimer = 0;
                }
            }
            else if (victoryAnimationStage === 3) {
                // FASE 3: EL CÍRCULO NEGRO (#000000) SE EXPANDE FLUIDAMENTE A TODA LA PANTALLA (1.5s)
                const t = victoryTimer / 90; 
                const maxRadius = Math.hypot(canvas.width, canvas.height);
                const currentRadius = 15 + Math.pow(t, 3.5) * maxRadius;
                
                rotX += (targetRotX - rotX) * 0.06;
                rotY += (targetRotY - rotY) * 0.06;

                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
                ctx.fill();
                
                if (victoryTimer >= 90) {
                    victoryAnimationStage = 4;
                    victoryTimer = 0;
                    isSummitReached = true;
                }
            }
            
            requestAnimationFrame(render);
            return;
        }

        // Colores adaptativos según inversión
        const currentBgColor = isColorInverted ? '#1a1a1a' : '#ffffff';
        const currentOffColor = isColorInverted ? '#333333' : '#e0e0e0';
        const currentStrokeColor = isColorInverted ? '#ffffff' : '#1a1a1a';
        
        // Pasar el estado de inversión de color al contenedor para invertir controles HTML
        const canvasContainer = canvas.parentElement.parentElement;
        if (isColorInverted) {
            canvasContainer.classList.add('inverted-theme');
        } else {
            canvasContainer.classList.remove('inverted-theme');
        }

        ctx.fillStyle = currentBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        // La velocidad mínima (avance base) y máxima (acelerada) aumentan dinámicamente
        // con cada arco clickeado, elevando la dificultad de forma progresiva.
        const maxSpeedLimit = 0.45 + clickedArchesCount * 0.35; // Rango: 0.45 (fácil) a 1.85 (difícil)
        const minSpeedLimit = 0.05 + clickedArchesCount * 0.03; // Rango: 0.05 a 0.17 de avance base
        
        if (mouseInCenter) {
            currentSpeed = Math.min(currentSpeed + 0.035, maxSpeedLimit);
        } else {
            currentSpeed = Math.max(currentSpeed - 0.045, minSpeedLimit);
        }
        // Actualizar sonido del viento según velocidad
        if (currentActiveScreen === 'screen-cima') {
            audio.updateWind(currentSpeed);
        }

        // Ordenamiento por profundidad Z
        elements.sort((a, b) => b.z - a.z);

        elements.forEach(el => {
            el.z -= currentSpeed;

            // Reinicio de partícula al pasar el frente de la cámara
            if (el.z <= 0) {
                // Añadimos una variación aleatoria en Z y regeneramos spread/ángulo
                // para mantenerlas bien distribuidas y evitar oleadas o clusters.
                el.z = 600 + Math.random() * 40;
                el.angle = Math.random() * Math.PI * 2;
                el.spread = 35 + Math.random() * 480;
                el.hasStroke = Math.random() < 0.20;
            }

            const perspectiveFactor = 200 / el.z;
            el.screenX = centerX + Math.cos(el.angle) * el.spread * perspectiveFactor;
            el.screenY = centerY + Math.sin(el.angle) * el.spread * perspectiveFactor;
            el.screenRadius = Math.max(1, (600 - el.z) * 0.042 * perspectiveFactor);

            // Dibujar círculos en el túnel
            if (el.z > 2) {
                // Suavizar desaparición al pasar muy cerca del espectador
                let opacity = 1.0;
                if (el.z < 60) {
                    opacity = (el.z - 2) / 58;
                }
                
                let currentRadius = el.screenRadius;
                
                // Si el cursor pasa por encima de un círculo con arco negro, su tamaño crece y su opacidad disminuye un poco
                if (el.hasStroke && currentSpeed > 0.1 && mouseX > 0) {
                    const distToMouse = Math.hypot(mouseX - el.screenX, mouseY - el.screenY);
                    if (distToMouse < el.screenRadius + 15) {
                        opacity *= 0.80; // Se vuelve solo un poco transparente (80% opacidad)
                        currentRadius *= 1.35; // Crece de tamaño un 35%
                    }
                }
                
                ctx.beginPath();
                ctx.arc(el.screenX, el.screenY, currentRadius, 0, Math.PI * 2);
                
                ctx.globalAlpha = Math.max(0, opacity);
                ctx.fillStyle = currentSpeed > 0.1 ? el.color : currentOffColor;
                ctx.fill();

                // Dibujar arco de contorno especial (clickable) con tamaño interactivo
                if (el.hasStroke && currentSpeed > 0.1) {
                    ctx.lineWidth = Math.max(1.5, currentRadius * 0.18);
                    ctx.strokeStyle = currentStrokeColor; 
                    ctx.stroke();
                }
                
                ctx.globalAlpha = 1.0; // Reset
                
                // Disparar sonido whoosh sutil para círculos rápidos que rozan la pantalla
                if (el.z < 8 && currentSpeed > 1.2 && Math.random() < 0.015) {
                    audio.playWhooshSound();
                }
            }
        });

        requestAnimationFrame(render);
    }
    
    generateParticles();
    generateStars();
    render();
}