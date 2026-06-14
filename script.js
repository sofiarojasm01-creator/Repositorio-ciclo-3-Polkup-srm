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

/* ====================================================
   MOTOR INTERACTIVO DE MINIATURAS (CORREGIDO)
   ==================================================== */
function initThumbnailGallery() {
    const thumbnails = document.querySelectorAll('.thumb-item');
    const mainImg = document.getElementById('activeLargeImg');
    const mainCaption = document.getElementById('activeCaption');

    // Validación para evitar errores si no encuentra los elementos
    if (thumbnails.length === 0 || !mainImg || !mainCaption) return;

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            // 1. Quitamos la clase 'active' de la miniatura anterior
            document.querySelector('.thumb-item.active')?.classList.remove('active');

            // 2. Le ponemos la clase 'active' a la miniatura que tocamos
            thumb.classList.add('active');

            // Extraemos los datos del atributo data-
            const newSrc = thumb.getAttribute('data-large');
            const newCaption = thumb.getAttribute('data-caption');

            // 3. Cambiamos la imagen grande y el texto con un pestañeo suave
            mainImg.style.opacity = '0';
            
            setTimeout(() => {
                mainImg.src = newSrc;
                mainCaption.textContent = newCaption;
                mainImg.style.opacity = '1';
            }, 200); // 200 milisegundos de transición
        });
    });
}

/* ====================================================
   ACTIVADOR DE FUNCIONES (¡AQUÍ ESTABA EL ERROR!)
   ==================================================== */
// Esperamos a que todo el HTML de la página esté cargado para encender la galería
document.addEventListener('DOMContentLoaded', () => {
    initThumbnailGallery();
});