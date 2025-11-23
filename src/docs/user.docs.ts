/**
 * @swagger
 * /user/profile:
 *   get:
 *     tags: [User]
 *     summary: Get user profile
 *     description: Returns the authenticated user's complete profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 *
 *   patch:
 *     tags: [User]
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *               social_links:
 *                 type: object
 *                 properties:
 *                   twitter:
 *                     type: string
 *                   github:
 *                     type: string
 *                   linkedin:
 *                     type: string
 *                   website:
 *                     type: string
 *                     format: uri
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /user/progress:
 *   get:
 *     tags: [User]
 *     summary: Get user learning progress
 *     description: Returns the user's progress across all enrolled courses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 progress:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       course_id:
 *                         type: string
 *                       progressPercentage:
 *                         type: number
 *                       completedLessons:
 *                         type: number
 *                       totalLessons:
 *                         type: number
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /user/progress/lesson/{lessonId}:
 *   post:
 *     tags: [User]
 *     summary: Mark lesson as completed/incomplete
 *     description: Update the completion status of a specific lesson
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lesson ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completed:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 progress:
 *                   $ref: '#/components/schemas/Progress'
 *                 courseCompleted:
 *                   type: boolean
 *                   description: Whether all lessons in the course are completed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not enrolled in course
 *       404:
 *         description: Lesson not found
 */

/**
 * @swagger
 * /user/teaching:
 *   get:
 *     tags: [User]
 *     summary: Get courses created by user
 *     description: Returns all courses where the user is the instructor
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teaching courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /user/certificates:
 *   get:
 *     tags: [User]
 *     summary: Get user's certificates
 *     description: Returns all certificates earned by the user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Certificates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 certificates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Certificate'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /user/{address}:
 *   get:
 *     tags: [User]
 *     summary: Get public user profile
 *     description: Returns public profile information for any user by wallet address
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^0x[a-fA-F0-9]{40}$
 *         description: Wallet address
 *     responses:
 *       200:
 *         description: Public profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     wallet_address:
 *                       type: string
 *                     display_name:
 *                       type: string
 *                     bio:
 *                       type: string
 *                     avatar_url:
 *                       type: string
 *                     social_links:
 *                       type: object
 *                     created_at:
 *                       type: string
 *                     courses:
 *                       type: array
 *                       description: Published courses by this instructor
 *                       items:
 *                         $ref: '#/components/schemas/Course'
 *       404:
 *         description: User not found
 */

export {};
