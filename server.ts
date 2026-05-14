function listenPort(): number {
  try {
    const p = Deno.env.get('PORT');
    return p ? Number(p) : 8080;
  } catch {
    return 8080;
  }
}

const PORT = listenPort();
const PUBLIC_DIR = new URL('./public/', import.meta.url);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonld': 'application/ld+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function ext(pathname: string): string {
  const i = pathname.lastIndexOf('.');
  return i >= 0 ? pathname.slice(i) : '';
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const rel = pathname.replace(/^\/+/, '');
  const fileUrl = new URL(rel, PUBLIC_DIR);

  const rootPath = new URL('./', PUBLIC_DIR).pathname;
  if (!fileUrl.pathname.startsWith(rootPath)) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const data = await Deno.readFile(fileUrl);
    const type = MIME[ext(fileUrl.pathname)] ?? 'application/octet-stream';
    return new Response(data, {
      headers: {
        'content-type': type,
        'cache-control': 'no-cache',
      },
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
});

console.log(`Serving ./public at http://127.0.0.1:${PORT}/`);
