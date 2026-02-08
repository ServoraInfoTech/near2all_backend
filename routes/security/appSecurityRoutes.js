var express = require('express');
var router = express.Router();
var appSecurtiyController = require('../../controllers/appSecurityController');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Token generation and authentication APIs
 */

/**
 * @swagger
 * /api/security/tokenGeneration:
 *   post:
 *     summary: Generate access token
 *     description: Generate a temporary access token for authentication
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: device
 *         required: true
 *         schema:
 *           type: string
 *           example: android
 *       - in: header
 *         name: apikey
 *         required: true
 *         schema:
 *           type: string
 *           description: API key for authentication
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Success
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 accesstoken:
 *                   type: string
 *                   description: Temporary access token
 *       403:
 *         description: Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/* GET home page. */
router.post('/tokenGeneration', appSecurtiyController.tokenGeneration);

module.exports = router;
