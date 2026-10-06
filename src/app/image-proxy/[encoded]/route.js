const ALLOWED_HOSTS = new Set(['oss-resource.farlightgames.com']);

function decodeTarget(encoded) {
  const value = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export async function GET(_request, { params }) {
  const target = decodeTarget((await params).encoded);
  let url;
  try {
    url = new URL(target);
  } catch {
    return new Response('Invalid image URL', { status: 400 });
  }

  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    return new Response('Image host is not allowed', { status: 403 });
  }

  let upstream;
  try {
    upstream = await fetch(url, { cache: 'no-store' });
  } catch {
    return new Response('Image unavailable', { status: 502 });
  }
  if (!upstream.ok) return new Response('Image unavailable', { status: upstream.status });

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
    },
  });
}
