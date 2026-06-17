export async function POST(request) {
  try {
    const { messages, materia } = await request.json()

    if (!messages?.length) {
      return Response.json({ error: 'No hay mensajes para procesar.' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'GEMINI_API_KEY no configurada en el servidor.' }, { status: 500 })
    }

    const systemPrompt = `Eres un tutor universitario experto y paciente. No das respuestas directas, guías al estudiante paso a paso para que entienda. Usas analogías simples. Si el estudiante pega un ejercicio, lo ayudas a identificar qué concepto necesita. Sé breve y claro. Responde siempre en español. El estudiante está estudiando: ${materia || 'la materia'}.`

    // Gemini usa "model" en lugar de "assistant"
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      const msg = err.error?.message || `Error ${geminiRes.status} de Gemini.`
      return Response.json({ error: msg }, { status: geminiRes.status })
    }

    // Parsea el stream SSE de Gemini y reenvía solo el texto al cliente
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const reader  = geminiRes.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (!data || data === '[DONE]') continue
              try {
                const json = JSON.parse(data)
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) controller.enqueue(encoder.encode(text))
              } catch { /* chunk incompleto o vacío */ }
            }
          }

          // Procesar buffer restante
          if (buffer.startsWith('data: ')) {
            const data = buffer.slice(6).trim()
            if (data && data !== '[DONE]') {
              try {
                const json = JSON.parse(data)
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) controller.enqueue(encoder.encode(text))
              } catch {}
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('[Tutor API]', err)
    return Response.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 })
  }
}
