import { URL } from 'node:url'

export default async function (fastify, opts) {
  fastify.addContentTypeParser('*', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  fastify.all('/:service/*', async function (request, reply) {
    const { service } = request.params
    const recipientURL = process.env[service]

    if (!recipientURL) {
      return reply.code(502).send({
        error: 'Bad Gateway',
        message: 'Cannot process request',
        statusCode: 502
      })
    }

    try {
      const path = request.url.slice(request.url.indexOf(`/${service}/`) + service.length + 2);
      const targetUrl = new URL(`${recipientURL}/${path}`);

      Object.entries(request.query).forEach(([key, value]) => {
        targetUrl.searchParams.append(key, value)
      })

      console.log('targetUrl', targetUrl);

      const fetchOptions = {
        method: request.method,
        headers: { ...request.headers },
        ...(request.method !== 'GET' && request.body ? { body: request.body } : {})
      }

      delete fetchOptions.headers.host

      console.log('fetchOptions', fetchOptions);
      console.log('targetUrl', targetUrl);

      const response = await fetch(targetUrl, fetchOptions)

      reply.code(response.status)

      for (const [key, value] of response.headers.entries()) {
        reply.header(key, value)
      }

      const responseBuffer = await response.arrayBuffer()

      return Buffer.from(responseBuffer)
    } catch (error) {
      fastify.log.error(`Error forwarding request: ${error.message}`)

      return reply.code(502).send({
        error: 'Bad Gateway',
        message: 'Error forwarding request',
        statusCode: 502
      })
    }
  })
}
