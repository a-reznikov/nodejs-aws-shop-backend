import { URL } from 'node:url'

const cache = {
  data: {},
  timestamps: {},

  get(key) {
    const timestamp = this.timestamps[key];

    if (timestamp && Date.now() - timestamp < 120000) {
      console.log(`Cache found for: ${key}`);

      return this.data[key];
    }
    console.log(`Cache not found for: ${key}`);

    return null;
  },

  set(key, value) {
    this.data[key] = value;
    this.timestamps[key] = Date.now();

    console.log(`Cached item: ${key}`);
  }
};

export default async function (fastify, opts) {
  fastify.addHook('onRequest', (request, reply, done) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      reply.code(204).send();
      return;
    }

    done();
  });

  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  fastify.all('/:service/*', async function (request, reply) {
    const { service } = request.params;
    const recipientURL = process.env[service];

    console.log('cache', cache);

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

    const isProductsListRequest =
      service === 'product' &&
      request.method === 'GET' &&
      path === 'products';

    console.log('isProductsListRequest', isProductsListRequest);

    if (isProductsListRequest) {
      const cacheKey = targetUrl.toString();
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        console.log('Return cachedData');

        return cachedData;
      }
    }

    console.log('request.body', request.body);

    const fetchOptions = {
      method: request.method,
      headers: { ...request.headers },
    };

    const headersToRemove = [
      'host', 'connection', 'upgrade-insecure-requests',
      'content-length', 'transfer-encoding', 'keep-alive'
    ];

    headersToRemove.forEach(header => {
      delete fetchOptions.headers[header];
    });

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

      if (isProductsListRequest && response.status === 200) {
        const clonedResponse = response.clone();
        const responseData = await clonedResponse.json();

        cache.set(targetUrl.toString(), responseData);
      }

      return response;
    } catch (error) {
      console.error('Full error details:', error);

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Something went wrong',
        statusCode: 500
      });
    }
  });

  fastify.all('*', async function (request, reply) {
    return reply.code(502).send({
      error: 'Bad Gateway',
      message: 'Invalid service or path',
      statusCode: 502
    });
  });
}
