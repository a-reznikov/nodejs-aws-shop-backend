import { URL } from 'node:url'

export default async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  fastify.all('/:service/*', async function (request, reply) {
    const { service } = request.params;
    const recipientURL = process.env[service];

    if (!recipientURL) {
      return reply.code(502).send({
        error: 'Bad Gateway',
        message: 'Cannot process request',
        statusCode: 502
      })
    }

    const path = request.url.slice(request.url.indexOf(`/${service}/`) + service.length + 2);
    const targetUrl = new URL(`${recipientURL}/${path}`);

    Object.entries(request.query).forEach(([key, value]) => {
      targetUrl.searchParams.append(key, value)
    });

    console.log('request.body', request.body);

    const fetchOptions = {
      method: request.method,
      headers: { ...request.headers },
    };

    delete fetchOptions.headers.host;

    if (request.method !== 'GET' && request.body) {
      fetchOptions.headers['content-type'] = 'application/json';

      const bodyString = typeof request.body === 'object'
        ? JSON.stringify(request.body)
        : request.body;

      fetchOptions.body = bodyString;
      fetchOptions.headers['content-length'] = Buffer.byteLength(bodyString).toString();
    }

    console.log('targetUrl', targetUrl.toString());
    console.log('fetchOptions', JSON.stringify(fetchOptions, null, 2));

    try {
      const response = await fetch(targetUrl, fetchOptions);
      console.log('response status:', response.status);

      return response;
    } catch (error) {
      fastify.log.error(`Error forwarding request: ${error.message}`);
      console.error('Full error details:', error);

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Something went wrong',
        statusCode: 500
      });
    }
  });
}
