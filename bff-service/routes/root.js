export default async function (fastify, opts) {
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

    const path = request.url.slice(request.url.indexOf(`/${service}/`) + service.length + 2)
    const targetPath = `${recipientURL}/${path}`

    fastify.log.info(`Routing request to service: ${service}, URL: ${targetPath}`)

    return {
      success: true,
      message: `Will route to "${service}" service with path`,
      originalUrl: request.url,
      service,
      path,
      recipientURL,
      targetPath,
      method: request.method,
      query: request.query
    }
  })
}
