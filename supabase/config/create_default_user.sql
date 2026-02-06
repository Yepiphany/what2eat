-- 创建默认演示用户
INSERT INTO users (id, username, email)
VALUES ('00000000-0000-0000-0000-000000000000', '演示用户', 'demo@example.com')
ON CONFLICT (id) DO UPDATE SET 
  username = '演示用户',
  email = 'demo@example.com';

SELECT 'Default user created or updated successfully' as status;

-- 验证
SELECT * FROM users WHERE id = '00000000-0000-0000-0000-000000000000';
