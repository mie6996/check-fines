import { checkFines } from '../../lib/check-fines.js';

export default async function (app, opts) {
  app.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            plate: { type: 'string' },
            vehicleType: { type: 'string' }
          },
          required: ['plate'],
        }
      }
    },
    async (request, reply) => {
      const { plate, vehicleType } = request.query;
      const response = await checkFines(plate, vehicleType);
      return response;
    }
  )
}