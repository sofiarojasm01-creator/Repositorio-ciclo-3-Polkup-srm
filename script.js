// Seleccionamos todos los círculos del encabezado
const circles = document.querySelectorAll('.circle');

// Escuchamos el scroll de la página
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