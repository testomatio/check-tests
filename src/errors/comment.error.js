const Comment = require('../comment');

class CommentError extends Error {
  getComment() {
    const c = new Comment();
    c.body += `\n ⛔ ${this.message}`;
    return c;
  }
}

module.exports = CommentError;
