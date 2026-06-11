// Paleta de colores PolkUp
const polkupColors = ['#EC2828', '#EDC217', '#3329ED', '#0DB500'];

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initAnclaGame();
    initRotaGame();
    initCimaGame();
});

/* ====================================================
   MÓDULO DE NAVEGACIÓN ENTRE PANTALLAS (SPA)
   ==================================================== */
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
}

function switchScreen(screenId) {
    document.querySelectorAll('.experimental-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if(targetScreen) {
        targetScreen.classList.add('active');
        // Forzar recalibración de tamaño de los canvas al aparecer
        window.dispatchEvent(new Event('resize'));
    }
}


/* ====================================================
   1. EXPERIMENTO: ANCLA (Radar Elástico Activado por Clic)
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

    // 🎯 REINTEGRAMOS EL EVENTO DE CLIC: Evalúa si tocas el objetivo revelado
    canvas.addEventListener('click', (e) => {
        if (!canvas.parentElement.parentElement.classList.contains('active')) return;
        
        const rect = canvas.getBoundingClientRect();
        const mX = e.clientX - rect.left;
        const mY = e.clientY - rect.top;

        const targetHiddenNode = nodes[nextNodeIndex];

        if (targetHiddenNode) {
            // Calculamos la distancia entre el clic del mouse y el círculo objetivo
            const distToTarget = Math.hypot(mX - targetHiddenNode.x, mY - targetHiddenNode.y);
            
            // Si haces clic exactamente dentro de su rango
            if (distToTarget < targetHiddenNode.r) {
                let activeNode = nodes.find(n => n.active);
                if (activeNode) {
                    activeNode.active = false; // Apaga el viejo
                    activeNode.currentX = activeNode.x; 
                    activeNode.currentY = activeNode.y;
                }
                
                // Enciende el nuevo y calcula el siguiente en la cola
                targetHiddenNode.active = true;
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
                    
                    // 🧭 LÍNEA 2: Brújula guía hacia el objetivo oculto
                    if (targetHiddenNode) {
                        const distMouseToTarget = Math.hypot(mouseX - targetHiddenNode.x, mouseY - targetHiddenNode.y);
                        
                        ctx.beginPath();
                        ctx.moveTo(mouseX, mouseY);
                        ctx.lineTo(targetHiddenNode.x, targetHiddenNode.y);
                        ctx.lineWidth = 1.8;
                        
                        const alphaLine2 = Math.max(0.05, 1 - (distMouseToTarget / 500));
                        ctx.strokeStyle = `rgba(60, 60, 60, ${alphaLine2})`;
                        ctx.setLineDash([3, 4]); 
                        ctx.stroke();
                    }
                    ctx.setLineDash([]); 
                    
                } else {
                    node.currentX += (node.x - node.currentX) * 0.12;
                    node.currentY += (node.y - node.currentY) * 0.12;
                }

                // Dibujar círculo activo
                ctx.beginPath();
                ctx.arc(node.currentX, node.currentY, node.r, 0, Math.PI * 2);
                ctx.fillStyle = node.color;
                ctx.fill(); 
                
            } else {
                // ---- REVELACIÓN POR PROXIMIDAD ----
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
                } else {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0)'; 
                    ctx.fill();
                }
            }
        });

        requestAnimationFrame(render);
    }
    generateNodes();
    render();
}
/* ====================================================
   2. EXPERIMENTO: ROTA (Círculos grandes y giro lento)
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

    const totalRings = 8; // Ajustamos a 8 anillos para dar espacio a los círculos más grandes
    let ringsData = [];

    function setupRings() {
        ringsData = [];
        // Calculamos la diagonal adaptativa
        const maxRadius = Math.max(canvas.width, canvas.height) * 0.65; 
        
        for (let r = 0; r < totalRings; r++) {
            ringsData.push({
                radius: maxRadius * ((totalRings - r) / totalRings), 
                baseAngle: Math.random() * Math.PI,                  
                // 🐢 VELOCIDAD REDUCIDA: Giro mucho más lento, constante y suave
                speed: 0.0015 + (r * 0.0005),    
                activationLevel: 0             
            });
        }
    }

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
            // Tolerancia adaptada al nuevo grosor de los anillos
            const tolerance = 45; 
            const isMouseOverRing = Math.abs(distToCenter - ring.radius) < tolerance;

            let shouldBeActive = isMouseOverRing;
            if (idx > 0 && ringsData[idx - 1].activationLevel > 0.4) {
                shouldBeActive = true;
            }

            // Transiciones elásticas suaves para el encendido
            if (shouldBeActive) {
                ring.activationLevel = Math.min(ring.activationLevel + 0.03, 1);
                ring.baseAngle += ring.speed; 
            } else {
                ring.activationLevel = Math.max(ring.activationLevel - 0.015, 0);
                if (ring.activationLevel > 0) {
                    ring.baseAngle += ring.speed * ring.activationLevel;
                }
            }

            // Reducimos levemente la cantidad de círculos para que al ser más grandes no se encimen
            const totalDots = Math.floor(ring.radius * 0.12); 

            for (let i = 0; i < totalDots; i++) {
                const angle = (i / totalDots) * Math.PI * 2 + ring.baseAngle;
                
                const posX = centerX + Math.cos(angle) * ring.radius;
                const posY = centerY + Math.sin(angle) * ring.radius;
                
                // 🔴 MÁS GRANDES: Aumentamos drásticamente el radio de cada círculo flotante
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
   3. EXPERIMENTO: LLEGA A LA CIMA (Túnel 3D Calibrado)
   ==================================================== */
function initCimaGame() {
    const canvas = document.getElementById('canvasCima');
    const ctx = canvas.getContext('2d');
    
    let mouseInCenter = false;
    let currentSpeed = 0;
    
    // Control del estado de inversión de color (false = Blanco, true = Gris #333333)
    let isColorInverted = false;

    // Detectamos si el cursor entra en la zona central de activación
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const distToCenter = Math.hypot(mouseX - canvas.width / 2, mouseY - canvas.height / 2);
        
        // Se activa al estar en un rango de 300px del centro
        mouseInCenter = distToCenter < 300;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseInCenter = false;
    });

    // Captura de clics para la mecánica de inversión de color
    canvas.addEventListener('click', (e) => {
        // Solo procesar si la pantalla correspondiente está activa
        if (!canvas.parentElement.parentElement.classList.contains('active')) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Verificar si el usuario clickeó un círculo con contorno especial
        elements.forEach(el => {
            if (el.z < 500 && el.hasStroke && currentSpeed > 0.1) {
                const dist = Math.hypot(mouseX - el.screenX, mouseY - el.screenY);
                if (dist < el.screenRadius) {
                    // Inversión mágica de color
                    isColorInverted = !isColorInverted;
                }
            }
        });
    });

    let elements = [];
    const maxElements = 130; // Densidad ideal para conservar la sensación de espacio

    // Generación inicial de la colección de partículas
    function generateParticles() {
        elements = [];
        for (let i = 0; i < maxElements; i++) {
            // Distribución: 15% al centro, 85% al túnel exterior expandido
            const isCentral = Math.random() < 0.15; 
            
            // 🌟 MÁS SEPARADOS EN EL CENTRO: Ajustamos el spread central para que inicien entre 30px y 120px,
            // evitando que nazcan todos pegados en el mismo punto exacto (0,0).
            const spreadFactor = isCentral ? 30 + Math.random() * 90 : 350 + Math.random() * 120;

            elements.push({
                angle: Math.random() * Math.PI * 2,
                z: Math.random() * 600, // Profundidad virtual Z
                spread: spreadFactor,
                color: polkupColors[Math.floor(Math.random() * polkupColors.length)],
                hasStroke: Math.random() < 0.25, // 25% de probabilidad de tener anillo interactivo
                screenX: 0,
                screenY: 0,
                screenRadius: 0
            });
        }
    }

    // Ciclo de renderizado principal
    function render() {
        if (canvas.width !== canvas.parentElement.clientWidth || canvas.height !== canvas.parentElement.clientHeight) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            generateParticles();
        }

        // Colores adaptativos según el estado de la inversión
        const currentBgColor = isColorInverted ? '#333333' : '#ffffff';
        const currentOffColor = isColorInverted ? '#444444' : '#e0e0e0';
        
        // 🌟 COLOR DE ARCO DINÁMICO: Si el fondo es oscuro, el arco se vuelve BLANCO. Si es blanco, pasa a OSCURO.
        const currentStrokeColor = isColorInverted ? '#ffffff' : '#333333';
        
        ctx.fillStyle = currentBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Velocidad máxima reducida a 1.5 para un viaje suave y controlado
        if (mouseInCenter) {
            currentSpeed = Math.min(currentSpeed + 0.04, 1.5);
        } else {
            currentSpeed = Math.max(currentSpeed - 0.05, 0);
        }

        // Ordenamiento por profundidad (Z-indexing)
        elements.sort((a, b) => b.z - a.z);

        elements.forEach(el => {
            el.z -= currentSpeed; // Avance hacia la pantalla

            // Reinicio de partícula al llegar al frente de la cámara
            if (el.z <= 0) {
                el.z = 600;
                el.angle = Math.random() * Math.PI * 2;
                el.hasStroke = Math.random() < 0.25;
                
                const isCentral = Math.random() < 0.15;
                // Mantenemos la nueva separación en el centro al regenerarse
                el.spread = isCentral ? 30 + Math.random() * 90 : 350 + Math.random() * 120;
            }

            // Transformación de coordenadas 3D a la pantalla 2D
            const perspectiveFactor = 200 / el.z;
            
            el.screenX = centerX + Math.cos(el.angle) * el.spread * perspectiveFactor;
            el.screenY = centerY + Math.sin(el.angle) * el.spread * perspectiveFactor;
            el.screenRadius = Math.max(1, (600 - el.z) * 0.045 * perspectiveFactor);

            // Dibujar solo si no se ha salido del rango visual de la cámara
            if (el.z > 15) {
                ctx.beginPath();
                ctx.arc(el.screenX, el.screenY, el.screenRadius, 0, Math.PI * 2);
                
                // Si avanza toma su color Polkup, si frena se apaga en el gris correspondiente
                ctx.fillStyle = currentSpeed > 0.1 ? el.color : currentOffColor;
                ctx.fill();

                // Pintar el anillo especial con el color adaptativo calculado arriba
                if (el.hasStroke && currentSpeed > 0.1) {
                    ctx.lineWidth = Math.max(1.5, el.screenRadius * 0.18);
                    ctx.strokeStyle = currentStrokeColor; // Usa #ffffff o #333333 dinámicamente
                    ctx.stroke();
                }
            }
        });

        requestAnimationFrame(render);
    }
    
    generateParticles();
    render();
}