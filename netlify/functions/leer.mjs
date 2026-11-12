// =====================================================================
//  LECTOR PROPIO DE RESPALDO  →  responde en  /api/leer?url=<link del producto>
//
//  ¿Para qué sirve? Algunas tiendas (por ejemplo Ripley) no se dejan leer
//  con los lectores que la página puede llamar directo desde el celular.
//  Este archivo corre en los servidores de Netlify, le pide el texto de la
//  página al servicio público markdown.new y se lo devuelve a la app.
//
//  Netlify lo activa solo, sin configurar nada, cuando el sitio está
//  conectado a GitHub. Si publicas la app de otra forma, simplemente no
//  existe y la app sigue funcionando con los otros lectores.
//
//  Solo recibe el link del producto. Nunca recibe sueldos ni datos de nadie.
// =====================================================================

const responder = (estado, texto) =>
  new Response(texto, { status: estado, headers: { 'content-type': 'text/plain; charset=utf-8' } });

export default async (req) => {
  const pedido = new URL(req.url);

  // Solo aceptamos llamadas hechas desde esta misma página (no somos un lector abierto para otros sitios)
  const sitio = req.headers.get('sec-fetch-site');
  if (sitio && sitio !== 'same-origin') return responder(403, 'Solo para esta página');
  const origen = req.headers.get('origin');
  if (origen && new URL(origen).host !== pedido.host) return responder(403, 'Solo para esta página');

  // Revisamos que sea un link normal de internet
  let destino;
  try { destino = new URL(pedido.searchParams.get('url') || ''); } catch (e) { return responder(400, 'Link inválido'); }
  const host = destino.hostname;
  const esLinkPublico = /^https?:$/.test(destino.protocol) && host.includes('.') && !/^[\d.]+$/.test(host) && !host.includes(':') && destino.href.length < 2000;
  if (!esLinkPublico) return responder(400, 'Link inválido');

  try {
    const r = await fetch('https://markdown.new/' + destino.href, { signal: AbortSignal.timeout(9500) });
    if (!r.ok) return responder(502, 'La tienda no se pudo leer');
    const texto = (await r.text()).slice(0, 150000);
    return new Response(texto, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
    });
  } catch (e) {
    return responder(504, 'La tienda se demoró demasiado');
  }
};

// Con esto la función responde en /api/leer (en vez de /.netlify/functions/leer)
export const config = { path: '/api/leer' };
