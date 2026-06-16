// Proxy para Canvas LMS — evita CORS en el navegador
export async function GET(request, { params }) {
  return proxyCanvas(request, params, 'GET')
}
export async function POST(request, { params }) {
  return proxyCanvas(request, params, 'POST')
}

async function proxyCanvas(request, params, method) {
  const canvasUrl = request.headers.get('x-canvas-url')
  const token     = request.headers.get('x-canvas-token')

  if (!canvasUrl || !token) {
    return Response.json({ error: 'Missing Canvas credentials' }, { status: 400 })
  }

  const pathParts = (await params).path ?? []
  const path      = pathParts.join('/')
  const search    = new URL(request.url).search
  const target    = `${canvasUrl.replace(/\/$/, '')}/${path}${search}`

  try {
    const upstream = await fetch(target, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      ...(method === 'POST' ? { body: await request.text() } : {}),
    })

    const data = await upstream.json()
    return Response.json(data, { status: upstream.status })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
