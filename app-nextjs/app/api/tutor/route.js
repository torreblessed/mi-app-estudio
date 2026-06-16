import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { messages, materia, contexto } = await request.json()

    if (!messages?.length) {
      return Response.json({ error: 'No messages provided' }, { status: 400 })
    }

    const systemPrompt = `Eres un tutor universitario experto en ${materia || 'la materia'}.
Tu rol es ayudar al estudiante a entender conceptos, resolver ejercicios paso a paso y prepararse para evaluaciones.
${contexto ? `\nContexto del estudiante:\n${contexto}` : ''}

Reglas:
- Explica paso a paso, con claridad y paciencia
- Usa ejemplos concretos cuando sea posible
- Si el estudiante tiene una evaluación próxima, adáptate a repasar esos temas
- Responde siempre en español
- Sé conciso pero completo`

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('Tutor API error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
