-- =====================================================
-- 0xAcademy Backend - Development Seed Data
-- =====================================================
-- This file contains sample data for local development
-- Run with: psql <connection-string> -f supabase/seed.sql
-- Or use: pnpm db:seed
-- =====================================================

-- Clear existing data (in correct order due to foreign keys)
TRUNCATE TABLE
  certificates,
  lesson_progress,
  enrollments,
  lessons,
  courses,
  nonces,
  users
CASCADE;

-- =====================================================
-- USERS
-- =====================================================

-- Instructor User
INSERT INTO users (id, wallet_address, display_name, bio, avatar_url, social_links, created_at, last_login_at) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '0x1234567890123456789012345678901234567890',
  'Alice Web3',
  'Blockchain developer and Web3 educator with 5+ years of experience building decentralized applications.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  '{"twitter": "alice_web3", "github": "aliceweb3", "discord": "alice#1234"}',
  NOW() - INTERVAL '90 days',
  NOW() - INTERVAL '1 day'
),
(
  '00000000-0000-0000-0000-000000000002',
  '0x2345678901234567890123456789012345678901',
  'Bob Solidity',
  'Smart contract security expert and Solidity instructor. Former auditor at OpenZeppelin.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  '{"twitter": "bob_solidity", "website": "https://bobsolidity.dev"}',
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '2 hours'
);

-- Student Users
INSERT INTO users (id, wallet_address, display_name, bio, avatar_url, created_at, last_login_at) VALUES
(
  '00000000-0000-0000-0000-000000000003',
  '0x3456789012345678901234567890123456789012',
  'Carol Student',
  'Learning Web3 development to build the future of decentralized internet.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '3 hours'
),
(
  '00000000-0000-0000-0000-000000000004',
  '0x4567890123456789012345678901234567890123',
  'Dave Learner',
  'Frontend developer transitioning to Web3.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Dave',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '1 hour'
),
(
  '00000000-0000-0000-0000-000000000005',
  '0x5678901234567890123456789012345678901234',
  'Eve Crypto',
  'Crypto enthusiast learning smart contract development.',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '30 minutes'
);

-- =====================================================
-- COURSES
-- =====================================================

INSERT INTO courses (id, instructor_id, title, description, price, thumbnail_url, category, level, tags, is_published, is_public, created_at, updated_at) VALUES
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Introduction to Web3 Development',
  'Learn the fundamentals of Web3 development, from blockchain basics to building your first dApp. Perfect for developers transitioning from Web2 to Web3.',
  '0.05',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
  'blockchain',
  'beginner',
  ARRAY['web3', 'blockchain', 'ethereum', 'dapp', 'beginner'],
  true,
  true,
  NOW() - INTERVAL '80 days',
  NOW() - INTERVAL '5 days'
),
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'Smart Contract Security Fundamentals',
  'Master the essential security practices for writing secure smart contracts. Learn common vulnerabilities and how to prevent them.',
  '0.08',
  'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
  'security',
  'intermediate',
  ARRAY['security', 'solidity', 'smart-contracts', 'auditing'],
  true,
  true,
  NOW() - INTERVAL '50 days',
  NOW() - INTERVAL '10 days'
),
(
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Advanced Solidity Patterns',
  'Deep dive into advanced Solidity patterns, gas optimization techniques, and contract architecture best practices.',
  '0.12',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
  'development',
  'advanced',
  ARRAY['solidity', 'advanced', 'patterns', 'optimization'],
  true,
  false,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '2 days'
),
(
  '10000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  'DeFi Protocol Development',
  'Build your own DeFi protocol from scratch. Learn about AMMs, lending protocols, and yield farming.',
  '0.15',
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
  'defi',
  'advanced',
  ARRAY['defi', 'protocols', 'amm', 'lending', 'yield'],
  false,
  false,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day'
);

-- =====================================================
-- LESSONS
-- =====================================================

-- Course 1: Introduction to Web3 Development (7 lessons)
INSERT INTO lessons (id, course_id, title, description, video_url, duration, order_index, is_free, created_at) VALUES
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Welcome to Web3', 'Course introduction and overview of what you will learn.', 'https://example.com/videos/intro-web3-1', 300, 1, true, NOW() - INTERVAL '80 days'),
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Blockchain Fundamentals', 'Understanding blockchain technology, consensus mechanisms, and distributed ledgers.', 'https://example.com/videos/intro-web3-2', 1200, 2, true, NOW() - INTERVAL '80 days'),
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Ethereum Architecture', 'Deep dive into Ethereum''s architecture, accounts, transactions, and the EVM.', 'https://example.com/videos/intro-web3-3', 1800, 3, false, NOW() - INTERVAL '80 days'),
('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Setting Up Your Dev Environment', 'Install and configure tools: MetaMask, Hardhat, and VS Code extensions.', 'https://example.com/videos/intro-web3-4', 900, 4, false, NOW() - INTERVAL '80 days'),
('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Your First Smart Contract', 'Write, compile, and deploy your first Solidity smart contract.', 'https://example.com/videos/intro-web3-5', 2400, 5, false, NOW() - INTERVAL '80 days'),
('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Building a Simple dApp Frontend', 'Connect your smart contract to a React frontend using ethers.js.', 'https://example.com/videos/intro-web3-6', 3000, 6, false, NOW() - INTERVAL '80 days'),
('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'Testing and Deployment', 'Write tests for your smart contracts and deploy to testnet.', 'https://example.com/videos/intro-web3-7', 1800, 7, false, NOW() - INTERVAL '80 days');

-- Course 2: Smart Contract Security (6 lessons)
INSERT INTO lessons (id, course_id, title, description, video_url, duration, order_index, is_free, created_at) VALUES
('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'Security Mindset', 'Introduction to smart contract security and common attack vectors.', 'https://example.com/videos/security-1', 600, 1, true, NOW() - INTERVAL '50 days'),
('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 'Reentrancy Attacks', 'Understanding and preventing reentrancy vulnerabilities.', 'https://example.com/videos/security-2', 1500, 2, false, NOW() - INTERVAL '50 days'),
('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', 'Access Control', 'Implementing proper access control and authorization patterns.', 'https://example.com/videos/security-3', 1200, 3, false, NOW() - INTERVAL '50 days'),
('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'Integer Overflow/Underflow', 'Handling arithmetic operations safely in Solidity.', 'https://example.com/videos/security-4', 900, 4, false, NOW() - INTERVAL '50 days'),
('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', 'Front-running and MEV', 'Understanding MEV and protecting against front-running attacks.', 'https://example.com/videos/security-5', 1800, 5, false, NOW() - INTERVAL '50 days'),
('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', 'Security Audit Process', 'How to conduct security audits and use automated tools.', 'https://example.com/videos/security-6', 2100, 6, false, NOW() - INTERVAL '50 days');

-- Course 3: Advanced Solidity (5 lessons)
INSERT INTO lessons (id, course_id, title, description, video_url, duration, order_index, is_free, created_at) VALUES
('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000003', 'Advanced Data Structures', 'Implementing complex data structures in Solidity.', 'https://example.com/videos/advanced-1', 1800, 1, true, NOW() - INTERVAL '30 days'),
('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000003', 'Gas Optimization Techniques', 'Advanced techniques for minimizing gas costs.', 'https://example.com/videos/advanced-2', 2400, 2, false, NOW() - INTERVAL '30 days'),
('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000003', 'Proxy Patterns', 'Implementing upgradeable smart contracts using proxy patterns.', 'https://example.com/videos/advanced-3', 2700, 3, false, NOW() - INTERVAL '30 days'),
('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000003', 'Assembly and Low-level Calls', 'Using Yul assembly for optimization and advanced operations.', 'https://example.com/videos/advanced-4', 3000, 4, false, NOW() - INTERVAL '30 days'),
('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000003', 'Design Patterns', 'Common design patterns and architectural best practices.', 'https://example.com/videos/advanced-5', 2400, 5, false, NOW() - INTERVAL '30 days');

-- =====================================================
-- ENROLLMENTS
-- =====================================================

-- Carol is enrolled in Course 1 (in progress)
INSERT INTO enrollments (id, user_id, course_id, progress_percentage, enrolled_at, last_accessed_at) VALUES
('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 57, NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 hours');

-- Carol is enrolled in Course 2 (just started)
INSERT INTO enrollments (id, user_id, course_id, progress_percentage, enrolled_at, last_accessed_at) VALUES
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 16, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days');

-- Dave is enrolled in Course 1 (almost done)
INSERT INTO enrollments (id, user_id, course_id, progress_percentage, enrolled_at, last_accessed_at) VALUES
('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 85, NOW() - INTERVAL '18 days', NOW() - INTERVAL '1 hour');

-- Dave completed Course 1
UPDATE enrollments SET
  progress_percentage = 100,
  completed_at = NOW() - INTERVAL '5 days'
WHERE id = '30000000-0000-0000-0000-000000000003';

-- Eve enrolled in Course 3 (20% done)
INSERT INTO enrollments (id, user_id, course_id, progress_percentage, enrolled_at, last_accessed_at) VALUES
('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 20, NOW() - INTERVAL '7 days', NOW() - INTERVAL '30 minutes');

-- =====================================================
-- LESSON PROGRESS
-- =====================================================

-- Carol's progress in Course 1
INSERT INTO lesson_progress (id, enrollment_id, lesson_id, is_completed, last_position, completed_at) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', true, 300, NOW() - INTERVAL '25 days'),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', true, 1200, NOW() - INTERVAL '23 days'),
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', true, 1800, NOW() - INTERVAL '20 days'),
('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', true, 900, NOW() - INTERVAL '15 days'),
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', false, 1200, NULL);

-- Carol's progress in Course 2
INSERT INTO lesson_progress (id, enrollment_id, lesson_id, is_completed, last_position, completed_at) VALUES
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000008', true, 600, NOW() - INTERVAL '10 days');

-- Dave's progress in Course 1 (completed all)
INSERT INTO lesson_progress (id, enrollment_id, lesson_id, is_completed, last_position, completed_at) VALUES
('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', true, 300, NOW() - INTERVAL '18 days'),
('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', true, 1200, NOW() - INTERVAL '17 days'),
('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', true, 1800, NOW() - INTERVAL '15 days'),
('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', true, 900, NOW() - INTERVAL '12 days'),
('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', true, 2400, NOW() - INTERVAL '10 days'),
('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', true, 3000, NOW() - INTERVAL '7 days'),
('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007', true, 1800, NOW() - INTERVAL '5 days');

-- Eve's progress in Course 3
INSERT INTO lesson_progress (id, enrollment_id, lesson_id, is_completed, last_position, completed_at) VALUES
('40000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000014', true, 1800, NOW() - INTERVAL '6 days');

-- =====================================================
-- CERTIFICATES
-- =====================================================

-- Dave completed Course 1 and got certificate
INSERT INTO certificates (id, user_id, course_id, certificate_hash, issued_at) VALUES
(
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000001',
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  NOW() - INTERVAL '5 days'
);

-- =====================================================
-- STATISTICS SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   SEED DATA LOADED SUCCESSFULLY! ';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Users created: 5 (2 instructors, 3 students)';
  RAISE NOTICE 'Courses created: 4';
  RAISE NOTICE 'Lessons created: 18';
  RAISE NOTICE 'Enrollments: 4';
  RAISE NOTICE 'Certificates: 1';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Accounts:';
  RAISE NOTICE '  Instructor: Alice (0x1234...7890)';
  RAISE NOTICE '  Instructor: Bob (0x2345...8901)';
  RAISE NOTICE '  Student: Carol (0x3456...9012) - 2 enrollments';
  RAISE NOTICE '  Student: Dave (0x4567...0123) - 1 completed';
  RAISE NOTICE '  Student: Eve (0x5678...1234) - 1 enrollment';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
