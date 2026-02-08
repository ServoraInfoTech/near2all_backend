const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Near2All API',
      version: '1.0.0',
      description: 'Near2All - Location-based marketplace platform API documentation. Connect users with local vendors based on their location.',
      contact: {
        name: 'Near2All Support',
        email: 'support@near2all.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://near2all-backend.onrender.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['firstName', 'lastName', 'mobileNumber', 'password'],
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            mobileNumber: { type: 'string', example: '9876543210' },
            emailId: { type: 'string', example: 'john@example.com' },
            password: { type: 'string', example: 'password123', format: 'password' },
            address: { type: 'string', example: '123 Main St' },
            city: { type: 'string', example: 'San Francisco' },
            state: { type: 'string', example: 'California' },
            pincode: { type: 'string', example: '94102' },
            profilePic: { type: 'string', example: 'https://example.com/profile.jpg' }
          }
        },
        Vendor: {
          type: 'object',
          required: ['firstName', 'lastName', 'mobileNumber', 'password', 'category'],
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Store' },
            mobileNumber: { type: 'string', example: '9876543210' },
            emailId: { type: 'string', example: 'store@example.com' },
            password: { type: 'string', example: 'password123', format: 'password' },
            category: { type: 'string', example: 'Electronics' },
            subCategory: { type: 'string', example: 'Retail' },
            address1: { type: 'string', example: '123 Tech Blvd' },
            area: { type: 'string', example: 'Silicon Valley' },
            city: { type: 'string', example: 'San Francisco' },
            state: { type: 'string', example: 'California' },
            pincode: { type: 'string', example: '94102' },
            latitude: { type: 'string', example: '37.7749' },
            longitude: { type: 'string', example: '-122.4194' },
            webSite: { type: 'string', example: 'https://www.example.com' }
          }
        },
        AdminRegister: {
          type: 'object',
          required: ['firstName', 'lastName', 'mobileNumber', 'emailId', 'password', 'adminCode'],
          properties: {
            firstName: { type: 'string', example: 'Super' },
            lastName: { type: 'string', example: 'Admin' },
            mobileNumber: { type: 'string', example: '9876543210' },
            emailId: { type: 'string', example: 'admin@near2all.com' },
            password: { type: 'string', example: 'admin123', format: 'password' },
            adminCode: { type: 'string', example: 'NEAR2ALL-ADMIN-2024', description: 'Admin registration code' }
          }
        },
        Item: {
          type: 'object',
          required: ['itemName', 'category'],
          properties: {
            itemName: { type: 'string', example: 'Product Name' },
            category: { type: 'string', example: 'Electronics' },
            itemDescription: { type: 'string', example: 'Product description' },
            mainImage: { type: 'string', example: 'https://example.com/image.jpg' },
            otherImages: { type: 'array', items: { type: 'string' } },
            itemSizes: { type: 'string', example: 'M,L,XL' }
          }
        },
        ModerationAction: {
          type: 'object',
          required: ['action'],
          properties: {
            action: {
              type: 'string',
              enum: ['approved', 'rejected', 'flagged', 'hidden'],
              example: 'approved'
            },
            reason: { type: 'string', example: 'Verified vendor information' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'Fail' },
            statusCode: { type: 'number', example: 403 },
            msg: { type: 'string', example: 'Access denied' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'Success' },
            statusCode: { type: 'number', example: 200 },
            msg: { type: 'string', example: 'Operation successful' }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authorization token using the Bearer scheme. Example: "Bearer {token}"'
        },
        accessToken: {
          type: 'apiKey',
          in: 'header',
          name: 'accesstoken',
          description: 'Access token for authentication. Also requires "device" header.'
        }
      }
    },
    security: []
  },
  apis: ['./routes/**/*.js', './controllers/**/*.js']
};

module.exports = swaggerJsdoc(options);
