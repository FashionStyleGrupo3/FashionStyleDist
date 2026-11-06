<script setup>
// Pie de página de la tienda: contacto, redes sociales y enlaces útiles.
// Los enlaces de redes se configuran en el .env (VITE_INSTAGRAM_URL, VITE_TIKTOK_URL,
// VITE_WHATSAPP_NUMERO) para no tocar código si cambian las cuentas.
import { RouterLink } from 'vue-router';
import { Clock, Instagram, Mail, MapPin, MessageCircle } from 'lucide-vue-next';

const CORREO = import.meta.env.VITE_CORREO_SOPORTE || 'soporte.fashionstyle@gmail.com';
const INSTAGRAM = import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/fashionstyle';
const TIKTOK = import.meta.env.VITE_TIKTOK_URL || 'https://www.tiktok.com/@fashionstyle';
const WHATSAPP_NUMERO = String(import.meta.env.VITE_WHATSAPP_NUMERO || '573001234567').replace(/\D/g, '');
const WHATSAPP = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent('Hola FashionStyle, quiero más información.')}`;
const WHATSAPP_VISIBLE = WHATSAPP_NUMERO.replace(/^57(\d{3})(\d{3})(\d{4})$/, '+57 $1 $2 $3');

const anio = new Date().getFullYear();
</script>

<template>
  <footer class="fs-footer pie">
    <div class="fs-contenedor pie__grid">
      <section>
        <p class="pie__marca">FashionStyle</p>
        <p class="pie__texto">Moda confeccionada con calidad, con envíos a todo el país y pagos seguros con Wompi.</p>
      </section>

      <section>
        <h2 class="pie__titulo">Contáctanos</h2>
        <ul class="pie__lista">
          <li><Mail class="pie__icono" /><a :href="`mailto:${CORREO}`">{{ CORREO }}</a></li>
          <li><MessageCircle class="pie__icono" /><a :href="WHATSAPP" target="_blank" rel="noopener noreferrer">WhatsApp {{ WHATSAPP_VISIBLE }}</a></li>
          <li><MapPin class="pie__icono" /><RouterLink :to="{ name: 'contacto' }">Tienda física y cómo llegar</RouterLink></li>
          <li><Clock class="pie__icono" /><span>Lunes a sábado, 9:00 a. m. – 7:00 p. m.</span></li>
        </ul>
      </section>

      <section>
        <h2 class="pie__titulo">Ayuda</h2>
        <ul class="pie__lista">
          <li><RouterLink :to="{ name: 'contacto' }">Peticiones, quejas y reclamos (PQRS)</RouterLink></li>
          <li><RouterLink :to="{ name: 'contacto', query: { consulta: '1' } }">Consultar mi PQRS</RouterLink></li>
          <li><RouterLink :to="{ name: 'catalogo' }">Catálogo</RouterLink></li>
          <li><RouterLink to="/terminos">Términos y condiciones</RouterLink></li>
        </ul>
      </section>

      <section>
        <h2 class="pie__titulo">Síguenos</h2>
        <div class="pie__redes">
          <a :href="INSTAGRAM" target="_blank" rel="noopener noreferrer" aria-label="Instagram de FashionStyle" title="Instagram">
            <Instagram class="h-5 w-5" />
          </a>
          <a :href="TIKTOK" target="_blank" rel="noopener noreferrer" aria-label="TikTok de FashionStyle" title="TikTok">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.6c.27 0 .53.04.78.12V9.77a5.68 5.68 0 1 0 4.9 5.63V9.01a7.34 7.34 0 0 0 4.29 1.38V7.3a4.29 4.29 0 0 1-3.23-1.48Z" />
            </svg>
          </a>
          <a :href="WHATSAPP" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de FashionStyle" title="WhatsApp">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2a9.9 9.9 0 0 0-8.46 15.05L2 22l5.08-1.53A9.9 9.9 0 1 0 12.04 2Zm0 18.05a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.02.9.92-2.94-.2-.31a8.13 8.13 0 1 1 6.73 3.66Zm4.46-6.08c-.24-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.66 6.66 0 0 1-1.96-1.21 7.38 7.38 0 0 1-1.36-1.69c-.14-.24 0-.37.11-.49.11-.11.24-.29.36-.43.12-.15.16-.25.24-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.31 2.75 2.75 0 0 0-.86 2.04c0 1.2.88 2.37 1 2.53.12.17 1.73 2.64 4.2 3.7.58.26 1.04.41 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.45-.6 1.66-1.17.2-.57.2-1.06.14-1.17-.06-.1-.22-.16-.46-.28Z" />
            </svg>
          </a>
        </div>
      </section>
    </div>

    <div class="pie__legal">
      <div class="fs-contenedor">
        <span>© {{ anio }} FashionStyle · Todos los derechos reservados</span>
        <span><a :href="`mailto:${CORREO}`">{{ CORREO }}</a></span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.pie { padding-top: 36px; }

.pie__grid {
  display: grid;
  grid-template-columns: 1.3fr 1.3fr 1fr 0.8fr;
  gap: 28px;
  padding-bottom: 28px;
}

.pie__marca { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.04em; color: var(--fs-negro); }
.pie__texto { margin: 10px 0 0; max-width: 300px; color: var(--fs-texto); line-height: 1.6; }
.pie__titulo { margin: 0 0 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--fs-negro); }
.pie__lista { display: flex; flex-direction: column; gap: 9px; margin: 0; padding: 0; list-style: none; }
.pie__lista li { display: flex; align-items: flex-start; gap: 8px; }
.pie__icono { width: 16px; height: 16px; margin-top: 2px; flex-shrink: 0; color: var(--fs-pizarra); }
.pie__lista a { overflow-wrap: anywhere; }

.pie__redes { display: flex; gap: 10px; }
.pie__redes a {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--fs-negro);
  border-radius: 999px;
  color: var(--fs-negro);
  transition: background-color 0.15s ease, color 0.15s ease;
}
.pie__redes a:hover { background: var(--fs-negro); color: var(--fs-blanco); text-decoration: none; }

.pie__legal { border-top: 1px solid var(--fs-arena-oscura); font-size: 13px; }
.pie__legal .fs-contenedor { padding-top: 14px; padding-bottom: 14px; }

@media (max-width: 900px) {
  .pie__grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 560px) {
  .pie__grid { grid-template-columns: 1fr; }
}
</style>
