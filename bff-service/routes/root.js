export default async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  // Handle dynamic routing based on service name
  fastify.all('/:service', async function (request, reply) {
    const { service } = request.params
    const recipientURL = process.env[service]

    // Check if the service exists in environment variables
    if (!recipientURL) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Service "${service}" not found in configuration`,
        statusCode: 404
      })
    }

    // Log successful routing for debugging
    fastify.log.info(`Routing request to service: ${service}, URL: ${recipientURL}`)

    // For now, just return information about what we'd forward to
    return {
      success: true,
      message: `Will route to "${service}" service`,
      recipientURL,
      method: request.method,
      query: request.query
    }
  })
}
