import { URL } from 'node:url'

export default async function (fastify, opts) {
  fastify.addContentTypeParser('*', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

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

    let bodyContent = undefined;
    if (request.method !== 'GET' && request.body && Buffer.isBuffer(request.body)) {
      const bodyString = request.body.toString('utf8');
      try {
        if (request.headers['content-type'] && request.headers['content-type'].includes('application/json')) {
          bodyContent = JSON.parse(bodyString);
        } else {
          bodyContent = bodyString;
        }
      } catch (e) {
        console.error('Failed to parse request body:', e);
        bodyContent = bodyString;
      }
    }

    const fetchOptions = {
      method: request.method,
      headers: { ...request.headers }
    };

    if (request.method !== 'GET' && bodyContent !== undefined) {
      if (typeof bodyContent === 'object') {
        fetchOptions.body = JSON.stringify(bodyContent);
      } else {
        fetchOptions.body = bodyContent;
      }
    }

    delete fetchOptions.headers.host;

    console.log('targetUrl', targetUrl.toString());
    console.log('fetchOptions', JSON.stringify(fetchOptions, null, 2));

    try {
      const response = await fetch(targetUrl, fetchOptions);
      console.log('response status:', response.status);

      reply.code(response.status);

      for (const [key, value] of response.headers.entries()) {
        reply.header(key, value);
      }

      const responseBuffer = await response.arrayBuffer();
      return Buffer.from(responseBuffer);
    } catch (error) {
      fastify.log.error(`Error forwarding request: ${error.message}`);

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Something went wrong',
        statusCode: 500
      });
    }
  });
}
