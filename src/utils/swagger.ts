import { Express } from 'express';

// Conditionally import swagger modules only in non-production environments
let swaggerJsdoc: any;
let swaggerUi: any;

if (process.env.NODE_ENV !== 'production') {
  try {
    swaggerJsdoc = require('swagger-jsdoc');
    swaggerUi = require('swagger-ui-express');
  } catch (error) {
    console.warn('Swagger dependencies not available. This is expected in production builds without devDependencies.');
  }
}

// Swagger definition
const getSwaggerOptions = () => ({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Twitter API',
      version: '1.0.0',
      description: 'Documentación de la API de Twitter Backend',
      contact: {
        name: 'Equipo Backend'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/domains/*/controller/*.controller.ts',
    './src/utils/swagger-schemas.ts'
  ] // Path to the API docs
});

export const setupSwagger = (app: Express): void => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Swagger documentation disabled in production environment');
    return;
  }

  if (!swaggerJsdoc || !swaggerUi) {
    console.warn('Swagger modules not available. Skipping swagger setup.');
    return;
  }

  try {
    const specs = swaggerJsdoc(getSwaggerOptions());
    
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'API de Twitter - Documentación'
    }));

    console.log('Swagger documentation available at /api-docs');
  } catch (error) {
    console.error('Failed to setup Swagger documentation:', error);
  }
};