/**
 * @swagger
 * /courses/enrolled:
 *   get:
 *     tags: [Courses]
 *     summary: Get enrolled courses for authenticated user
 *     description: Returns all courses the authenticated user is enrolled in
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrolled courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enrollments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /courses/{courseId}:
 *   get:
 *     tags: [Courses]
 *     summary: Get course details
 *     description: Returns detailed information about a specific course including lessons
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   $ref: '#/components/schemas/Course'
 *                 hasFullAccess:
 *                   type: boolean
 *                   description: Whether user has access to all lessons
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /courses:
 *   post:
 *     tags: [Courses]
 *     summary: Create a new course
 *     description: Create a new course (instructor only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 example: "Introduction to Blockchain"
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 example: "Learn the fundamentals of blockchain technology"
 *               price_usd:
 *                 type: number
 *                 minimum: 0
 *                 example: 49.99
 *               thumbnail_url:
 *                 type: string
 *                 format: uri
 *               category:
 *                 type: string
 *                 example: "Blockchain"
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   $ref: '#/components/schemas/Course'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /courses/{courseId}/enroll:
 *   post:
 *     tags: [Courses]
 *     summary: Enroll in a course
 *     description: Enroll the authenticated user in a specific course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Course ID to enroll in
 *     responses:
 *       201:
 *         description: Successfully enrolled in course
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enrollment:
 *                   $ref: '#/components/schemas/Enrollment'
 *       400:
 *         description: Already enrolled or course requires payment
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Course not found or not published
 */

/**
 * @swagger
 * /courses/{courseId}/lessons:
 *   get:
 *     tags: [Courses]
 *     summary: Get course lessons
 *     description: Returns all lessons for a course (requires enrollment or ownership)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Lessons retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lessons:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lesson'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not enrolled in course
 */

/**
 * @swagger
 * /courses/{courseId}/lessons:
 *   post:
 *     tags: [Courses]
 *     summary: Create a new lesson
 *     description: Add a new lesson to a course (course owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - order
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *               video_url:
 *                 type: string
 *                 format: uri
 *               content:
 *                 type: string
 *               order:
 *                 type: integer
 *                 minimum: 0
 *               duration_minutes:
 *                 type: integer
 *                 minimum: 0
 *               is_free:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lesson:
 *                   $ref: '#/components/schemas/Lesson'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the course owner
 */

export {};
