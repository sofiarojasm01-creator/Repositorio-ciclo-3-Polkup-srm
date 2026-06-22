// Seleccionamos todos los círculos del encabezado
const circles = document.querySelectorAll('.circle');

// Escuchamos el scroll de la página para el Parallax
window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;

    // Recorremos los 10 círculos y les damos una velocidad diferente en base a su posición
    circles.forEach((circle, index) => {
        // Genera un multiplicador de velocidad dinámico (ej: -0.05, -0.10, -0.15...)
        const speed = (index + 1) * -0.05; 
        
        // Aplicamos el movimiento vertical suave
        circle.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// --- EFECTO DE APARICIÓN AL HACER SCROLL (SCROLL REVEAL) ---
document.addEventListener('DOMContentLoaded', () => {
    const revealElements = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');

                // Si el elemento es el texto arcoíris, iniciamos la secuencia
                if (entry.target.classList.contains('rainbow-text')) {
                    startRainbowSequence();
                }

                // Dejamos de observar una vez revelado para optimizar rendimiento
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15, // Se activa cuando el 15% del elemento entra en pantalla
        rootMargin: '0px 0px -50px 0px' // Offset para dispararse de manera natural
    });

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });

    // --- EFECTO DE SEGUIMIENTO DEL MOUSE PARA EL BOTÓN PERSONALIZADO (LUPA INTERNA) ---
    const customBtn = document.querySelector('.custom-interactive-btn');
    if (customBtn) {
        const glow = customBtn.querySelector('.btn-inner-glow');
        customBtn.addEventListener('mousemove', (e) => {
            const rect = customBtn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            glow.style.left = `${x}px`;
            glow.style.top = `${y}px`;
        });
        
        // Resetear al centro al salir del botón
        customBtn.addEventListener('mouseleave', () => {
            glow.style.left = '50%';
            glow.style.top = '50%';
        });
    }
});

// --- SECUENCIA DE SALTO ARCOÍRIS CON RETARDO DE 5 SEGUNDOS ---
function startRainbowSequence() {
    const spans = document.querySelectorAll('.rainbow-text span');
    const delayBetweenLetters = 70; // Tiempo en ms entre el salto de cada letra
    const animationDuration = 800;  // Duración de la animación CSS (0.8s) en ms
    const pauseDuration = 5000;     // Pausa de 5 segundos al final de la cadena

    spans.forEach((span, index) => {
        setTimeout(() => {
            span.classList.add('jump-color');
            // Removemos la clase después de terminar la animación individual
            setTimeout(() => {
                span.classList.remove('jump-color');
            }, animationDuration);
        }, index * delayBetweenLetters);
    });

    // Tiempo total que toma completar toda la secuencia de la frase
    const totalSequenceDuration = (spans.length * delayBetweenLetters) + animationDuration;

    // Volver a llamar a la secuencia después de completar la frase + 5 segundos
    setTimeout(startRainbowSequence, totalSequenceDuration + pauseDuration);
}


