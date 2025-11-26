import { Router, Response } from 'express';
import db from '../utils/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// 게시글 목록 조회
router.get('/posts', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const posts = db.prepare(`
      SELECT
        p.id,
        p.title,
        p.content,
        p.created_at,
        p.updated_at,
        u.id as user_id,
        u.name as author_name,
        u.role as author_role,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();

    res.json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: '게시글을 불러오는데 실패했습니다.' });
  }
});

// 게시글 상세 조회
router.get('/posts/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;

    const post = db.prepare(`
      SELECT
        p.id,
        p.title,
        p.content,
        p.created_at,
        p.updated_at,
        u.id as user_id,
        u.name as author_name,
        u.role as author_role
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);

    if (!post) {
      res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
      return;
    }

    const comments = db.prepare(`
      SELECT
        c.id,
        c.content,
        c.created_at,
        u.id as user_id,
        u.name as author_name,
        u.role as author_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(id);

    res.json({ success: true, post, comments });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ success: false, message: '게시글을 불러오는데 실패했습니다.' });
  }
});

// 게시글 작성
router.post('/posts', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { title, content } = req.body;
    const userId = req.user?.id;

    if (!title || !content) {
      res.status(400).json({ success: false, message: '제목과 내용을 입력해주세요.' });
      return;
    }

    const result = db.prepare(`
      INSERT INTO posts (user_id, title, content)
      VALUES (?, ?, ?)
    `).run(userId, title, content);

    const post = db.prepare(`
      SELECT
        p.id,
        p.title,
        p.content,
        p.created_at,
        u.id as user_id,
        u.name as author_name,
        u.role as author_role
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.json({ success: true, message: '게시글이 작성되었습니다.', post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, message: '게시글 작성에 실패했습니다.' });
  }
});

// 게시글 수정
router.put('/posts/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user?.id;

    if (!title || !content) {
      res.status(400).json({ success: false, message: '제목과 내용을 입력해주세요.' });
      return;
    }

    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id) as { user_id: number } | undefined;

    if (!post) {
      res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
      return;
    }

    if (post.user_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: '수정 권한이 없습니다.' });
      return;
    }

    db.prepare(`
      UPDATE posts
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, id);

    res.json({ success: true, message: '게시글이 수정되었습니다.' });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, message: '게시글 수정에 실패했습니다.' });
  }
});

// 게시글 삭제
router.delete('/posts/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id) as { user_id: number } | undefined;

    if (!post) {
      res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
      return;
    }

    if (post.user_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
      return;
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(id);

    res.json({ success: true, message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: '게시글 삭제에 실패했습니다.' });
  }
});

// 댓글 작성
router.post('/posts/:id/comments', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!content) {
      res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
      return;
    }

    const result = db.prepare(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(id, userId, content);

    const comment = db.prepare(`
      SELECT
        c.id,
        c.content,
        c.created_at,
        u.id as user_id,
        u.name as author_name,
        u.role as author_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.json({ success: true, message: '댓글이 작성되었습니다.', comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ success: false, message: '댓글 작성에 실패했습니다.' });
  }
});

// 댓글 삭제
router.delete('/comments/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const comment = db.prepare('SELECT user_id FROM comments WHERE id = ?').get(id) as { user_id: number } | undefined;

    if (!comment) {
      res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
      return;
    }

    if (comment.user_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
      return;
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(id);

    res.json({ success: true, message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: '댓글 삭제에 실패했습니다.' });
  }
});

export default router;
